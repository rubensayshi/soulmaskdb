"""Stage 4: Merge tribesman records across multiple screenshots.

When the same tribesman appears in multiple screenshots, OCR quality
varies due to game-world artifacts bleeding through the semi-transparent
UI. This module matches tribesmen across images by name similarity and
picks the best value for each field.
"""
from __future__ import annotations
from ocr_text import KNOWN_CLASSES, KNOWN_STATUSES


def _name_parts(name: str) -> tuple[str, str]:
    """Split name into (base_key, numeral_suffix) for matching."""
    import re
    k = name.strip()
    m = re.search(r'\s+(I{1,3}|IV|VI{0,3}|VII?)$', k)
    suffix = m.group(1) if m else ""
    base = k[:m.start()].strip() if m else k
    base = re.sub(r'[^a-zA-Z\s]', '', base).lower().strip()
    base = re.sub(r'\s+', ' ', base)
    return base, suffix


def _name_distance(a: str, b: str) -> float:
    """Normalized edit distance (0 = identical, 1 = completely different)."""
    if a == b:
        return 0.0
    la, lb = len(a), len(b)
    if la == 0 or lb == 0:
        return 1.0
    d = [[0] * (lb + 1) for _ in range(la + 1)]
    for i in range(la + 1):
        d[i][0] = i
    for j in range(lb + 1):
        d[0][j] = j
    for i in range(1, la + 1):
        for j in range(1, lb + 1):
            cost = 0 if a[i - 1] == b[j - 1] else 1
            d[i][j] = min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost)
    return d[la][lb] / max(la, lb)


def _score_tribesman(t: dict) -> float:
    """Score a single tribesman record by OCR quality signals. Higher = better."""
    s = 0.0
    name = t.get("name") or ""
    if name and not name.startswith("[Card"):
        s += 2.0
        if len(name) > 3:
            s += 1.0
    if t.get("level") is not None:
        s += 2.0
    cls = t.get("class") or ""
    if cls in KNOWN_CLASSES:
        s += 3.0
    elif cls:
        s += 1.0
    if t.get("clan"):
        s += 1.0
    status = t.get("status") or ""
    if status in KNOWN_STATUSES:
        s += 2.0
    if t.get("group"):
        s += 1.0
    if t.get("title"):
        s += 0.5
    return s


def _pick_best_field(candidates: list[dict], field: str) -> object:
    """Pick the best value for a field across candidate records."""
    values = [(c.get(field), _score_tribesman(c)) for c in candidates]
    values = [(v, s) for v, s in values if v is not None and v != ""]
    if not values:
        return candidates[0].get(field)

    if field == "name":
        named = [(v, s) for v, s in values if not v.startswith("[Card") and len(v) > 2]
        if named:
            return max(named, key=lambda x: (x[1], len(x[0])))[0]
    elif field == "class":
        known = [(v, s) for v, s in values if v in KNOWN_CLASSES]
        if known:
            return max(known, key=lambda x: x[1])[0]
    elif field == "status":
        known = [(v, s) for v, s in values if v in KNOWN_STATUSES]
        if known:
            return max(known, key=lambda x: x[1])[0]
    elif field == "level":
        leveled = [(v, s) for v, s in values if isinstance(v, int) and v > 0]
        if leveled:
            return max(leveled, key=lambda x: x[1])[0]

    return max(values, key=lambda x: x[1])[0]


def match_and_merge(per_image: list[list[dict]]) -> list[dict]:
    """Match tribesmen across images and merge into a single roster.

    Args:
        per_image: list of lists, each inner list is the tribesmen from one screenshot.

    Returns:
        Merged list of unique tribesmen with best-of-breed field values.
    """
    if not per_image:
        return []
    if len(per_image) == 1:
        return per_image[0]

    groups: list[list[dict]] = []

    for img_idx, image_tribesmen in enumerate(per_image):
        for t in image_tribesmen:
            t["_img"] = img_idx
            tname = t.get("name") or ""
            tbase, tsuffix = _name_parts(tname)
            if not tbase or tname.startswith("[Card"):
                best_group = _find_by_position(t, groups)
                if best_group is not None:
                    groups[best_group].append(t)
                else:
                    groups.append([t])
                continue

            best_idx = None
            best_dist = 1.0
            for i, group in enumerate(groups):
                # Never merge cards from the same image
                if any(e.get("_img") == img_idx for e in group):
                    continue
                for existing in group:
                    ename = existing.get("name") or ""
                    ebase, esuffix = _name_parts(ename)
                    if not ebase:
                        continue
                    if tsuffix and esuffix and tsuffix != esuffix:
                        continue
                    dist = _name_distance(tbase, ebase)
                    if dist < best_dist:
                        best_dist = dist
                        best_idx = i

            if best_idx is not None and best_dist < 0.35:
                groups[best_idx].append(t)
            else:
                groups.append([t])

    merged = []
    for group in groups:
        t = group[0]
        if len(group) == 1:
            t.pop("_img", None)
            merged.append(t)
            continue

        result = {}
        for field in ["name", "level", "class", "clan", "title", "status", "group"]:
            result[field] = _pick_best_field(group, field)

        best_traits = max(group, key=lambda c: len(c.get("traits", [])))
        result["traits"] = best_traits.get("traits", [])
        result["card_index"] = group[0].get("card_index", 0)
        result["_sources"] = len(group)
        merged.append(result)

    merged.sort(key=lambda t: (t.get("name") or "zzz").lower())
    return merged


def _find_by_position(t: dict, groups: list[list[dict]]) -> int | None:
    """Try to match a nameless card by card_index position."""
    idx = t.get("card_index")
    if idx is None:
        return None
    for i, group in enumerate(groups):
        for existing in group:
            if existing.get("card_index") == idx:
                return i
    return None
