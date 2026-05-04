# UE4 DataTable Export — Technical Notes

Documents how `pipeline/export_tables.py` extracts data from the Soulmask modkit
DataTable `.uasset` files, and what was learned about the UE 4.27 Python API.

---

## The problem

DataTable `.uasset` files are binary. The goal is to get their row data as JSON.

UE4 Python (`-ExecutePythonScript` via `UE4Editor-Cmd.exe`) *looks* like it should make
this easy, but the API is severely limited in headless mode:

| What you'd expect to work | What actually happens |
|---|---|
| `unreal.FieldIterator(struct)` | `AttributeError`: no attribute `FieldIterator` |
| `dir(struct_cdo)` | Returns empty list — UPROPERTYs not enumerable via Python introspection |
| `vars(struct_cdo)` / `__dict__` | Raises `TypeError` / `AttributeError` |
| `EditorAssetLibrary.export_asset(path, dir)` | `AttributeError`: no attribute `export_asset` |
| `table.call_method('GetTableAsJSON')` | Fails — only UFunctions work, not C++ methods |
| `AssetExportTask` + `Exporter.run_asset_export_tasks` | Returns `False`; exporter not found in headless mode |

What **does** work:
- `DataTableFunctionLibrary.get_data_table_row_names(table)` → list of row keys ✓
- `DataTableFunctionLibrary.get_data_table_column_as_string(table, col_name)` → list of values ✓
  — but you must already know the column names.

---

## The solution — binary FName extraction

UE4 `.uasset` files store all `FName` strings (including struct property names) as
printable ASCII in the file's name table.  We read the binary directly from Python,
extract all ASCII runs ≥ 4 chars, filter to CamelCase identifiers that look like
UPROPERTY names, then probe each candidate with `get_data_table_column_as_string`.
Candidates that return a full-length result are real columns.

See `pipeline/export_tables.py` → `extract_candidate_columns()`.

---

## Column data format

All 11 drop-table DataTables share the same row struct (`CaiJiDaoJuBaoDataTable`).
The working columns are:

| Column | Type | Content |
|---|---|---|
| `DaoJuBaoName` | string | Identifier for this bag (e.g. `DL_YeZhu`) |
| `DaoJuBaoContent` | string | Serialised UE4 export-text (see below) |
| `AssginMeshData` | string | Mesh assignment (not used for drops) |
| `ExtraDropContentData` | string | Usually empty |

### `DaoJuBaoContent` format

UE4 property export text — nested `Key=Value` with parenthesised arrays:

```
((
  SelectedRandomProbability=<0-100>,
  ConditionAndCheckData=<empty or struct>,
  BaoNeiDaoJuInfos=(
    (
      DaoJuQuanZhong=<int weight>,
      DaoJuMagnitude=(
        LowerBound=(Type=Inclusive,Value=<float>),
        UpperBound=(Type=Inclusive,Value=<float>)
      ),
      DaoJuPinZhi=EDJPZ_Level<1-6>,
      ItemNaiJiuRange=(...),
      DaoJuClass=BlueprintGeneratedClass'"/Game/Blueprints/DaoJu/.../BP_Foo.BP_Foo_C"',
      ShuLiangBuShouXiShuYingXiang=<bool>
    ),
    ...
  )
), ...)
```

`parse_exports.py` parses this with a parenthesis-aware splitter and regex, resolves
`DaoJuClass` asset paths to English names via `parse_localization.py`.

---

## How to run the full pipeline

### Stage 1 — DataTable export (Windows + modkit required)

```powershell
# From project root
"C:\Program Files\Epic Games\SoulMaskModkit\Engine\Binaries\Win64\UE4Editor-Cmd.exe" `
  "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\WS.uproject" `
  -ExecutePythonScript="$PWD\pipeline\export_tables.py" `
  -stdout -FullStdOutLogOutput -unattended -nopause
```

First run compiles ~22 000 shaders (DDC cold cache, ~37 min).
Subsequent runs: ~5 min.  Output: `Game/Exports/*.json`

> **From bash** (Git Bash / WSL), invoke `UE4Editor-Cmd.exe` directly — `cmd /c run_export.bat`
> does not work because bash kills the subprocess when the parent shell exits.

### Stage 2 — Parse exports (any Python 3.x, no deps)

```bash
python pipeline/parse_exports.py   # → Game/Parsed/drops.json
```

### Stage 3 — Build database

```bash
make db   # parse all + rebuild data/app.db
```

---

## FModel pipeline (alternative — no UE4 editor needed)

For assets not accessible via UE4 Python (e.g. Blueprint CDO properties), FModel
can export `.uasset` files to `.json` directly.

See `pipeline/fmodel/` for setup scripts:
- `download_fmodel.ps1` — downloads FModel into `tools/`
- `configure_fmodel.ps1` — writes FModel settings (AES key, game path)
- `export_uassets.ps1` / `export_targeted.ps1` — batch-exports asset directories
- `find_game_paks.ps1` — locates Soulmask `.pak` files on any drive
- `find_aes_key.ps1` — scans game executable for the AES encryption key

The AES key is required because Soulmask pak files are encrypted.
