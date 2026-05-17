#!/usr/bin/env python3
"""Main entry: image path -> JSON stdout. Called by Tauri as a sidecar."""
import json, sys, os, argparse, traceback
import cv2


def process_image(image_path: str, atlas_dir: str) -> dict:
    from detect_cards import detect_cards, crop_region
    from ocr_text import extract_card_text
    from match_traits import load_atlas, match_trait_row

    img = cv2.imread(image_path)
    if img is None:
        return {"error": f"Cannot read image: {image_path}", "tribesmen": []}

    atlas = load_atlas(atlas_dir) if os.path.isdir(atlas_dir) else {}
    cards = detect_cards(img)

    tribesmen = []
    for i, card in enumerate(cards):
        card_img = card.crop(img)
        try:
            text = extract_card_text(card_img)
            trait_row = crop_region(card_img, "trait_row")
            matches = match_trait_row(trait_row, atlas) if atlas else []
            tribesmen.append({
                "name": text.name,
                "level": text.level,
                "class": text.class_name,
                "clan": text.clan,
                "title": text.title,
                "status": text.status,
                "group": text.group,
                "traits": [
                    {"icon_name": m.icon_name, "confidence": round(m.confidence, 3)}
                    for m in matches
                ],
                "card_index": i,
            })
        except Exception as e:
            tribesmen.append({
                "name": f"[Card {i} error]",
                "error": str(e),
                "card_index": i,
                "traits": [],
            })

    return {"tribesmen": tribesmen, "cards_found": len(cards)}


def process_images(image_paths: list[str], atlas_dir: str) -> dict:
    """Process multiple screenshots and merge overlapping tribesmen."""
    from merge import match_and_merge

    per_image = []
    total_cards = 0
    for path in image_paths:
        result = process_image(path, atlas_dir)
        per_image.append(result.get("tribesmen", []))
        total_cards += result.get("cards_found", 0)

    merged = match_and_merge(per_image)
    return {
        "tribesmen": merged,
        "cards_found": total_cards,
        "images_processed": len(image_paths),
        "unique_tribesmen": len(merged),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image", nargs="+", help="Path(s) to screenshot image(s)")
    parser.add_argument("--atlas", default=os.path.join(os.path.dirname(__file__), "..", "assets", "atlas"))
    args = parser.parse_args()

    missing = [p for p in args.image if not os.path.exists(p)]
    if missing:
        print(json.dumps({"error": f"File(s) not found: {missing}", "tribesmen": []}))
        sys.exit(1)

    try:
        if len(args.image) == 1:
            result = process_image(args.image[0], args.atlas)
        else:
            result = process_images(args.image, args.atlas)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc(), "tribesmen": []}))
        sys.exit(1)


if __name__ == "__main__":
    main()
