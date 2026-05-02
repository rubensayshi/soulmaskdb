# Parse NaturalGift (traits / 天赋) from DT_GiftZongBiao export + Game.po translations
# Input:  Game/Exports/DT_GiftZongBiao.json
#         Localization/Game/en/Game.po
#         Localization/Game/zh/Game.po
# Output: Game/Parsed/traits.json

$ScriptDir  = Split-Path $MyInvocation.MyCommand.Path
$RepoRoot   = [System.IO.Path]::GetFullPath((Join-Path $ScriptDir ".."))
$ExportFile = Join-Path $RepoRoot "Game\Exports\DT_GiftZongBiao.json"
$OutFile    = Join-Path $RepoRoot "Game\Parsed\traits.json"
$LocDir     = "C:\Program Files\Epic Games\SoulMaskModkit\Projects\WS\Content\Localization\Game"
$EnPo       = Join-Path $LocDir "en\Game.po"
$ZhPo       = Join-Path $LocDir "zh\Game.po"

# ---------------------------------------------------------------------------
# Parse a Game.po file → hashtable { key_hash -> @{zh=...; en=...} }
# Only collects blocks referencing DT_GiftZongBiao
# ---------------------------------------------------------------------------
function Parse-Po($path, $lang) {
    Write-Host "Parsing $lang PO ($([math]::Round((Get-Item $path).Length/1MB,1)) MB)..."
    $content = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    # Normalize line endings so block splitting works regardless of CRLF/LF
    $content = $content -replace "`r`n", "`n" -replace "`r", "`n"
    $blocks  = $content -split "\n\n+"
    $result  = @{}
    foreach ($block in $blocks) {
        if (-not $block.Contains("DT_GiftZongBiao")) { continue }
        # key hash from msgctxt ",<32-char hex>"
        if ($block -notmatch 'msgctxt\s*",([A-F0-9]{32})"') { continue }
        $hash   = $Matches[1]
        # msgid (Chinese source text)
        $msgid  = if ($block -match '(?m)^msgid\s+"(.*?)"') { $Matches[1] } else { "" }
        # msgstr (English translation; blank in zh PO)
        $msgstr = if ($block -match '(?m)^msgstr\s+"(.*?)"') { $Matches[1] } else { "" }
        $result[$hash] = @{ msgid = $msgid; msgstr = $msgstr }
    }
    Write-Host "  -> $($result.Count) entries"
    return $result
}

# ---------------------------------------------------------------------------
# Extract NSLOCTEXT key hash from a field value string
# ---------------------------------------------------------------------------
function Get-NsKey($value) {
    if ($value -match 'NSLOCTEXT\s*\(\s*"[^"]*"\s*,\s*"([A-F0-9]{32})"') {
        return $Matches[1].ToUpper()
    }
    return $null
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
Write-Host "Loading $ExportFile..."
$rows = Get-Content $ExportFile -Raw | ConvertFrom-Json
Write-Host "  $($rows.Count) rows"

$enPo = Parse-Po $EnPo "EN"
$zhPo = Parse-Po $ZhPo "ZH"

$traits        = [System.Collections.Generic.List[hashtable]]::new()
$missingTitle  = 0
$missingDesc   = 0

foreach ($row in $rows) {
    $id = $row.Name

    # Title
    $titleKey = Get-NsKey $row.Title
    $nameZh = ""; $nameEn = ""
    if ($titleKey) {
        $zhEntry = if ($zhPo.ContainsKey($titleKey)) { $zhPo[$titleKey] } elseif ($enPo.ContainsKey($titleKey)) { $enPo[$titleKey] } else { $null }
        $enEntry = if ($enPo.ContainsKey($titleKey)) { $enPo[$titleKey] } else { $null }
        $nameZh = if ($zhEntry) { $zhEntry.msgid } else { "" }
        $nameEn = if ($enEntry) { $enEntry.msgstr } else { "" }
    }
    if (-not $nameEn) { $missingTitle++ }

    # Desc
    $descKey = Get-NsKey $row.Desc
    $descZh = ""; $descEn = ""
    if ($descKey) {
        $zhEntry = if ($zhPo.ContainsKey($descKey)) { $zhPo[$descKey] } elseif ($enPo.ContainsKey($descKey)) { $enPo[$descKey] } else { $null }
        $enEntry = if ($enPo.ContainsKey($descKey)) { $enPo[$descKey] } else { $null }
        $descZh = if ($zhEntry) { $zhEntry.msgid } else { "" }
        $descEn = if ($enEntry) { $enEntry.msgstr } else { "" }
    }
    if (-not $descEn) { $missingDesc++ }

    # Effect value
    $effectVal = $null
    try { $effectVal = [float]$row.NGEffectVal } catch {}

    $star = 0
    try { $star = [int]$row.Star } catch {}

    # LearnedNGID=0 means no upgrade chain — use own id as base_id
    $baseId = if ($row.LearnedNGID -and $row.LearnedNGID -ne "0") { $row.LearnedNGID } else { $id }
    $upgradeId = if ($row.UpgradeNGID -and $row.UpgradeNGID -ne "0") { $row.UpgradeNGID } else { $null }

    $trait = @{
        id           = $id
        name_zh      = $nameZh
        name_en      = $nameEn
        desc_zh      = $descZh
        desc_en      = $descEn
        star         = $star
        base_id      = $baseId
        effect       = $row.NGEffect
        effect_is_pct = ($row.NGEffectAttrValOrPer -eq "True")
    }
    if ($upgradeId)              { $trait["upgrade_id"]   = $upgradeId }
    if ($row.NGEffectAttrType)   { $trait["effect_attr"]  = $row.NGEffectAttrType }
    if ($null -ne $effectVal)    { $trait["effect_val"]   = $effectVal }
    if ($row.NGEffectSource -and $row.NGEffectSource -ne "Normal") {
        $trait["effect_source"] = $row.NGEffectSource
    }
    $traits.Add($trait)
}

# Sort by base_id then star
$sorted = $traits | Sort-Object { $_["base_id"] }, { $_["star"] }

$sorted | ConvertTo-Json -Depth 4 | Set-Content $OutFile -Encoding UTF8

Write-Host ""
Write-Host "Output: $OutFile"
Write-Host "Total traits    : $($traits.Count)"
Write-Host "Missing name_en : $missingTitle"
Write-Host "Missing desc_en : $missingDesc"

# Sample
Write-Host "`nSample (first 5):"
$sorted | Select-Object -First 5 | ForEach-Object {
    Write-Host "  [$($_['id'])] star=$($_['star'])  $($_['name_en']) / $($_['name_zh'])"
    if ($_['desc_en']) { Write-Host "        $($_['desc_en'].Substring(0, [Math]::Min(80, $_['desc_en'].Length)))" }
}

# Effect type breakdown
Write-Host "`nEffect types:"
$traits | Group-Object { $_["effect"] } | Sort-Object Count -Descending | Select-Object -First 15 |
    ForEach-Object { Write-Host "  $($_.Count.ToString().PadLeft(4))  $($_.Name)" }
