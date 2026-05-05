# Tribesmen builder

Wishlist-style trait builder integrated into the existing `/traits` page as a collapsible right-hand panel. Players pick traits to compose a dream tribesman build, with game-accurate slot limits and clan exclusivity enforced. Builds are shareable via URL.

## Slot model

| Category         | Source key         | Max | Selection rule                           |
| ---------------- | ------------------ | --- | ---------------------------------------- |
| Origin           | BornChuShen        | 1   | Pick 1                                   |
| Personality      | XingGe             | 1   | Pick 1                                   |
| Tribe born       | BornBuLuoCiTiao    | 4   | From active clan's pool only (cap approximate; game data shows 3-5 groups per clan) |
| Combat (learned) | Normal (learned)   | 6   | Any; respects clan lock                  |
| Title            | ChengHao           | 1   | Pick 0-1                                 |
| Preferences      | XiHao              | 3   | Positive only                            |
| Experience       | JingLi             | 1   | Pick 0-1                                 |

"Learned" means `learned_id != null` on Normal-source traits. Negative traits (`is_negative`) are excluded entirely.

## Clan lock

- No clan selected initially.
- First clan-specific trait added (`clan != null`, excluding `dlc`) locks the build to that clan.
- All other-clan traits become disabled (dimmed, not clickable).
- Removing all clan-specific traits unlocks the clan.
- DLC traits are available regardless of clan lock.
- Clan indicator in panel header shows lock state and which trait triggered it.

## Star tier selection

Trait families (grouped by `learned_id`) display only the highest star tier (3-star) in builder context since it's a wishlist. If a family only has 1- or 2-star variants, show the highest available.

## UI integration

### Toggle

"Builder mode" toggle button in the traits page header, next to existing filters. Off by default. When toggled on:

- Build panel slides in from the right (320px width).
- Trait list narrows to accommodate.
- Each trait card gains a "+" button on the right edge.
- Cards in the build show green border + checkmark.
- Cards blocked by constraints dim to ~35% opacity, "+" button hidden.

### Build panel (top to bottom)

1. **Header** — "Tribesman build" title + "Share build" button.
2. **Clan indicator** — appears once a clan-specific trait is added. Shows clan name, color dot, and which trait locked it.
3. **Slot sections** — one per category in the order listed in the slot model table. Each section has:
   - Header: category name + "filled / max" counter.
   - Filled slots: compact chips showing star dots, trait name, community tier badge, and "×" remove button.
   - Empty slots: dashed-border placeholders labeled "empty slot".
4. **Footer** — total trait count + "Clear all" link.

### Panel collapse

Toggle arrow on the panel's left edge collapses it to a thin vertical strip showing just the trait count badge. Click to expand.

### Mobile

Panel becomes a bottom sheet instead of side panel. Collapsed state shows a floating pill with trait count; tap to expand as a sheet covering ~70% of the viewport.

## Filtering in builder mode

- All existing filters (search, sign, DLC, tier, clan tabs) continue to work.
- New "Fits build" toggle filter: when active, hides traits disabled by constraints.
- Source tab switches still work — browsing "Tribe Born" tab only shows tribe-born traits but the build panel stays visible.
- Sort order: available traits sort above disabled ones; within each group, existing sort preserved.

## URL sharing

### Format

```
/traits?build=100013,160083,200031
```

Comma-separated trait IDs (the specific star-tier ID, not the family `learned_id`). Clan is inferred from the traits — not encoded separately.

### Share flow

1. Click "Share build" in panel header.
2. URL with `?build=` param is copied to clipboard.
3. Toast notification: "Build link copied".

### Loading a shared build

- On page load, if `?build=` param exists, activate builder mode and populate slots.
- Invalid traits (removed from data, conflicting clans) are silently skipped.

## Persistence

- Builder mode toggle state persists in `localStorage`.
- Build contents (selected trait IDs) persist in `localStorage` — survives page refresh.
- A `?build=` URL param overrides localStorage and activates builder mode.

## No backend changes

Entirely client-side. No new API endpoints, no database changes. All trait data already available from `GET /api/traits`.
