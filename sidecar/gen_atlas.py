"""Generate reference atlas: composite each trait icon onto its badge shape."""
import json, os, sys, math
from PIL import Image, ImageDraw

BADGE_COLORS = {
    "hexagon": {"fill": (30, 42, 26), "stroke": (74, 106, 58)},
    "diamond": {"fill": (46, 38, 64), "stroke": (138, 112, 176)},
    "shield":  {"fill": (42, 37, 24), "stroke": (138, 122, 74)},
}


def source_to_badge_shape(source: str) -> str:
    if source == "Normal":
        return "hexagon"
    if source in ("XiHao", "XingGe"):
        return "diamond"
    return "shield"


def _draw_hexagon(draw, size, fill, outline):
    cx, cy = size / 2, size / 2
    r = size * 0.46
    pts = []
    for i in range(6):
        angle = math.radians(60 * i - 90)
        pts.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(pts, fill=outline)
    inner_r = r * 0.88
    inner_pts = []
    for i in range(6):
        angle = math.radians(60 * i - 90)
        inner_pts.append((cx + inner_r * math.cos(angle), cy + inner_r * math.sin(angle)))
    draw.polygon(inner_pts, fill=fill)


def _draw_diamond(draw, size, fill, outline):
    cx, cy = size / 2, size / 2
    r = size * 0.46
    pts = [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]
    draw.polygon(pts, fill=outline)
    inner_r = r * 0.88
    inner_pts = [(cx, cy - inner_r), (cx + inner_r, cy), (cx, cy + inner_r), (cx - inner_r, cy)]
    draw.polygon(inner_pts, fill=fill)


def _draw_shield(draw, size, fill, outline):
    cx = size / 2
    r = size * 0.42
    top_y = size * 0.12
    mid_y = size * 0.55
    bot_y = size * 0.90
    pts = [
        (cx, top_y), (cx + r, top_y + r * 0.4), (cx + r, mid_y),
        (cx, bot_y), (cx - r, mid_y), (cx - r, top_y + r * 0.4),
    ]
    draw.polygon(pts, fill=outline)
    s = 0.90
    inner_pts = [(cx + (x - cx) * s, top_y + (y - top_y) * s + size * 0.02) for x, y in pts]
    draw.polygon(inner_pts, fill=fill)


_BADGE_DRAWERS = {
    "hexagon": _draw_hexagon,
    "diamond": _draw_diamond,
    "shield": _draw_shield,
}


def composite_icon(icon_path: str, shape: str, size: int) -> Image.Image:
    colors = BADGE_COLORS[shape]
    badge = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(badge)
    _BADGE_DRAWERS[shape](draw, size, colors["fill"] + (255,), colors["stroke"] + (255,))

    icon = Image.open(icon_path).convert("RGBA")
    icon_size = int(size * 0.6)
    icon = icon.resize((icon_size, icon_size), Image.LANCZOS)
    offset = (size - icon_size) // 2
    badge.paste(icon, (offset, offset), icon)
    return badge


def build_atlas(traits_path: str, icons_dir: str, out_dir: str, size: int = 64) -> dict:
    with open(traits_path) as f:
        traits = json.load(f)

    icon_source = {}
    for t in traits:
        name = t.get("icon_name")
        if name and name not in icon_source:
            icon_source[name] = t["source"]

    os.makedirs(out_dir, exist_ok=True)
    generated = 0
    missing = 0
    for icon_name, source in icon_source.items():
        icon_path = os.path.join(icons_dir, icon_name + ".webp")
        if not os.path.exists(icon_path):
            missing += 1
            continue
        shape = source_to_badge_shape(source)
        img = composite_icon(icon_path, shape, size)
        img.save(os.path.join(out_dir, f"{icon_name}.png"))
        generated += 1

    return {"generated": generated, "missing": missing, "total": len(icon_source)}


if __name__ == "__main__":
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument("--traits", default=os.path.join(os.path.dirname(__file__), "..", "Game", "Parsed", "traits.json"))
    p.add_argument("--icons", default=os.path.join(os.path.dirname(__file__), "..", "Game", "Icons"))
    p.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "..", "assets", "atlas"))
    p.add_argument("--size", type=int, default=64)
    args = p.parse_args()
    stats = build_atlas(args.traits, args.icons, args.out, args.size)
    print(f"Atlas: {stats['generated']} generated, {stats['missing']} missing icons, {stats['total']} total")
