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
    location: str | None


def preprocess_for_ocr(img: np.ndarray) -> np.ndarray:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img
    h, w = gray.shape
    if w < 200:
        scale = 200 / w
        gray = cv2.resize(gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    if np.mean(binary) > 127:
        binary = cv2.bitwise_not(binary)
    return binary


def ocr_region(img: np.ndarray, psm: int = 7) -> str:
    processed = preprocess_for_ocr(img)
    config = f"--psm {psm} --oem 3"
    text = pytesseract.image_to_string(processed, config=config)
    return text.strip()


def parse_name(text: str) -> str:
    return text.strip()


def parse_level_line(text: str) -> dict:
    result = {"level": None, "class_name": None, "clan": None}

    clan_match = re.search(r'[<＜]([^>＞]+)[>＞]', text)
    if clan_match:
        result["clan"] = clan_match.group(1).strip()
        text = text[:clan_match.start()] + text[clan_match.end():]

    level_match = re.search(r'[Ll][Vv]\.?\s*(\d+)', text)
    if level_match:
        result["level"] = int(level_match.group(1))
        text = text[:level_match.start()] + text[level_match.end():]

    class_name = text.strip().strip(".")
    if class_name:
        result["class_name"] = class_name

    return result


def extract_card_text(card_img: np.ndarray) -> CardText:
    from detect_cards import crop_region

    name_img = crop_region(card_img, "name")
    name = parse_name(ocr_region(name_img, psm=7))

    level_img = crop_region(card_img, "level_line")
    level_data = parse_level_line(ocr_region(level_img, psm=7))

    title_img = crop_region(card_img, "title")
    title_raw = ocr_region(title_img, psm=7)
    title = title_raw if title_raw else None

    return CardText(
        name=name,
        level=level_data["level"],
        class_name=level_data["class_name"],
        clan=level_data["clan"],
        title=title,
        location=None,
    )
