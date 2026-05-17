import os, sys
import numpy as np
import cv2
import pytest

sys.path.insert(0, os.path.dirname(__file__))
from match_traits import load_atlas, match_icon, segment_icons

ATLAS_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "atlas")


@pytest.fixture
def atlas():
    if not os.path.exists(ATLAS_DIR) or not os.listdir(ATLAS_DIR):
        pytest.skip("Atlas not generated — run gen_atlas.py first")
    return load_atlas(ATLAS_DIR)


def test_load_atlas(atlas):
    assert len(atlas) > 300
    for name, img in atlas.items():
        assert img.shape[0] == img.shape[1]


def test_match_icon_exact(atlas):
    name = list(atlas.keys())[0]
    template = atlas[name]
    result = match_icon(template, atlas)
    assert result.icon_name == name
    assert result.confidence > 0.99


def test_match_icon_with_noise(atlas):
    name = list(atlas.keys())[0]
    template = atlas[name].copy()
    noise = np.random.randint(0, 30, template.shape, dtype=np.uint8)
    noisy = cv2.add(template, noise)
    result = match_icon(noisy, atlas)
    assert result.icon_name == name
    assert result.confidence > 0.7


def test_segment_icons_row():
    row = np.zeros((40, 200, 3), dtype=np.uint8)
    for i in range(5):
        x = 5 + i * 38
        cv2.rectangle(row, (x, 4), (x + 30, 34), (100, 150, 100), -1)
    icons = segment_icons(row, expected_size=30)
    assert len(icons) >= 4
