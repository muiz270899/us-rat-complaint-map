# poidh claim — revised submission (bounty base/1570)

**Claim image:** `claim-image.png` (screenshot of the revised app, in this folder)

**Claim title (exact, one line):**

US 311 Rat Atlas, revised — 21 jurisdictions · 3,474,748 complaints · 3,449,580 mapped (99.3%) · Baltimore counted both ways

**Claim description (exact):**

This is a revised and expanded version of my earlier claim (9989) on this bounty — same project, rebuilt end-to-end from the official city APIs. The atlas now covers **21 jurisdictions** (20 cities + Prince George's County, MD) with **3,474,748** rat & rodent 311 records pulled, **3,449,580 of them mapped (99.3%)**, spanning 1999–2026. Every number below is recomputable from the open dataset in the repository.

What changed in this revision:

**Three new cities, each with a verified genuine rat/rodent category and real mapped points** — Cambridge, MA (5,166 records, 5,166 mapped; formal "Rodent Sighting" category), Evanston, IL (4,169 requests, 4,168 mapped; the city's archive layer repeats each request ~2×, so records are deduplicated on the city request ID — 8,625 raw rows → 4,169 requests), and Baton Rouge, LA (18,345 records, 18,325 mapped; resident call-ins to the parish rodent-control program, type = RODENT exactly).

**Three more jurisdictions added in the latest round** — Denver, CO (1,536 records, 1,230 mapped, 2007–2026; only the five exact controlled rodent categories of its 311 archive — 'Rat Problems', 'Mice Problems', 'EQ - Rats', 'Rats', 'Rats & Mice' — with one disclosed gap: Denver publishes no queryable 311 source for Jan 2024 – Nov 2025), Prince George's County, MD (1,179 records, 1,037 mapped — a county, not a city, and an honestly historical series: its County Click 311 data runs 2012–2016 and its successor systems publish no rodent category; its 'Infestation of Bugs and/or Rodents' category is a combined bugs-and-rodents category and is labeled combined), and Berkeley, CA (25 records, all mapped; its 'Vector Control' category is combined — rodents, mosquitoes and other vectors in one case type — and is labeled combined exactly as San Francisco's combined category is; the category exists only from 2026).

**A missed Baltimore category found and fixed.** The first version filtered Baltimore on the Rat Rubout types only and missed **HCD-Rodents** — 42,011 resident-filed rodent complaints taken by the city's Housing & Community Development code enforcement. Baltimore's total is now 1,922,689 records.

**Baltimore counted both ways, openly.** Baltimore logs its proactive Rat Rubout baiting/inspection rounds as 311 records, and they dominate its data. Rather than silently including or quietly excluding them, the atlas now shows both counts everywhere: 1,922,689 total service records, of which **145,183 are resident-filed cases** (SW-Rat Rubout 102,422 + follow-ups 750 + HCD-Rodents 42,011) and 1,777,181 are the city's proactive rounds. The remaining 325 records are two 'Alley Concern' service types, counted in the total and itemized in the dataset's per-type breakdown. The app has a "Citizen reports only" toggle that re-maps and re-counts the whole atlas on the resident-filed basis (atlas-wide: 1,697,242 records, 1,673,033 mapped). The proactive share is labeled in the UI, the README, and the coverage doc — never hidden.

**Full coverage documentation.** A COVERAGE.md documents every jurisdiction: source portal and dataset, the exact category/filter used, date range, records pulled, mapped, and resident-filed counts. The app's comparison table now shows records, mapped, % mapped, year range, and resident-filed counts per jurisdiction. The full per-city CSV archive (every pulled record including non-geocoded ones) is in the repo.

Two honest caveats, unchanged from the first version: Somerville and Norfolk publish no coordinates at all in their 311 data, so their records are counted and included in the CSVs but cannot be mapped — no coordinates were invented or geocoded from addresses. And complaint volume measures reporting, not rat populations.

Live app: https://muiz270899.github.io/us-rat-complaint-map/app/
Repository: https://github.com/muiz270899/us-rat-complaint-map
Coverage: https://github.com/muiz270899/us-rat-complaint-map/blob/main/COVERAGE.md

---

## Reference numbers (for the submitter — not part of the claim text)

| | Records | Mapped |
|---|---:|---:|
| Atlas total (21 jurisdictions) | 3,474,748 | 3,449,580 (99.3%) |
| Atlas, citizen-filed basis | 1,697,242 | 1,673,033 |
| Baltimore total | 1,922,689 | 1,921,638 |
| Baltimore resident-filed | 145,183 | 145,091 |
| Baltimore proactive rounds | 1,777,181 | 1,776,223 |
| Chicago | 711,869 | 711,440 |
| New York | 517,619 | 514,277 |
| Baton Rouge (round 2) | 18,345 | 18,325 |
| Cambridge (round 2) | 5,166 | 5,166 |
| Evanston (round 2, deduplicated) | 4,169 | 4,168 |
| Denver (round 3; gap Jan 2024 – Nov 2025) | 1,536 | 1,230 |
| Prince George's County (round 3; 2012–2016) | 1,179 | 1,037 |
| Berkeley (round 3; combined category) | 25 | 25 |

Cross-check: the rival claim 9995 publishes Baltimore resident-filed as 145,183 requests / 145,091 mapped — this revision's independent recomputation from Baltimore's own API produces exactly those figures, while also counting (and labeling) the proactive records they exclude.
