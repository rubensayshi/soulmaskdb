import os, sys

sys.path.insert(0, os.path.dirname(__file__))
from ocr_text import parse_level_line, parse_name


def test_parse_level_line_full():
    result = parse_level_line("LV.50 Master Hunter <Claw Tribe>")
    assert result["level"] == 50
    assert result["class_name"] == "Master Hunter"
    assert result["clan"] == "Claw Tribe"


def test_parse_level_line_no_clan():
    result = parse_level_line("LV.30 Skilled Laborer")
    assert result["level"] == 30
    assert result["class_name"] == "Skilled Laborer"
    assert result["clan"] is None


def test_parse_level_line_with_angle_brackets():
    result = parse_level_line("LV.50 Master Hunter <Wolf Tribe>")
    assert result["clan"] == "Wolf Tribe"


def test_parse_level_line_lv_variations():
    for text in ["Lv.50 Hunter", "LV50 Hunter", "Lv 50 Hunter", "LV. 50 Hunter"]:
        result = parse_level_line(text)
        assert result["level"] == 50


def test_parse_name_strips_whitespace():
    assert parse_name("  Animals ONLY  ") == "Animals ONLY"


def test_parse_name_empty():
    assert parse_name("") == ""
    assert parse_name("   ") == ""
