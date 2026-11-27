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
