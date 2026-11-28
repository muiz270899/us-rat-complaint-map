# BUILD-REPORT — poidh base/1570 "Build a national 311 rat complaint map"

For the parent agent. All numbers below come from the data actually pulled and the pipeline's own logs; nothing is estimated except where explicitly labeled.

## Headline result

- **15 verified cities — 3,402,317 records pulled — 3,377,635 geocoded/mapped — 24,682 missing coordinates (0.7%)**
- Historical span **1999-11-29 → 2026-11-26**; data fetched **2026-11-27** (summary.json `generated_utc` 2026-11-27T04:42Z, batch5 run)
- vs rivals on the bounty: 12 cities / 1,522,914 records and 13 cities / 461,342 records → this entry is **2.2× the largest rival's record count**, with more cities, and every count auditable from the included data files.
- The original brief's aim (>1.6M) was exceeded honestly; the steer target of 20+ cities was **not** reached — 15 cities is the verified maximum (see "Cities investigated and skipped": ~18 additional cities were probed and have no genuine, separable rat/rodent category or no openly queryable data). Comprehensiveness is carried by full-history pulls per city instead.

## Per-city results (verified endpoint + filter → counts)

| City | Endpoint (verified live) | Filter | Pulled | Geocoded | Missing | Dates |
|---|---|---|---:|---:|---:|---|
| Baltimore, MD | ArcGIS services1.arcgis.com/UWYHeuuJISiGmgXx — 311_Customer_Service_Requests_Yearly (layers 0–18 = 2022→2004) + _2023/_2024/_2025/_current services | `SRType LIKE 'SW-Rat%'` | 1,880,678 | 1,879,644 | 1,034 | 2010-01-01 – 2026-11-25 |
| Chicago, IL | Socrata v6vf-nfxy + 97t6-zrhs (data.cityofchicago.org) | `sr_type/type_of_service_request = 'Rodent Baiting/Rat Complaint'` | 711,869 | 711,440 | 429 | 1999-11-29 – 2026-11-26 |
| New York, NY | Socrata erm2-nwe9 (2020– ) + 76ig-c548 (2010–2019) | `complaint_type='Rodent'`, type = descriptor | 517,619 | 514,277 | 3,342 | 2010-01-01 – 2026-11-25 |
| Washington, DC | ArcGIS maps2.dcgis.dc.gov ServiceRequests, layers 0–12,14,15,16,18,21 (skip 13 Last-90-Days, 17 Snow, 19 Current-FY to avoid double counting) | `SERVICECODEDESCRIPTION='Rodent Inspection and Treatment'` | 114,945 | 114,945 | 0 | 2013-05-23 – 2026-05-01 |
| Boston, MA | CKAN data.boston.gov, 16 yearly resources 2011–2026 | `"type" like '%Rodent%'` → 'Rodent Activity' | 48,172 | 47,731 | 441 | 2012-01-02 – 2026-11-10 |
| Buffalo, NY | Socrata whkc-e5vr + 3tj7-3tdz | `type='Rodents (Req_Serv)'` / `type='Rodent Control Issue'` (new dataset's date field is `createddate`, not `open_date`) | 37,313 | 35,939 | 1,374 | 2008-07-29 – 2026-11-26 |
| Detroit, MI | ArcGIS services2.arcgis.com/qvkbeam7Wirps6zC improve_detroit L0 | `request_type LIKE '%Rodent%'` → all 'Rodent Extermination' | 27,177 | 27,177 | 0 | 2017-06-14 – 2026-11-25 |
| Kansas City, MO | Socrata 7at3-sxhp + d4px-6rwg | `type IN ('Rat Treatment','Rat Control and Treatment','Rodent')`; `issue_sub_type='Rats'` | 20,177 | 20,176 | 1 | 2007-01-04 – 2026-11-20 |
| Somerville, MA | Socrata 4pyi-uqq6 | `type like '%Rodent%' OR type='Rats'` — **no coordinate columns exist** → CSV-only | 14,810 | 0 | 14,810 | 2015-07-04 – 2026-11-23 |
| Pittsburgh, PA | CKAN data.wprdc.org resource 5202679a-… | `"subject" = 'Rodent Control'` (coords coarse/2-decimal in source) | 8,465 | 8,384 | 81 | 2015-04-30 – 2026-11-24 |
| New Orleans, LA | Socrata 2jgv-pqrq (historic 3iz8-nghx excluded — overlaps) | `request_type='Mosquito, Termite & Rodent Control' AND request_reason IN ('Rodent Complaint (Rats)','Rodent Complaint (Mice & Rats)')` | 6,519 | 6,497 | 22 | 2019-01-01 – 2026-11-23 |
| San Francisco, CA | Socrata vw6y-z8j6 (data.sf.gov) | `service_subtype IN ('Building - Infestation_Rodent_Insect','infestation_rodent_insect')` — combined rodent/insect category, labeled as such | 5,746 | 4,645 | 1,101 | 2010-01-26 – 2026-11-25 |
| Cincinnati, OH | Socrata gcej-gmiw | `sr_type_desc IN (12 verified values)` — see note below | 4,745 | 4,745 | 0 | 2006-09-13 – 2026-11-22 |
| Hartford, CT | ArcGIS utility.arcgis.com …/Service_Requests_2015_to_Current, layers 0–11 | `upper(USER_Record_Type) LIKE '%RODENT%'` | 2,070 | 2,035 | 35 | 2015-07-06 – 2026-11-02 |
| Norfolk, VA | Socrata nbyu-xjez (data.norfolk.gov) | `service_request_type IN ('Rat Observed','Potential Rat Harborage')` — address text only, **no coordinates** → CSV-only | 2,012 | 0 | 2,012 | 2019-10-02 – 2026-11-24 |

Cross-checks that passed: Chicago total vs independent count query (711,870 ± 1 live record), Detroit (27,177 exact), NYC current-era (245,735 exact), Buffalo (32,344 + 4,969 exact), NOLA (6,520 ± 1), Cincinnati (4,745 = sum of the 12 probed values).

**Cincinnati catch worth noting:** the original probe group-by capped at 500 distinct type values and found only 2 rodent values (294 records). A later `%RAT%` recount exposed 10 more genuine values ('RATS, IN A BUILDING' 2,056, etc.) → final 4,745. The filter is an explicit 12-value allowlist; substring traps (REGISTRATION 26,958, RESTORATION, OPERATING, REFRIGERATOR, GENERATOR, GRATE…) are excluded.

**Baltimore composition (important for the claim text):** 'SW-Rat Rubout Proactive' = 1,777,181 (94.5%) — city-initiated baiting visits Baltimore logs as 311 service requests; resident-initiated 'SW-Rat Rubout' = 102,422. Both counted, split visible in every breakdown, and the distinction is called out in the README, the app About, and the filter description. A precise `LIKE 'SW-Rat%'` filter is used (a broader `'%Rat%'` also catches 'TRC-Conduit Restoration').

## Cities investigated and skipped (verified reasons)

Dallas (only 'Registration' false positives), Seattle (no rodent type in Customer Service Requests), Columbus OH (no RAT/RODENT values in SWR_TYPE), Austin (only 'Administration' false positives), Los Angeles MyLA311 2023–2025 (no rodent requesttype), Nashville hubNashville (only Operating/Registration/Grate false positives), Denver (no rodent Type in any yearly 311 service 2008–2023), Minneapolis (no RODENT value in 311 subjects), Philadelphia (CARTO `public_cases_fc` has no rodent service_name; no `service_requests` table), San Antonio CKAN (no rodent type), Cambridge MA (free-text issue field), Providence (catalog hit is police arrests), Honolulu (matches are free-text only), Memphis (ArcGIS service returns 499 Token Required — not public), Houston CKAN (no 311 dataset), Milwaukee CKAN (no 311 dataset), Louisville CKAN (no usable dataset), San Diego (CKAN unreachable/no Get-It-Done dataset found), St. Louis / Fort Worth / Memphis-Socrata / Tulsa / Birmingham / Long Beach / San Jose / Oakland / Worcester / Richmond / Phoenix / Salt Lake City / Raleigh-Durham / Portland OR / Miami / New Haven (no dataset ID verifiable through this network — Socrata's federated catalog API returned empty/failed for these domains; noted as unverified rather than claimed either way).

## Deliverables & file inventory

- `pipeline/fetch.py` (adapters: Socrata with per-year windowing + no-coordinate fallback, CKAN SQL, ArcGIS with transfer-limit-aware paging + per-service layer plans, CARTO), `pipeline/cities.json` (19 source configs / 15 cities), `pipeline/probe.py` + `probe-results.json` (development verification artifacts).
- `data/` — 941 MB total: 66 JSON files (per-city points; Baltimore and Chicago split by year, all ≤ ~15 MB), `data/csv/` 75 files, 631 MB, **every file ≤ 25 MiB** (Baltimore's 2017–2026 yearly CSVs were re-chunked into ~120k-row parts after the fetch; row counts re-verified against summary), `data/summary.json` (per-city pulled/geocoded/missing, date ranges, original + standardized type breakdowns, by-year counts, populations, source links, filters, csv/points file manifests).
- `app/` — index.html, style.css, app.js (44 KB total).
- `README.md` — flagship-style: headline stats, quick start, real coverage table (with per-100k + methodology note), sources & filters table, methodology, data dictionary, limitations (incl. complaint ≠ population and the Baltimore proactive disclosure), repo layout, how to add a city. Screenshot line is a text placeholder (no fabricated image).

## App — upgrades implemented (steers 2 + 3)

- Heatmap/density toggle (canvas intensity raster colorized through a 7-stop palette) alongside points/cluster view; legends for both modes.
- Per-city complaints-per-year sparkline trends (from summary `by_year`, with peak year labeled).
- City comparison table: pulled / mapped / no-coords / date range / records per 100k residents (2020 Census populations stored per city in summary.json; labeled as reporting volume, not rat population).
- About-the-data panel: per-city official portal links + exact filters, "Data last fetched: 2026-11-27" chip, limitations callout.
- City list shows pulled · mapped · no-coords per city; CSV-only cities labeled.
- Design pass: coherent ink/paper/crimson/gold system, gradient header with live stat chips (cities / mapped / pulled / date span), card sections, pill controls, zebra comparison table, custom scrollbars, focus rings, mobile layout (map 58vh, panel below).
- Scale behavior: default selection = top 5 cities ≤ 400k points (245,968 points) so first paint is fast; Baltimore (1.88M points, 17 year-files ≈ 190 MB) and Chicago load on demand by checkbox. Canvas layer aggregates >50k visible points into labeled grid cells; popups work per point when zoomed in.

## Testing

- `node --check` on app.js: OK. `python3 -m py_compile` on fetch.py: OK. cities.json parses: OK.
- **Headless smoke test (Node, stubbed Leaflet/DOM, real data files): PASSED.** The app booted, loaded summary + the 5 default city files, and rendered: header chips "15 cities · 3,377,635 complaints mapped · 3,402,317 records pulled · 1999-11-29 → 2026-11-26"; selection summary "245,968 complaints selected" (= DC 114,945 + Boston 47,731 + Buffalo 35,939 + Detroit 27,177 + KC 20,176 — exact); 15 city rows; comparison table, trends, and About all populated. (In the stub, "0 in view" is expected — its fake pixel origin doesn't align with the app's Mercator projection; the counting path is what was being verified.)
- HTTP check via `python3 -m http.server` at repo root: `/app/index.html`, `/data/summary.json`, `/data/baltimore-2022.json` all 200 — relative `../data/` paths resolve as designed for GitHub Pages.
- No real-browser test was possible (no browser in this VM) — the parent may want one visual pass after Pages deployment.

## Incidents & honesty notes

- **Runtime restart during batch4:** the VM restarted while Buffalo was fetching (after Baltimore/Norfolk completed). summary.json is written once at the end of a run, so batch4's seven completed cities existed as data files but not in summary.json. Recovery: their summary entries were reconstructed from the pipeline's own DONE log lines (exact merged stats) + on-disk file manifests, with assertions that point-file row counts equal logged geocoded counts and CSV row counts equal logged pulled counts — all 7 passed. Buffalo was then fixed (its new dataset uses `createddate`) and Buffalo/Hartford/NYC-historic were fetched in a final run, which also re-stamped the summary. No number in the final summary comes from the reconstruction alone without a file-level cross-check.
- **Bugs found & fixed during the build:** (1) URL encoder left `&`/`<` raw → NYC/Chicago/NOLA queries corrupted (fixed: full percent-encoding); (2) ArcGIS paging stopped at the first short page on services that cap below the requested page size → DC initially truncated at 13,122, true total 114,945 (fixed: honor `exceededTransferLimit`); (3) NYC's dataset was split by the city in Dec 2025 (erm2-nwe9 now starts 2020) → historic dataset 76ig-c548 added, no overlap; (4) Baltimore's Socrata portal is retired (redirects to ArcGIS Hub) → found and used its ArcGIS FeatureServers.
- **Minor known mapping gaps in the current summary** (config already fixed for future runs; original types preserved everywhere, impact 340 records = 0.01%): Baltimore 'SW-Rat Rubout Alley Concern' (276) standardized via fallback to 'Other rodent complaint' instead of 'Rodent baiting / treatment'; NYC 'Rodent Bite - PCS Only' (64) → 'Other rodent complaint' instead of 'Rodent bite'.
- **Detroit scope note:** filter is `LIKE '%Rodent%'` (27,177, all 'Rodent Extermination'). A broader `'%Rat%'` count query timed out repeatedly at the source and could not be verified, so it was not used; if Detroit has additional 'Rat …' types, they are not included — stated here rather than guessed.
- **DC 2026 layer** ends 2026-05-01 in the source (their current-year layer state at fetch time); documented in README limitations.
- **Repo size warning for hosting:** ~941 MB of data. Every individual file is ≤ 25 MiB (GitHub's 100 MB/file hard limit is fine), but the total repo size may strain a plain GitHub repo/Pages deploy; if the parent hits limits, options are Git LFS for `data/csv/` or trimming CSVs — the app itself only needs `data/*.json` + `summary.json` (~310 MB).

## Claim assets for the parent

- Suggested claim summary line: "15 cities · 3,402,317 real 311 records pulled from official city APIs (3,377,635 mapped) · full history 1999–2026 · interactive map with points + heatmap, city/date filters, per-year trends, city comparison, and full per-city CSV downloads · reproducible one-command pipeline".
- Still needed from parent: GitHub repo creation + Pages hosting, screenshot for the README placeholder and the claim, claim submission (needs Muiz's confirmation + ~$0.02 gas).

---

## Round 3 — three jurisdictions added (2026-11-28)

Scope: 18 → **21 jurisdictions** (20 cities + 1 county), approved by Muiz. Local-only build; publishing is the parent agent's step.

### New totals (recomputed from the build)

| | Pulled | Mapped |
|---|---:|---:|
| Atlas total (21 jurisdictions) | 3,474,748 | 3,449,581 (99.3%) |
| Atlas, citizen-filed basis | 1,697,242 | 1,673,034 |
| Denver, CO (new) | 1,536 | 1,231 |
| Prince George's County, MD (new) | 1,179 | 1,037 |
| Berkeley, CA (new) | 25 | 25 |

City sums reconcile exactly with the headline totals; per-city point-file row counts equal the mapped counts and CSV row counts equal the pulled counts for all three new jurisdictions.

### What was added

- **Denver, CO** (ArcGIS, org `zdB7qR0BtYrg0Xpl`): yearly archive tables `311_Service_Requests_<year>` 2007–2023 (table 0) + the rolling-12-months table `ODC_service_requests_311` (table 53), merged under one slug. Only the five exact controlled `Case_Summary` values: 'Rat Problems' 293, 'Mice Problems' 1, 'EQ - Rats' 184, 'Rats' 671, 'Rats & Mice' 387. The combined 'Cockroaches, rodents, maggots, ants, spiders, fleas' category was NOT included. **Gap disclosed:** no queryable Denver source covers Jan 2024 – Nov 2025 (2024 AGOL item not exposed; rolling table covers only the last 12 months) — stated in COVERAGE.md, README limitations, and the claim text. Pipeline support added: `exact_types` in `normalize()` — Denver's SQL matching is case-insensitive, so rows are kept only when the stored value matches the allowlist exactly; this excluded 22 case-variant records ('rats' ×21, 'RATS' ×1). Dedupe: each yearly table's system ObjectId is unique within its table and the tables cover disjoint periods. Denver is resident-filed 311 and counts in full toward the citizen totals.
- **Berkeley, CA** (Socrata `p88g-6gs2`): `case_request = 'Vector Control'` — a **combined** vector category (rodents + mosquitoes + other vectors), labeled combined in the filter text, COVERAGE.md, README, and claim text, mirroring San Francisco's combined-category labeling. 25 records, all with coordinates, 2026-01-24 → 2026-06-24 (the category exists only from 2026). Deduplicated on `case_id` (25 → 25, no duplicates).
- **Prince George's County, MD** (Socrata `y8p6-7ur2`, County Click 311 / QAlert): `service_name IN ('Rodents' 65, 'Infestation of Bugs and/or Rodents' 1,114)` — the second is a **combined** bugs-and-rodents category, labeled combined everywhere. 1,179 pulled / 1,037 mapped, 2012-07-12 → 2016-08-13. **Historical series, disclosed:** QAlert ended in 2016 and the successor Motorola datasets publish no rodent category. Deduplicated on `service_request_id` (1,179 → 1,179, no duplicates). It is a county — headline wording changed from "cities" to "jurisdictions" in the app header chip, compare table, COVERAGE.md, README, and claim title.
- Pipeline: Socrata adapter gained `dedupe_on` support (field added to the `$select`, first row kept per id — mirrors the ArcGIS adapter). `pipeline/resident_split.py` re-run (Baltimore split unchanged: 145,183 resident-filed / 1,777,181 proactive).
- Docs/app updated: COVERAGE.md regenerated (new NOTES for the three jurisdictions + "jurisdictions" wording), README (stats, coverage table +3 rows, sources table +3 rows, Denver removed from the excluded-cities list with the re-audit noted, limitations extended), SUBMIT.md (new title/totals + round-3 paragraph), app header chip "21 jurisdictions", sidebar "Cities & counties", "By jurisdiction", compare-table "Jurisdiction". `claim-image.png` regenerated from the updated app.

### Deviations from the round-3 probe numbers (both are probe-side counting artifacts; the build follows the atlas's own rules)

1. **Denver pulled: probe 1,423 → build 1,536 (+113).** The probe counted 'Rats' only for 2020 onward, assuming era-exclusive labels. The stored data also carries the exact value 'Rats' in 2015 (2), 2016 (29), and 2019 (82) — genuine in-year records with the exact allowlisted value, so they are included. All other category counts match the probe exactly. (The probe's ArcGIS group-by counts also folded case variants; measured exactly, the source holds 22 additional case-variant rows — 'rats'/'RATS' — which the exact-match rule excludes.)
2. **Denver mapped: probe 1,370 → build 1,231 (−139).** The probe counted records with non-null Latitude/Longitude as "with coordinates". Denver's archive stores **0,0 placeholder coordinates** on 252 of the kept records (plus 53 with null coordinates = 305 unmapped). A 0,0 point is not a real location (it plots off West Africa), and the atlas's rule for every jurisdiction is that only real published coordinates map — so placeholders count as missing, exactly like nulls. Reconciliation, verified against the live API: raw case-insensitive set 1,558 = 53 null + 256 zero + 1,249 valid; minus the 22 excluded case variants (18 valid + 4 zero) = 1,536 pulled / 1,231 mapped / 305 missing. Exact.
3. Berkeley (25/25) and Prince George's County (1,179/1,037) match the probe numbers exactly, including date ranges.

## Round-3 correction addendum (2026-11-28, post-integration audit)

A full re-audit of every point and CSV row (all 21 jurisdictions) found two
source-data defects, both verified against the live source APIs:

1. **Buffalo — 191 records with latitude/longitude interchanged in the
   source.** Buffalo's May 2024–present dataset (3tj7-3tdz) stores
   `latitude` = −78.8… and `longitude` = 42.9… for 191 'Rodent Control
   Issue' records (verified directly against data.buffalony.gov). The
   interchange is unambiguous, so the 191 records were restored to the
   evident order in `data/buffalo.json` and `data/csv/buffalo.csv`.
   Counts unchanged (35,939 mapped / 37,313 pulled). Disclosed in
   COVERAGE.md's Buffalo note.
2. **Denver — 1 record with longitude = latitude in the source**
   (39.74159382, 39.74159382; 24 Mar 2023, verified against Denver's
   ArcGIS 2023 table, the only Longitude > 0 rodent record there). Not a
   real location: kept in the CSV, excluded from the map, counted as
   unmapped. Denver mapped 1,231 → 1,230; atlas mapped 3,449,581 →
   3,449,580; unmapped 25,167 → 25,168. Disclosed in COVERAGE.md's
   Denver note.

Also verified and left as published (source's own data, disclosed in
COVERAGE.md): Kansas City's legacy system assigns one placeholder
coordinate pair to 353 rodent records (40,610 records of all types share
it); Washington DC (30) and Evanston (4) carry a handful of
source-published outlier coordinates. Post-correction audit: zero swapped
coordinates, zero invalid latitudes in any CSV, per-city point/CSV rows
reconcile exactly with summary.json.

---

## Addendum — 28 Nov 2026 (2): map rendering defect found and fixed

A user video showed the complaint dots staying behind on screen when
the map was panned: after dragging, clusters sat over the wrong part of
the world (e.g. US cities floating over the Atlantic/Africa), and after
zooming, points could land off-canvas and disappear. Root cause was in
the custom canvas layer in `app/app.js`: points were drawn with a
hand-rolled Web-Mercator projection that subtracted
`map.getPixelOrigin()`. That origin already includes the map pane
position, so the math was correct only in the initial view (pane
position zero); after any pan or zoom re-base, every point drifted by
exactly the pan/zoom offset. Reproduced headlessly with the verbatim
layer code against Leaflet-rendered ground-truth markers (dots glued at
load, separated by the full drag vector after one pan).

Fix: the canvas is pinned to `containerPointToLayerPoint([0, 0])` and
points are now drawn at `latLngToLayerPoint(p) - topLeft` — one
consistent coordinate frame for canvas position, drawing, heat view,
and click hit-testing. Verified on the real app (headless Chromium,
data subset): pans in all four directions plus a diagonal at zoom 0,
zooms 4 → 6 → 8 → 10 → 12 and back, with reference complaints from the
Boston, San Francisco and Washington DC datasets checked pixel-wise at
their exact projected coordinates after every step — all matched; at
zoom 12, clicking a Boston dot opens that exact complaint's popup
(2012-03-29, Rodent Activity). The underlying data was never affected:
the defect was purely in display projection after interaction, and the
initial view (as in the claim screenshot) was always correct.

## Addendum — 28 Nov 2026 (3): rendering performance, zoom animation, city labels

A second user video showed zooming feeling heavy with visible frame
drops on a phone, the aggregate balls and their count labels not
following the zoom animation, and city names not readable on the map
itself.

Performance: the previous draw path rebuilt an array of record objects
for the whole selection and re-iterated it with per-point allocations
on every redraw. Measured on the real app with Baltimore (1,921,638
mapped points) plus the default cities loaded: redraw 0.83–2.37 s per
pan/zoom. The draw path was rebuilt around a per-city spatial leaf-cell
index over Web-Mercator world-fraction coordinates (cells of at most
2,500 points; indices grouped citizen-first and date-sorted inside each
cell, so any filter combination resolves to at most two contiguous
ranges per cell). A redraw now touches only cells intersecting the
view; leaf cells that are small on screen contribute precomputed
statistics to the aggregate grid without iterating their points. Same
setup after the rebuild: redraw 1–30 ms. One-time cost: indexing a
city happens once when it is first loaded; the default first view
(five mid-size cities) is unaffected.

Zoom animation: the canvas layer now carries Leaflet's
leaflet-zoom-animated class and handles the zoomanim event with the
same transform Leaflet applies to its own layers, so the balls and
their count labels scale together with the map during an animated
zoom instead of sitting still and snapping at zoomend. Verified
headlessly: computed canvas transform scale 1.73 mid zoom-in (110 ms
into the 250 ms transition) and 0.60 mid zoom-out, back to identity
after each redraw; end-state positions re-verified with the pan/zoom
pixel-check protocol and a zoom-12 popup check after the change.

City labels: each selected jurisdiction's name is now drawn on the
canvas at its point centroid (zoom 9 and below), largest first,
skipping any label that would overlap one already placed, and clamped
inside the canvas edge — the basemap does not label every jurisdiction
at these zooms.

Also: the city-comparison table (490 px wide) now scrolls horizontally
inside its card instead of forcing the 344 px side panel wider.

Phone layout check: at a 360 px mobile viewport the layout stacks as
designed (map first, 46vh, panels below, no horizontal page overflow).
The squeezed side-by-side appearance in the user video is the
browser's forced desktop-site mode (layout viewport ≈ 980 px), which a
page cannot override from inside; the app-side overflow that made that
mode look worse (the comparison table) is fixed above.
