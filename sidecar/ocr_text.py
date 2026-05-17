"""Stage 2: OCR text extraction from cropped card regions."""
import re
import cv2
import numpy as np
import pytesseract
from dataclasses import dataclass


@dataclass
class CardText:
    name: str
    level: int | None
    class_name: str | None
    clan: str | None
    title: str | None
    status: str | None
    group: str | None


def preprocess_for_ocr(img: np.ndarray, threshold: int = 70, use_red: bool = False) -> np.ndarray:
    """Upscale and binarize game UI text (light text on dark background)."""
    if use_red and len(img.shape) == 3:
        # Golden/orange game text has high R channel even though grayscale is dim
        gray = img[:, :, 2]  # BGR → R channel
    else:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    h, w = gray.shape
    if w < 600:
        scale = 600 / w
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    return binary


def ocr_region(img: np.ndarray, psm: int = 7, threshold: int = 70, use_red: bool = False) -> str:
    processed = preprocess_for_ocr(img, threshold=threshold, use_red=use_red)
    config = f"--psm {psm} --oem 3"
    text = pytesseract.image_to_string(processed, config=config)
    return text.strip()


def parse_name(text: str) -> str:
    text = re.sub(r'^[◆◇♦<>\[\]©®°•·&@#%\d\s]+', '', text)
    # Strip single leading char artifact (icon remnants like "x", "&")
    text = re.sub(r'^[a-z&@#]\s+', '', text)
    # Strip trailing equipment text (contains digits: "Armor Alch 120", "124 Bow")
    text = re.sub(r'\s+[A-Za-z]*\s*\d+\s*[A-Za-z]*\s*$', '', text)
    text = re.sub(r'\s+[^\w\s].*$', '', text)
    text = re.sub(r'\s+[&@#<>\[\]©®°•·\-_|:;,.!?\d]+$', '', text)
    text = re.sub(r'\s+\S{1,2}$', '', text)
    return text.strip()


def parse_level_line(text: str) -> dict:
    result: dict = {"level": None, "class_name": None, "clan": None, "title": None}

    # Extract clan from angle brackets: <Flint Tribe>
    clan_match = re.search(r'[<＜]([^>＞]+)[>＞]', text)
    if clan_match:
        clan_raw = clan_match.group(1).strip()
        # Strip "Tribe"/"ribe"/"lribe" suffix (OCR mangles capitalization and spacing)
        clan_raw = re.sub(r"[\s''‘’]*[TtlI]?ribe\s*$", "", clan_raw).strip()
        clan_raw = re.sub(r"['''‘’]", "", clan_raw).strip()
        # Strip trailing single-char artifacts
        clan_raw = re.sub(r'\s+\S$', '', clan_raw).strip()
        CLAN_MAP = {
            "iint": "Flint", "ilint": "Flint", "flint": "Flint", "mint": "Flint",
            "lint": "Flint", "i lint": "Flint", "fint": "Flint", "fi": "Flint",
            "i": "Flint", "ilint i": "Flint", "flint f": "Flint", "oulcasl": "Outcast",
            "flinlt": "Flint", "llint": "Flint", "ulint": "Flint",
            "lang": "Long", "long": "Long", "iane": "Long", "iang": "Long",
        }
        result["clan"] = CLAN_MAP.get(clan_raw.lower(), clan_raw)
        text = text[:clan_match.start()] + text[clan_match.end():]

    # Extract level: LV.32  (OCR misreads L→1/I, or drops it entirely)
    level_match = re.search(r'(?:[1lIL])?[Vv]\.?\s*(\d+)', text)
    if level_match:
        result["level"] = int(level_match.group(1))
        text = text[:level_match.start()] + text[level_match.end():]

    # Remaining text after level is the class, possibly with title appended
    class_name = text.strip().strip(".,;: ")
    # Strip leading OCR artifacts (|, digits, punctuation from icon remnants)
    class_name = re.sub(r'^[\d|!\[\](){}<>"\'\s.,;:*#@&%^~`/\\]+', '', class_name).strip()
    # Remove isolated single-char artifacts at start
    class_name = re.sub(r'^\S\s{2,}', '', class_name).strip()
    # Some cards have "Skilled Craftsman  Famous Trash" — title after double space
    parts = re.split(r'\s{2,}', class_name)
    parts = [p.strip() for p in parts if len(p.strip()) > 1]
    if parts:
        result["class_name"] = _normalize_class(parts[0])
        if len(parts) > 1:
            result["title"] = parts[-1]

    return result


KNOWN_CLASSES = [
    "Skilled Craftsman", "Novice Craftsman", "Skilled Warrior", "Novice Warrior",
    "Skilled Guard", "Skilled Hunter", "Novice Hunter",
]


def _normalize_class(raw: str) -> str:
    r = raw.lower()
    for klass in KNOWN_CLASSES:
        k = klass.lower()
        # Check if raw is close enough (shares most characters)
        words = k.split()
        if len(words) == 2 and all(_fuzzy_word(w, r) for w in words):
            return klass
    return raw


def _fuzzy_word(word: str, text: str) -> bool:
    """Check if word appears approximately in text (3+ char substring match)."""
    if word in text:
        return True
    for i in range(len(word) - 2):
        if word[i:i+3] in text:
            return True
    return False


KNOWN_STATUSES = [
    "Idle", "Hosting", "Working", "Training in Progress",
    "Work Break", "Resting", "Mining", "Farming",
]


def _is_known_status(s: str | None) -> bool:
    return s is not None and s in KNOWN_STATUSES


def parse_status(text: str) -> str | None:
    text = text.strip()
    for s in KNOWN_STATUSES:
        if s.lower() in text.lower():
            return s
    # Fuzzy: handle common OCR errors (W→W, B→R, etc.)
    t = re.sub(r'[^a-zA-Z\s]', '', text).lower().strip()
    if not t:
        return None
    if "dle" in t or "idl" in t:
        return "Idle"
    if re.search(r'w\w{0,3}k\s*\w{0,2}eak', t) or ("ork" in t and "eak" in t):
        return "Work Break"
    if re.search(r'rain\w*\s+in\s+\w*ro', t) or "raining" in t:
        return "Training in Progress"
    if "inin" in t or "minin" in t:
        return "Mining"
    if "armin" in t:
        return "Farming"
    if "estin" in t:
        return "Resting"
    if "orkin" in t:
        return "Working"
    if "ostin" in t:
        return "Hosting"
    return None


def parse_group(text: str) -> str | None:
    text = text.strip()
    if not text or text == "(Ungrouped)":
        return None
    # Strip dropdown arrow and trailing OCR artifacts
    text = re.sub(r"[\s▼▾↓vy~¥_|:;,.!?\d*#@&'‘’“”]+$", "", text).strip()
    # Strip leading pipe/bracket artifacts
    text = re.sub(r"^[|\[\]\s]+", "", text).strip()
    if text.upper() == text and len(text) > 3 and not any(c.islower() for c in text):
        return None
    return text if text else None


def extract_card_text(card_img: np.ndarray) -> CardText:
    from detect_cards import crop_region

    # Name: white text, needs higher threshold to avoid dark bg noise
    name_img = crop_region(card_img, "name")
    name = parse_name(ocr_region(name_img, psm=7, threshold=110))

    # Level/class/clan: purple-ish text, dimmer — lower threshold
    level_img = crop_region(card_img, "level_line")
    level_data = parse_level_line(ocr_region(level_img, psm=7, threshold=65))

    status_img = crop_region(card_img, "status")
    # Status text can be white (Idle) or golden (Work Break). Try both channels.
    s1 = parse_status(ocr_region(status_img, psm=7, threshold=170, use_red=True))
    s2 = parse_status(ocr_region(status_img, psm=7, threshold=160))
    status = s1 if _is_known_status(s1) else (s2 if _is_known_status(s2) else (s1 or s2))

    group_img = crop_region(card_img, "group")
    group = parse_group(ocr_region(group_img, psm=7, threshold=90))

    return CardText(
        name=name,
        level=level_data["level"],
        class_name=level_data["class_name"],
        clan=level_data["clan"],
        title=level_data["title"],
        status=status,
        group=group,
    )
