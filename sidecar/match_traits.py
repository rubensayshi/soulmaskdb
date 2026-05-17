"""Stage 3-4: Extract trait icons from card row and match against reference atlas."""
import os
import cv2
import numpy as np
from dataclasses import dataclass


@dataclass
class TraitMatch:
    icon_name: str
    confidence: float
    bbox: tuple[int, int, int, int]  # x, y, w, h within the icon row


CONFIDENCE_THRESHOLD = 0.65


def load_atlas(atlas_dir: str, size: int | None = None) -> dict[str, np.ndarray]:
    atlas = {}
    for fname in os.listdir(atlas_dir):
        if not fname.endswith(".png"):
            continue
        name = os.path.splitext(fname)[0]
        img = cv2.imread(os.path.join(atlas_dir, fname), cv2.IMREAD_COLOR)
        if img is None:
            continue
        if size and (img.shape[0] != size or img.shape[1] != size):
            img = cv2.resize(img, (size, size))
        atlas[name] = img
    return atlas


def segment_icons(trait_row: np.ndarray, expected_size: int = 32) -> list[tuple[np.ndarray, int, int]]:
    """Segment individual icons from the trait icon row.
    Returns list of (icon_image, x_offset, y_offset)."""
    gray = cv2.cvtColor(trait_row, cv2.COLOR_BGR2GRAY) if len(trait_row.shape) == 3 else trait_row
    _, binary = cv2.threshold(gray, 25, 255, cv2.THRESH_BINARY)

    contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    icons = []
    min_size = expected_size * 0.5
    max_size = expected_size * 2.5

    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        if w < min_size or h < min_size or w > max_size or h > max_size:
            continue
        aspect = max(w, h) / min(w, h) if min(w, h) > 0 else 99
        if aspect > 1.8:
            continue
        side = max(w, h)
        cx, cy = x + w // 2, y + h // 2
        x1 = max(0, cx - side // 2)
        y1 = max(0, cy - side // 2)
        x2 = min(trait_row.shape[1], x1 + side)
        y2 = min(trait_row.shape[0], y1 + side)
        icon_crop = trait_row[y1:y2, x1:x2]
        if icon_crop.size == 0:
            continue
        icons.append((icon_crop, x1, y1))

    icons.sort(key=lambda t: t[1])
    return icons


def match_icon(icon_img: np.ndarray, atlas: dict[str, np.ndarray]) -> TraitMatch:
    """Match a single icon against the atlas. Returns best match."""
    best_name = ""
    best_score = -1.0

    target_size = next(iter(atlas.values())).shape[0]
    if icon_img.shape[0] != target_size or icon_img.shape[1] != target_size:
        icon_img = cv2.resize(icon_img, (target_size, target_size))

    for name, ref in atlas.items():
        result = cv2.matchTemplate(icon_img, ref, cv2.TM_CCOEFF_NORMED)
        score = float(result[0][0])
        if score > best_score:
            best_score = score
            best_name = name

    return TraitMatch(icon_name=best_name, confidence=best_score, bbox=(0, 0, 0, 0))


def match_trait_row(trait_row: np.ndarray, atlas: dict[str, np.ndarray],
                    expected_icon_size: int = 32) -> list[TraitMatch]:
    """Extract and match all icons in a trait row image."""
    icons = segment_icons(trait_row, expected_size=expected_icon_size)

    matches = []
    for icon_img, x, y in icons:
        m = match_icon(icon_img, atlas)
        m.bbox = (x, y, icon_img.shape[1], icon_img.shape[0])
        if m.confidence >= CONFIDENCE_THRESHOLD:
            matches.append(m)

    return matches
