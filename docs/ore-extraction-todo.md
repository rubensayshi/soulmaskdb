# Ore deposit extraction: COMPLETE

## Status

**Veins (`BP_JianZhu_KuangMai_*`): DONE.** 147 total across 4 types.

**Deposits (`BP_Collections_*`): DONE.** 10,101 total across 14 types.

Both loaded into `resource_nodes` DB table; visible on item detail pages via `ResourceNodeMap` component.

## Final counts

| Type          | Deposits | Veins |
| ------------- | -------- | ----- |
| Clay          | 2,507    | —     |
| Iron Ore      | 2,188    | 53    |
| Copper Ore    | 1,275    | 34    |
| Crystal       | 715      | —     |
| Tin Ore       | 675      | 27    |
| Sulfur Ore    | 579      | —     |
| Phosphate Ore | 387      | —     |
| Ice           | 361      | —     |
| Coal Ore      | 360      | 33    |
| Obsidian      | 312      | —     |
| Nitrate Ore   | 250      | —     |
| Salt Mine     | 180      | —     |
| Sea Salt      | 157      | —     |
| Meteorite Ore | 155      | —     |

## Pipeline

- **Extract**: `pipeline/parse_ore_deposits_run.ps1` (Windows, UAssetGUI)
  — scans 259 tiles across Hub Near tiles, KuangDong caves, tribe villages, ruins (base + DLC)
  — Version A: placed BP actor SortedInstances → RelativeLocation per component
  — Version B: foliage HISMC Extras binary → 64-byte FMatrix instances (header=64, pos at offset 0)
- **Build**: `pipeline/build_db.py` — reads ore_deposits.json + ore_spawns.json, converts coords, inserts into resource_nodes

## Coordinate transform

```
lon = pos_x * 0.0050178419 + 2048.206056
lat = pos_y * -0.0050222678 + -2048.404771
```

Map tag: `DLC_*` tiles → 'dlc', everything else → 'base'.

## Non-ore classes excluded

- `GaoKeJi` / `GaoKeJi_Lv1` — Mysterious Stone Table (ancient ruins device)
- `ChuanSongMen_1/2/3` — Teleporter structures
- `XiuMianCang` — Sleeping pods
- `ZhuanHuaLu` — Transformation furnace
- `FangFuShe` — Radiation emitter
