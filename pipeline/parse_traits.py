"""
Parse NaturalGift (天赋 / traits) from DT_GiftZongBiao DataTable export.

Input:
  Game/Exports/DT_GiftZongBiao.json   -- exported via UE4Editor-Cmd
  Localization/Game/en/Game.po        -- English translations
  Localization/Game/zh/Game.po        -- Chinese source text (used for zh field)

Output:
  Game/Parsed/traits.json
"""

import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EXPORT_FILE  = os.path.join(REPO_ROOT, "Game", "Exports", "DT_GiftZongBiao.json")
OUTPUT_FILE  = os.path.join(REPO_ROOT, "Game", "Parsed", "traits.json")
MODKIT_LOC   = r"C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Localization\Game"
EN_PO        = os.path.join(MODKIT_LOC, "en", "Game.po")
ZH_PO        = os.path.join(MODKIT_LOC, "zh", "Game.po")


# ---------------------------------------------------------------------------
# PO parser — returns {key_hash: {"msgid": zh, "msgstr": en}} for GiftZongBiao
# ---------------------------------------------------------------------------

def parse_po(path):
    """Parse a Game.po file into {key_hash: (msgid, msgstr)}."""
    result = {}
    with open(path, encoding="utf-8") as f:
        content = f.read()

    # Split on blank lines to get individual blocks
    blocks = re.split(r"\n\n+", content)
    for block in blocks:
        # We want blocks that reference DT_GiftZongBiao
        if "DT_GiftZongBiao" not in block:
            continue
        # Extract key hash from msgctxt ",<HASH>"
        m_ctx = re.search(r'^msgctxt\s+",([A-F0-9]{32})"', block, re.MULTILINE)
        if not m_ctx:
            continue
        key_hash = m_ctx.group(1)
        # Extract msgid (Chinese source)
        m_id = re.search(r'^msgid\s+"(.*?)"', block, re.MULTILINE)
        msgid = m_id.group(1) if m_id else ""
        # Extract msgstr (English translation; absent in zh PO)
        m_str = re.search(r'^msgstr\s+"(.*?)"', block, re.MULTILINE)
        msgstr = m_str.group(1) if m_str else ""
        result[key_hash] = {"msgid": msgid, "msgstr": msgstr}

    return result


# ---------------------------------------------------------------------------
# Extract NSLOCTEXT key hash from a DataTable field value
# ---------------------------------------------------------------------------

NSLOCTEXT_RE = re.compile(
    r'NSLOCTEXT\s*\(\s*"[^"]*"\s*,\s*"([A-F0-9]{32})"\s*,',
    re.IGNORECASE,
)

def nsloctext_key(value):
    """Return the key hash from an NSLOCTEXT(...) string, or None."""
    m = NSLOCTEXT_RE.search(value)
    return m.group(1).upper() if m else None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    print(f"Loading {EXPORT_FILE} ...")
    with open(EXPORT_FILE, encoding="utf-8") as f:
        rows = json.load(f)
    print(f"  {len(rows)} rows")

    print(f"Parsing {EN_PO} ...")
    en_po = parse_po(EN_PO)
    print(f"  {len(en_po)} EN entries")

    print(f"Parsing {ZH_PO} ...")
    zh_po = parse_po(ZH_PO)
    print(f"  {len(zh_po)} ZH entries")

    traits = []
    missing_title = 0
    missing_desc  = 0

    for row in rows:
        row_id = row["Name"]

        # --- Title ---
        title_key = nsloctext_key(row.get("Title", ""))
        title_key_upper = title_key.upper() if title_key else None
        name_zh = ""
        name_en = ""
        if title_key_upper:
            zh_entry = zh_po.get(title_key_upper) or en_po.get(title_key_upper)
            en_entry = en_po.get(title_key_upper)
            name_zh = (zh_entry or {}).get("msgid", "")
            name_en = (en_entry or {}).get("msgstr", "")
        if not name_en:
            missing_title += 1

        # --- Desc ---
        desc_key = nsloctext_key(row.get("Desc", ""))
        desc_key_upper = desc_key.upper() if desc_key else None
        desc_zh = ""
        desc_en = ""
        if desc_key_upper:
            zh_entry = zh_po.get(desc_key_upper) or en_po.get(desc_key_upper)
            en_entry = en_po.get(desc_key_upper)
            desc_zh = (zh_entry or {}).get("msgid", "")
            desc_en = (en_entry or {}).get("msgstr", "")
        if not desc_en:
            missing_desc += 1

        # --- Effect value (string "0.030000" → float 0.03) ---
        try:
            effect_val = float(row.get("NGEffectVal", "0"))
        except ValueError:
            effect_val = None

        try:
            star = int(row.get("Star", "0"))
        except ValueError:
            star = 0

        trait = {
            "id":           row_id,
            "name_zh":      name_zh,
            "name_en":      name_en,
            "desc_zh":      desc_zh,
            "desc_en":      desc_en,
            "star":         star,
            "base_id":      row.get("LearnedNGID", ""),
            "upgrade_id":   row.get("UpgradeNGID", "") or None,
            "effect":       row.get("NGEffect", ""),
            "effect_attr":  row.get("NGEffectAttrType", "") or None,
            "effect_val":   effect_val,
            "effect_is_pct": row.get("NGEffectAttrValOrPer", "False") == "True",
            "effect_source": row.get("NGEffectSource", "") or None,
        }
        # Remove None values for cleaner output
        trait = {k: v for k, v in trait.items() if v is not None and v != ""}
        traits.append(trait)

    # Sort by base_id then star
    traits.sort(key=lambda t: (t.get("base_id", t["id"]), t.get("star", 0)))

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(traits, f, ensure_ascii=False, indent=2)

    print(f"\nOutput: {OUTPUT_FILE}")
    print(f"  Total traits:       {len(traits)}")
    print(f"  Missing name_en:    {missing_title}")
    print(f"  Missing desc_en:    {missing_desc}")

    # Sample output
    print("\nSample (first 5):")
    for t in traits[:5]:
        print(f"  [{t['id']}] star={t.get('star',0)}  {t.get('name_en','???')} / {t.get('name_zh','???')}")
        if t.get('desc_en'):
            print(f"        {t['desc_en'][:80]}")

    # Effect type breakdown
    from collections import Counter
    effects = Counter(t.get("effect", "?") for t in traits)
    print("\nEffect types:")
    for eff, cnt in effects.most_common():
        print(f"  {cnt:4d}  {eff}")


if __name__ == "__main__":
    main()
