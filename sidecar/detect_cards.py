"""Stage 1: Detect tribesman card boundaries in a screenshot.

The game renders cards in a 2-column grid with thin border lines.
We detect the grid by finding long horizontal separator lines
(morphological line detection) and the vertical column gap.
"""
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
# Tuned against 889×140 card crops from 2000×1121 fixture.
LAYOUT = {
    "name":       {"x": 0.03, "y": 0.08, "w": 0.22, "h": 0.25},
    "level_line": {"x": 0.01, "y": 0.34, "w": 0.50, "h": 0.20},
    "trait_row":  {"x": 0.01, "y": 0.55, "w": 0.52, "h": 0.43},
    "status":     {"x": 0.78, "y": 0.43, "w": 0.19, "h": 0.15},
    "group":      {"x": 0.58, "y": 0.72, "w": 0.24, "h": 0.20},
}


def detect_cards(img: np.ndarray) -> list[Card]:
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    separator_ys = _find_horizontal_separators(gray, w, h)
    if len(separator_ys) < 2:
        return []

    col_gap_x = _find_column_gap(gray, separator_ys, w)

    cards = _build_grid(separator_ys, col_gap_x, w, h)

    # Real cards have consistent height; filter out short UI chrome regions
    if cards:
        heights = sorted([c.h for c in cards], reverse=True)
        median_h = heights[len(heights) // 2]
        min_h = int(median_h * 0.7)
        cards = [c for c in cards if c.h >= min_h]
    cards = [c for c in cards if c.w > 100 and c.h > 50]
    cards.sort(key=lambda c: (c.y, c.x))
    return cards


def _find_horizontal_separators(gray: np.ndarray, w: int, h: int) -> list[int]:
    binary = cv2.adaptiveThreshold(
        gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY, 15, -3,
    )
    horiz_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(w // 5, 100), 1))
    horiz_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horiz_kernel)

    row_sums = np.sum(horiz_lines, axis=1) / 255
    min_extent = w * 0.60

    strong_rows = np.where(row_sums > min_extent)[0]
    lines: list[int] = []
    last = -100
    for r in strong_rows:
        if r - last > 8:
            lines.append(int(r))
        last = r

    if len(lines) < 2:
        return lines

    # Real card-row boundaries are double-lines (bottom of card N + top of
    # card N+1, ~20-30px apart).  Internal card lines are singles.
    # Identify double-line pairs and use their midpoints as separators.
    pairs: list[tuple[int, int]] = []
    used: set[int] = set()
    for i in range(len(lines) - 1):
        if i in used:
            continue
        if lines[i + 1] - lines[i] <= 35:
            pairs.append((lines[i], lines[i + 1]))
            used.add(i)
            used.add(i + 1)

    if len(pairs) < 3:
        return _filter_by_gap(lines, h)

    midpoints = [(a + b) // 2 for a, b in pairs]

    gaps = [midpoints[i + 1] - midpoints[i] for i in range(len(midpoints) - 1)]
    card_h = int(np.median(gaps))

    first_top = max(0, midpoints[0] - card_h)
    last_bottom = min(h, midpoints[-1] + card_h)

    return [first_top] + midpoints + [last_bottom]


def _filter_by_gap(lines: list[int], h: int) -> list[int]:
    """Fallback separator filter for low-res images without double-lines."""
    merged: list[int] = []
    i = 0
    while i < len(lines):
        if i + 1 < len(lines) and lines[i + 1] - lines[i] < 20:
            merged.append((lines[i] + lines[i + 1]) // 2)
            i += 2
        else:
            merged.append(lines[i])
            i += 1

    if len(merged) < 3:
        return merged

    gaps = [merged[i + 1] - merged[i] for i in range(len(merged) - 1)]
    gaps_sorted = sorted(gaps, reverse=True)
    dominant_h = int(np.median(gaps_sorted[: max(len(gaps_sorted) // 2, 2)]))
    min_card_h = int(dominant_h * 0.65)

    filtered = [merged[-1]]
    for y in reversed(merged[:-1]):
        if filtered[-1] - y >= min_card_h:
            filtered.append(y)
    filtered.reverse()

    if len(filtered) >= 3:
        g1 = filtered[1] - filtered[0]
        g2 = filtered[2] - filtered[1]
        combined = filtered[2] - filtered[0]
        if g1 < dominant_h * 0.85 and g2 < dominant_h * 0.85 and combined >= min_card_h:
            filtered = [filtered[0]] + filtered[2:]
        elif g1 < dominant_h * 0.85:
            filtered = filtered[1:]

    return filtered


def _find_column_gap(gray: np.ndarray, sep_ys: list[int], w: int) -> int:
    if len(sep_ys) < 2:
        return w // 2

    y_start = sep_ys[0]
    y_end = sep_ys[-1]
    search_start = int(w * 0.25)
    search_end = int(w * 0.75)

    strip = gray[y_start:y_end, search_start:search_end]
    col_brightness = np.mean(strip, axis=0)

    # Smooth to avoid noise
    kernel_size = max(w // 100, 5)
    if kernel_size % 2 == 0:
        kernel_size += 1
    smoothed = cv2.GaussianBlur(col_brightness.reshape(1, -1), (kernel_size, 1), 0).flatten()

    # The gap between columns is brighter (game world shows through)
    gap_x = int(np.argmax(smoothed)) + search_start
    return gap_x


def _build_grid(sep_ys: list[int], gap_x: int, w: int, h: int) -> list[Card]:
    cards = []
    # Inset from edges: cards don't go all the way to image borders
    left_margin = int(w * 0.04)
    right_margin = int(w * 0.04)
    col_padding = int(w * 0.01)

    col_ranges = [
        (left_margin, gap_x - col_padding),
        (gap_x + col_padding, w - right_margin),
    ]

    for i in range(len(sep_ys) - 1):
        y_top = sep_ys[i]
        y_bot = sep_ys[i + 1]
        card_h = y_bot - y_top
        if card_h < 30:
            continue
        for col_left, col_right in col_ranges:
            col_w = col_right - col_left
            if col_w < 100:
                continue
            cards.append(Card(x=col_left, y=y_top, w=col_w, h=card_h))

    return cards


def crop_region(card_img: np.ndarray, region_key: str) -> np.ndarray:
    r = LAYOUT[region_key]
    h, w = card_img.shape[:2]
    x1 = int(r["x"] * w)
    y1 = int(r["y"] * h)
    x2 = int((r["x"] + r["w"]) * w)
    y2 = int((r["y"] + r["h"]) * h)
    return card_img[y1:y2, x1:x2]
