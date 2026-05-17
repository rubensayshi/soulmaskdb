import os, tempfile, pytest

sys_path = os.path.dirname(__file__)
if sys_path not in __import__('sys').path:
    __import__('sys').path.insert(0, sys_path)

from gen_atlas import build_atlas, source_to_badge_shape, BADGE_COLORS


def test_source_to_badge_shape():
    assert source_to_badge_shape("Normal") == "hexagon"
    assert source_to_badge_shape("XiHao") == "diamond"
    assert source_to_badge_shape("BornBuLuoCiTiao") == "shield"
    assert source_to_badge_shape("BornChuShen") == "shield"
    assert source_to_badge_shape("ChengHao") == "shield"
    assert source_to_badge_shape("JingLi") == "shield"
    assert source_to_badge_shape("XingGe") == "diamond"


def test_badge_colors_has_all_shapes():
    for shape in ("hexagon", "diamond", "shield"):
        assert shape in BADGE_COLORS
        assert "fill" in BADGE_COLORS[shape]
        assert "stroke" in BADGE_COLORS[shape]


def test_build_atlas_creates_files():
    traits_path = os.path.join(os.path.dirname(__file__), "..", "Game", "Parsed", "traits.json")
    icons_dir = os.path.join(os.path.dirname(__file__), "..", "Game", "Icons")
    if not os.path.exists(traits_path) or not os.path.exists(icons_dir):
        pytest.skip("Need traits.json + icons to run")

    with tempfile.TemporaryDirectory() as out_dir:
        stats = build_atlas(traits_path, icons_dir, out_dir, size=64)
        assert stats["generated"] > 0
        pngs = [f for f in os.listdir(out_dir) if f.endswith(".png")]
        assert len(pngs) == stats["generated"]
        from PIL import Image
        img = Image.open(os.path.join(out_dir, pngs[0]))
        assert img.size == (64, 64)
