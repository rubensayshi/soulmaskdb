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


def preprocess_for_ocr(img: np.ndarray, threshold: int = 70) -> np.ndarray:
    """Upscale and binarize game UI text (light text on dark background)."""
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    h, w = gray.shape
    # Upscale to at least 600px wide for Tesseract
    if w < 600:
        scale = 600 / w
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    # Text is bright on dark game overlay; use a low fixed threshold
    _, binary = cv2.threshold(gray, threshold, 255, cv2.THRESH_BINARY)
    # Remove small noise (icon artifacts, specks)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    binary = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)
    return binary


def ocr_region(img: np.ndarray, psm: int = 7, threshold: int = 70) -> str:
    processed = preprocess_for_ocr(img, threshold=threshold)
    config = f"--psm {psm} --oem 3"
    text = pytesseract.image_to_string(processed, config=config)
    return text.strip()


def parse_name(text: str) -> str:
    # Strip leading diamond/icon artifacts and trailing noise
    text = re.sub(r'^[◆◇♦<>\[\]©®°•·\s]+', '', text)
    # Remove trailing equipment text after the name (e.g., "Armor Alch 120")
    # Names don't contain numbers typically, but equipment refs do
    return text.strip()


def parse_level_line(text: str) -> dict:
    result: dict = {"level": None, "class_name": None, "clan": None, "title": None}

    # Extract clan from angle brackets: <Flint Tribe>
    clan_match = re.search(r'[<＜]([^>＞]+)[>＞]', text)
    if clan_match:
        clan_raw = clan_match.group(1).strip()
        # Normalize: "Flint Tribe" -> "Flint"
        result["clan"] = clan_raw.replace(" Tribe", "")
        text = text[:clan_match.start()] + text[clan_match.end():]

    # Extract level: LV.32
    level_match = re.search(r'[Ll][Vv]\.?\s*(\d+)', text)
    if level_match:
        result["level"] = int(level_match.group(1))
        text = text[:level_match.start()] + text[level_match.end():]

    # Remaining text after level is the class, possibly with title appended
    class_name = text.strip().strip(".,;: ")
    # Some cards have "Skilled Craftsman  Famous Trash" — title after double space
    parts = re.split(r'\s{2,}', class_name)
    if parts:
        result["class_name"] = parts[0].strip()
        if len(parts) > 1:
            result["title"] = parts[-1].strip()

    return result


def parse_status(text: str) -> str | None:
    text = text.strip()
    known = ["Idle", "Hosting", "Working", "Training in Progress",
             "Work Break", "Resting", "Mining", "Farming"]
    for s in known:
        if s.lower() in text.lower():
            return s
    return text if text else None


def parse_group(text: str) -> str | None:
    text = text.strip()
    if not text or text == "(Ungrouped)":
        return None
    # Strip dropdown arrow artifacts
    text = re.sub(r'[▼▾↓vy]+$', '', text).strip()
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
    status = parse_status(ocr_region(status_img, psm=7, threshold=90))

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
