"""Stage 1: Detect tribesman card boundaries in a screenshot."""
import cv2
import numpy as np
from dataclasses import dataclass


@dataclass
class Card:
    x: int
    y: int
    w: int
    h: int

    def crop(self, img: np.ndarray) -> np.ndarray:
        return img[self.y:self.y + self.h, self.x:self.x + self.w]


# Relative offsets within a card (fractions of card w/h).
# These are estimates — tune against real game screenshots.
LAYOUT = {
    "name":       {"x": 0.03, "y": 0.02, "w": 0.55, "h": 0.22},
    "level_line": {"x": 0.03, "y": 0.22, "w": 0.70, "h": 0.18},
    "title":      {"x": 0.03, "y": 0.40, "w": 0.55, "h": 0.15},
    "trait_row":  {"x": 0.02, "y": 0.58, "w": 0.70, "h": 0.38},
    "status":     {"x": 0.60, "y": 0.75, "w": 0.38, "h": 0.22},
}

MIN_CARD_W = 150
MIN_CARD_H = 80
MIN_ASPECT = 1.2
MAX_ASPECT = 2.5


def detect_cards(img: np.ndarray) -> list[Card]:
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    edges = cv2.Canny(gray, 30, 100)

    # Light dilation to close small gaps, but not so much that cards merge
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
    edges = cv2.dilate(edges, kernel, iterations=1)

    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)

    cards = []
    img_area = img.shape[0] * img.shape[1]
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w < MIN_CARD_W or h < MIN_CARD_H:
            continue
        aspect = w / h
        if aspect < MIN_ASPECT or aspect > MAX_ASPECT:
            continue
        # Skip contours that span most of the image (background)
        if w * h > img_area * 0.6:
            continue
        cards.append(Card(x=x, y=y, w=w, h=h))

    cards = _remove_overlaps(cards)

    if cards:
        avg_h = sum(c.h for c in cards) / len(cards)
        row_tol = avg_h * 0.3
        cards.sort(key=lambda c: (round(c.y / row_tol), c.x))

    return cards


def _remove_overlaps(cards: list[Card]) -> list[Card]:
    if not cards:
        return cards
    cards.sort(key=lambda c: c.w * c.h, reverse=True)
    kept = []
    for card in cards:
        overlaps = False
        for k in kept:
            if _iou(card, k) > 0.3:
                overlaps = True
                break
        if not overlaps:
            kept.append(card)
    return kept


def _iou(a: Card, b: Card) -> float:
    x1 = max(a.x, b.x)
    y1 = max(a.y, b.y)
    x2 = min(a.x + a.w, b.x + b.w)
    y2 = min(a.y + a.h, b.y + b.h)
    if x2 <= x1 or y2 <= y1:
        return 0.0
    inter = (x2 - x1) * (y2 - y1)
    union = a.w * a.h + b.w * b.h - inter
    return inter / union if union > 0 else 0.0


def crop_region(card_img: np.ndarray, region_key: str) -> np.ndarray:
    r = LAYOUT[region_key]
    h, w = card_img.shape[:2]
    x1 = int(r["x"] * w)
    y1 = int(r["y"] * h)
    x2 = int((r["x"] + r["w"]) * w)
    y2 = int((r["y"] + r["h"]) * h)
    return card_img[y1:y2, x1:x2]
