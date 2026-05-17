import os, sys
import numpy as np
import cv2

sys.path.insert(0, os.path.dirname(__file__))
from detect_cards import detect_cards, Card


def make_synthetic_grid(rows=3, cols=2, card_w=300, card_h=180, gap=10, border=4):
    img_w = cols * card_w + (cols + 1) * gap
    img_h = rows * card_h + (rows + 1) * gap
    img = np.zeros((img_h, img_w, 3), dtype=np.uint8)
    img[:] = (20, 20, 20)

    expected = []
    for r in range(rows):
        for c in range(cols):
            x = gap + c * (card_w + gap)
            y = gap + r * (card_h + gap)
            cv2.rectangle(img, (x, y), (x + card_w, y + card_h), (120, 120, 120), border)
            cv2.rectangle(img, (x + border, y + border),
                          (x + card_w - border, y + card_h - border), (50, 55, 50), -1)
            expected.append((x, y, card_w, card_h))
    return img, expected


def test_detect_cards_finds_all():
    img, expected = make_synthetic_grid(rows=3, cols=2)
    cards = detect_cards(img)
    assert len(cards) == 6


def test_detect_cards_returns_sorted():
    img, _ = make_synthetic_grid(rows=2, cols=2)
    cards = detect_cards(img)
    for i in range(len(cards) - 1):
        if cards[i].y == cards[i + 1].y:
            assert cards[i].x <= cards[i + 1].x
        else:
            assert cards[i].y <= cards[i + 1].y


def test_detect_cards_empty_image():
    img = np.zeros((100, 100, 3), dtype=np.uint8)
    cards = detect_cards(img)
    assert len(cards) == 0
