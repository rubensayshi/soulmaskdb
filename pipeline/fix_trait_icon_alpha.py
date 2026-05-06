#!/usr/bin/env python3
"""Remove gray background from trait icons via flood-fill.

The original export lost alpha (lossy webp). This script recovers
transparency by flood-filling from edges where the pixel is near
neutral gray (128,128,128). Run once; re-running is idempotent.

Usage:
    python3 pipeline/fix_trait_icon_alpha.py
"""

import os
from collections import deque
from PIL import Image

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(REPO_ROOT, "pipeline", "trait_icon_manifest.txt")
ICONS_DIR = os.path.join(REPO_ROOT, "Game", "Icons")

GRAY_THRESHOLD = 22


def is_bg(r, g, b):
    return (abs(r - 128) < GRAY_THRESHOLD
            and abs(g - 128) < GRAY_THRESHOLD
            and abs(b - 128) < GRAY_THRESHOLD
            and abs(r - g) < 12
            and abs(g - b) < 12)


def remove_gray_bg(img):
    img = img.convert("RGBA")
    w, h = img.size
    px = img.load()

    visited = set()
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            r, g, b, _ = px[x, y]
            if is_bg(r, g, b):
                q.append((x, y))
                visited.add((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if (x, y) not in visited:
                r, g, b, _ = px[x, y]
                if is_bg(r, g, b):
                    q.append((x, y))
                    visited.add((x, y))

    while q:
        cx, cy = q.popleft()
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = cx + dx, cy + dy
            if 0 <= nx < w and 0 <= ny < h and (nx, ny) not in visited:
                r, g, b, _ = px[nx, ny]
                if is_bg(r, g, b):
                    visited.add((nx, ny))
                    q.append((nx, ny))

    for x, y in visited:
        px[x, y] = (0, 0, 0, 0)

    return img, len(visited)


def main():
    with open(MANIFEST) as f:
        names = [line.strip() for line in f if line.strip()]

    processed = 0
    skipped = 0
    for name in names:
        path = os.path.join(ICONS_DIR, f"{name}.webp")
        if not os.path.exists(path):
            continue

        img = Image.open(path)
        if img.mode == "RGBA":
            corner = img.getpixel((0, 0))
            if corner[3] == 0:
                skipped += 1
                continue

        result, removed = remove_gray_bg(img)
        result.save(path, "webp", lossless=True)
        processed += 1

    print(f"Done: {processed} fixed, {skipped} already had alpha")


if __name__ == "__main__":
    main()
