#!/usr/bin/env python3
"""Extract trait icons from Soulmask modkit .uasset files.

UE4 stores two images per texture uasset:
1. An uncompressed PNG (RGB only, alpha=255 everywhere) — the mip source.
2. A zlib-compressed PNG (RGBA, proper transparency) — the full source art.

This script uses the zlib-compressed PNG which has correct alpha, falling
back to the uncompressed PNG if no zlib PNG is found.

Usage:
    python3 pipeline/extract_trait_icons.py
"""

import io
import os
import zlib

from PIL import Image

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST_FILE = os.path.join(REPO_ROOT, "pipeline", "trait_icon_manifest.txt")
OUT_DIR = os.path.join(REPO_ROOT, "Game", "Icons")
MODKIT_DIR = (
    r"C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content"
    r"\UI\resource\JianYingIcon\ChuShenTianFu"
)

PNG_HEADER = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])
IEND_MARKER = bytes([0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82])
# Valid zlib compression level bytes following 0x78
ZLIB_SECOND = {0x9C, 0xDA, 0x01, 0x5E}


def extract_png(data: bytes) -> bytes | None:
    """Extract the first uncompressed embedded PNG."""
    start = data.find(PNG_HEADER)
    if start == -1:
        return None
    end = data.find(IEND_MARKER, start)
    if end == -1:
        return None
    return data[start : end + len(IEND_MARKER)]


def extract_zlib_png(data: bytes) -> bytes | None:
    """Find and decompress the zlib-compressed PNG with proper alpha channel."""
    for i in range(len(data) - 2):
        if data[i] == 0x78 and data[i + 1] in ZLIB_SECOND:
            try:
                decompressed = zlib.decompress(data[i:])
                if decompressed[:4] == PNG_HEADER[:4]:
                    return decompressed
            except zlib.error:
                pass
    return None


def scan_uassets(root: str) -> dict[str, str]:
    """Return {stem_lower: full_path} for all .uasset files under root."""
    mapping = {}
    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            if fname.lower().endswith(".uasset"):
                stem = os.path.splitext(fname)[0]
                mapping[stem.lower()] = os.path.join(dirpath, fname)
    return mapping


def load_manifest() -> list[str]:
    with open(MANIFEST_FILE) as f:
        return [line.strip() for line in f if line.strip()]


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"Scanning uassets in {MODKIT_DIR} ...")
    uassets = scan_uassets(MODKIT_DIR)
    print(f"  Found {len(uassets)} .uasset files")

    manifest = load_manifest()
    print(f"  Manifest: {len(manifest)} entries")

    ok = 0
    skipped = 0
    missing = []
    errors = []

    for name in manifest:
        out_path = os.path.join(OUT_DIR, f"{name}.webp")
        if os.path.exists(out_path):
            skipped += 1
            continue

        uasset_path = uassets.get(name.lower())
        if not uasset_path:
            missing.append(name)
            continue

        raw = open(uasset_path, "rb").read()

        # Prefer the zlib-compressed PNG which has the real alpha channel
        png_data = extract_zlib_png(raw) or extract_png(raw)
        if not png_data:
            errors.append((name, "no embedded PNG found"))
            continue

        try:
            img = Image.open(io.BytesIO(png_data))
            if img.mode != "RGBA":
                img = img.convert("RGBA")
            img.save(out_path, "webp", lossless=True)
            ok += 1
        except Exception as e:
            errors.append((name, str(e)))

    print(f"\nDone: {ok} exported, {skipped} already existed, "
          f"{len(missing)} missing, {len(errors)} errors")

    if missing:
        print(f"\nMissing from modkit ({len(missing)}):")
        for name in missing:
            print(f"  {name}")

    if errors:
        print(f"\nErrors ({len(errors)}):")
        for name, err in errors:
            print(f"  {name}: {err}")


if __name__ == "__main__":
    main()
