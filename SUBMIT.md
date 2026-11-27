# poidh claim — revised submission (bounty base/1570)

**Claim image:** `claim-image.png` (screenshot of the revised app, in this folder)

**Claim title (exact, one line):**

US 311 Rat Atlas, revised — 18 cities · 3,472,008 complaints · 3,447,288 mapped (99.3%) · Baltimore counted both ways

**Claim description (exact):**

This is a revised and expanded version of my earlier claim (9989) on this bounty — same project, rebuilt end-to-end from the official city APIs. The atlas now covers **18 cities** with **3,472,008** rat & rodent 311 records pulled, **3,447,288 of them mapped (99.3%)**, spanning 1999–2026. Every number below is recomputable from the open dataset in the repository.

What changed in this revision:

**Three new cities, each with a verified genuine rat/rodent category and real mapped points** — Cambridge, MA (5,166 records, 5,166 mapped; formal "Rodent Sighting" category), Evanston, IL (4,169 requests, 4,168 mapped; the city's archive layer repeats each request ~2×, so records are deduplicated on the city request ID — 8,625 raw rows → 4,169 requests), and Baton Rouge, LA (18,345 records, 18,325 mapped; resident call-ins to the parish rodent-control program, type = RODENT exactly).

**A missed Baltimore category found and fixed.** The first version filtered Baltimore on the Rat Rubout types only and missed **HCD-Rodents** — 42,011 resident-filed rodent complaints taken by the city's Housing & Community Development code enforcement. Baltimore's total is now 1,922,689 records.

**Baltimore counted both ways, openly.** Baltimore logs its proactive Rat Rubout baiting/inspection rounds as 311 records, and they dominate its data. Rather than silently including or quietly excluding them, the atlas now shows both counts everywhere: 1,922,689 total service records, of which **145,183 are resident-filed cases** (SW-Rat Rubout 102,422 + follow-ups 750 + HCD-Rodents 42,011) and 1,777,181 are the city's proactive rounds. The app has a "Citizen reports only" toggle that re-maps and re-counts the whole atlas on the resident-filed basis (atlas-wide: 1,694,502 records, 1,670,741 mapped). The proactive share is labeled in the UI, the README, and the coverage doc — never hidden.

**Full coverage documentation.** A new COVERAGE.md documents every city: source portal and dataset, the exact category/filter used, date range, records pulled, mapped, and resident-filed counts. The app's city-comparison table now shows records, mapped, % mapped, year range, and resident-filed counts per city. The full per-city CSV archive (80 files, every pulled record including non-geocoded ones) is in the repo.

Two honest caveats, unchanged from the first version: Somerville and Norfolk publish no coordinates at all in their 311 data, so their records are counted and included in the CSVs but cannot be mapped — no coordinates were invented or geocoded from addresses. And complaint volume measures reporting, not rat populations.

Live app: https://muiz270899.github.io/us-rat-complaint-map/app/
Repository: https://github.com/muiz270899/us-rat-complaint-map
Coverage: https://github.com/muiz270899/us-rat-complaint-map/blob/main/COVERAGE.md

---

## Reference numbers (for the submitter — not part of the claim text)

| | Records | Mapped |
|---|---:|---:|
| Atlas total (18 cities) | 3,472,008 | 3,447,288 (99.3%) |
| Atlas, citizen-filed basis | 1,694,502 | 1,670,741 |
| Baltimore total | 1,922,689 | 1,921,638 |
| Baltimore resident-filed | 145,183 | 145,091 |
| Baltimore proactive rounds | 1,777,181 | 1,776,223 |
| Chicago | 711,869 | 711,440 |
| New York | 517,619 | 514,277 |
| Baton Rouge (new) | 18,345 | 18,325 |
| Cambridge (new) | 5,166 | 5,166 |
| Evanston (new, deduplicated) | 4,169 | 4,168 |

Cross-check: the rival claim 9995 publishes Baltimore resident-filed as 145,183 requests / 145,091 mapped — this revision's independent recomputation from Baltimore's own API produces exactly those figures, while also counting (and labeling) the proactive records they exclude.
