# Damage / stat calculator

**Status:** aspirational — blocked on unknown combat formula

## Summary

Interactive calculator that lets players input weapon, quality tier, proficiency level, and character stats to see predicted damage output. No existing community tool offers this — it's the #1 most-requested missing tool across all Soulmask communities.

## Demand evidence

**Steam Community:**
- ["How to calculate Detailed Stats ATK and Weapon Damage?"](https://steamcommunity.com/app/2646460/discussions/0/6579277080413651041/) — player tested dual blades extensively, couldn't deduce the formula
- ["So what stat actually matters in this game?"](https://steamcommunity.com/app/2646460/discussions/0/4352247156433351666/) — players don't know if Agility, Strength, or proficiency matters most
- ["Best Character Stats"](https://steamcommunity.com/app/2646460/discussions/0/4335357389283449568/) — ongoing debate about stat investment
- ["Proficiency Bonus at 30/60/90/120 - what should you pick?"](https://steamcommunity.com/app/2646460/discussions/0/4335357389283245845/) — players choosing blindly between milestone bonuses
- ["Does anyone know what Weapon Quality Proficiency Upgrade Does?"](https://steamcommunity.com/app/2646460/discussions/0/4352247531896262352/) — basic mechanics still unclear

**Known mechanics (from community research + saraserenity.net):**
- Agility: +0.5% damage to spears/blades/dual-blades/gauntlets, +0.25% melee attack speed
- Strength: +0.5% damage to greatswords/hammers
- Proficiency milestones at 30/60/90/120 offer choices (Attack Power, Damage Bonus, Knockdown, Speed)
- In beta, weapon-damage-increasing stats reportedly didn't work — players still don't trust the numbers

**The core problem:** nobody has reverse-engineered the formula that combines ATK + weapon base damage + proficiency bonus + stat scaling into actual hit damage.

## What we have

- `prop_packs.json` — base stats per item with 6 quality tier multipliers (Normal→Legendary)
- 40+ attribute types: Weapon Damage, Defense, Armor Penetration, Poise, resistances, etc.
- Each attribute has an operation type (`Additive` or `Multiplicative`) and quality scaling bounds
- Quality tier preview already on item detail pages

## What we don't have

- The combat damage formula (how inputs combine into hit damage)
- Proficiency milestone definitions per weapon type
- Character stat scaling coefficients
- Target defense/resistance reduction formula
- Attack speed → DPS conversion

## What's buildable now (without the formula)

These could ship as stepping stones and are valuable on their own:

1. **Weapon comparison** — side-by-side stats across quality tiers. "Is Legendary Iron Sword better than Epic Steel Sword?" Nobody else offers this.
2. **Quality tier cost/benefit** — show stat gain per tier to help players decide if chasing Legendary is worth the crafting cost.
3. **Proficiency bonus explainer** — document what each milestone choice does per weapon type. Integrate with item data.

## What would unblock the full calculator

- Community reverse-engineers the formula (ongoing effort in Steam threads)
- We find the formula in unexplored game data (DataTables or Blueprint logic we haven't exported)
- CampFire Studio publishes the formula (unlikely)

## Competitor gap

No tool has this. First to ship would own the space.

## Effort estimate

Stepping stones (comparison tool): low (1-2 days). Full calculator: unknown, blocked on formula discovery.
