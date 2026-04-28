# Loot & drop enhancements

## What we already have

Item detail pages show drop sources with probabilities, quantity ranges, and source creature names via the "Obtained From" section. Filterable by source type, sorted by probability. This is already more than any competitor shows.

## What's still missing

### 1. Reverse lookup — "what does creature X drop?"

We show "item Y drops from creature X" but not the other direction. Players frequently want to know the full loot table for a specific creature or boss before deciding to farm it.

**Demand:** Steam thread "Enemy drops" asking for comprehensive creature→loot lists. YouTube videos titled "what does [boss] drop?" with 10K+ views.

### 2. Quality tier drop mechanics

Players ask how to get higher quality gear — "How to unlock uncommon loot?" and "Adjust chance at higher quality gear?" are active Steam threads. This is about the RNG system that determines item rarity, not which creature drops what.

**Demand:** Steam threads specifically about quality chances. 2026 meta guides mention "Scavenger's Luck" stat boosting rare drop rates by 15-20%.

### 3. Loot-only items (mods, blueprints)

Mod 3 items can't be crafted — they only drop from specific bosses, elites, and ruins chests. Players need to know exactly which sources drop them. Steam thread "Where to find Mod 3 items" asks this directly.

**Demand:** recurring questions about which items are loot-only and where specifically they come from.

### 4. Farming efficiency comparison

"Is it better to farm A or B for material X?" — players want to compare sources by expected yield (probability x quantity) per kill/run, not just see raw percentages.

**Demand:** guides like "Best place to farm Bloodstone," "Red crystal farming guide," and "Early 30s farm spot" are among the most popular Soulmask content. Players are optimizing farming routes.

## Competitor gap

| Tool                 | Drop probabilities? | Reverse lookup? | Quality mechanics? | Farming comparison? |
| -------------------- | ------------------- | --------------- | ------------------ | ------------------- |
| Us (current)         | Yes                 | No              | No                 | No                  |
| soulmaskdatabase.com | No                  | No              | No                 | No                  |
| saraserenity.net     | No                  | No              | No                 | No                  |
| Fextralife wiki      | No                  | No              | Some guides        | No                  |

## Effort estimates

| Enhancement              | Effort     | Notes                                                      |
| ------------------------ | ---------- | ---------------------------------------------------------- |
| Reverse lookup (creature loot tables) | Low (1-2 days) | Data exists, need creature detail page or modal |
| Farming efficiency ranking | Low (1 day) | Compute expected yield, sort by it                |
| Loot-only item tagging   | Low (1 day) | Flag items with no recipe, surface on item pages           |
| Quality tier mechanics   | Unknown    | May not be in extracted data — needs investigation         |
