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


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image", help="Path to screenshot image")
    parser.add_argument("--atlas", default=os.path.join(os.path.dirname(__file__), "..", "assets", "atlas"))
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(json.dumps({"error": f"File not found: {args.image}", "tribesmen": []}))
        sys.exit(1)

    try:
        result = process_image(args.image, args.atlas)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e), "traceback": traceback.format_exc(), "tribesmen": []}))
        sys.exit(1)


if __name__ == "__main__":
    main()
