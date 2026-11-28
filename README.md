# US 311 Rat & Rodent Complaint Map

**Every rat and rodent complaint filed with municipal 311 systems across the United States — pulled directly from official municipal open-data portals, standardized, and consolidated into one interactive map and one open dataset.**

| | |
|---|---|
| **Jurisdictions covered** | 21 (20 cities + Prince George's County, MD) |
| **Records pulled** | 3,474,748 |
| **Complaints mapped** | 3,449,580 (99.3% of records carry coordinates) |
| **Historical span** | 1999 – 2026 |
| **Data last fetched** | 2026-11-28 |
| **Sources** | Official municipal open-data APIs only (Socrata, CKAN, ArcGIS) — no scraping, no resellers |

> **Read this first:** complaint volume does **not** necessarily reflect actual rat population sizes. It also reflects how easy each city makes it to file a 311 complaint, public awareness, whether the city runs proactive inspection programs, and how each city classifies rodent cases. This dataset measures *reporting*, not rats. See [Limitations](#limitations).

*Screenshots: to be added from the live deployment — the app itself is in [`app/`](app/) and runs locally in one step, below.*

---

## Quick start

```bash
# 1. Serve the folder (any static host works, including GitHub Pages)
python3 -m http.server 8000

# 2. Open the app
#    http://localhost:8000/app/
```

The app is fully static — no build step, no backend. It reads `data/summary.json` and the per-city point files beside it.

To rebuild the entire dataset from the official sources:

```bash
python3 pipeline/fetch.py        # that is the whole pipeline — one command
```

The pipeline is config-driven (`pipeline/cities.json`), idempotent, and re-runnable end-to-end from a clean checkout. It refreshes every city, rewrites every output file, and re-stamps the fetch date.

---

## Coverage

Every count below is the number of records actually pulled from the jurisdiction's own API on the fetch date — nothing is estimated or extrapolated. "No coords" records are real complaints whose source records carry no usable coordinates; they are included in the CSVs and in every total, and excluded only from the map itself.

| Baltimore, MD | 1,922,689 | 1,921,638 | 1,051 | 2010-01-01 – 2026-11-25 | 328,267 |
| Chicago, IL | 711,869 | 711,440 | 429 | 1999-11-29 – 2026-11-26 | 25,920 |
| New York, NY | 517,619 | 514,277 | 3,342 | 2010-01-01 – 2026-11-25 | 5,879 |
| Washington, DC | 114,945 | 114,945 | 0 | 2013-05-23 – 2026-05-01 | 16,670 |
| Boston, MA | 48,172 | 47,731 | 441 | 2012-01-02 – 2026-11-10 | 7,130 |
| Buffalo, NY | 37,313 | 35,939 | 1,374 | 2008-07-29 – 2026-11-26 | 13,405 |
| Detroit, MI | 27,177 | 27,177 | 0 | 2017-06-14 – 2026-11-25 | 4,252 |
| Kansas City, MO | 20,177 | 20,176 | 1 | 2007-01-04 – 2026-11-20 | 3,971 |
| Baton Rouge, LA | 18,345 | 18,325 | 20 | 2019-02-07 – 2026-11-25 | 8,065 |
| Somerville, MA | 14,810 | 0 | 14,810 | 2015-07-04 – 2026-11-23 | 18,274 |
| Pittsburgh, PA | 8,465 | 8,384 | 81 | 2015-04-30 – 2026-11-24 | 2,794 |
| New Orleans, LA | 6,519 | 6,497 | 22 | 2019-01-01 – 2026-11-23 | 1,698 |
| San Francisco, CA | 5,746 | 4,645 | 1,101 | 2010-01-26 – 2026-11-25 | 657 |
| Cambridge, MA | 5,166 | 5,166 | 0 | 2016-01-07 – 2026-11-23 | 4,363 |
| Cincinnati, OH | 4,745 | 4,745 | 0 | 2006-09-13 – 2026-11-22 | 1,535 |
| Evanston, IL | 4,169 | 4,168 | 1 | 2014-01-09 – 2022-02-22 | 5,337 |
| Hartford, CT | 2,070 | 2,035 | 35 | 2015-07-06 – 2026-11-02 | 1,710 |
| Norfolk, VA | 2,012 | 0 | 2,012 | 2019-10-02 – 2026-11-24 | 845 |
| Denver, CO | 1,536 | 1,230 | 306 | 2007-03-15 – 2026-11-19 | 211 |
| Prince George's County, MD | 1,179 | 1,037 | 142 | 2012-07-12 – 2016-08-13 | 122 |
| Berkeley, CA | 25 | 25 | 0 | 2026-01-24 – 2026-06-24 | 20 |
| **Total** | **3,474,748** | **3,449,580** | **25,167** | **1999 – 2026** | |

\* Records per 100,000 residents, using 2020 US Census city-proper populations. This normalizes *reporting volume* — it is **not** a rat-population figure. Baltimore's outsized rate is explained in [Limitations](#limitations): most of its records are the city's own proactive Rat Rubout baiting visits, which Baltimore logs as 311 service requests.

Two jurisdictions (Somerville, Norfolk) publish no coordinates at all in their 311 data. Their records are included in full in the CSVs and totals, and are labeled CSV-only in the app. Two of the newest series are historical or gapped — Prince George's County's data ends in 2016 and Denver has no queryable source for Jan 2024 – Nov 2025; both are disclosed in [Limitations](#limitations) and in [`COVERAGE.md`](COVERAGE.md).

---

## The app

`app/` is a dependency-light static web app (Leaflet + OpenStreetMap tiles via CDN, everything else hand-rolled vanilla JS):

- **Points & heatmap views** — a canvas renderer draws individual complaints when zoomed in and density-aggregated cells when zoomed out, so cities with 100k+ points stay fluid; a heat/density toggle renders the same selection as a colorized density surface.
- **Filters** — toggle any combination of the 21 jurisdictions; custom start/end dates.
- **Point popups** — city, date, the city's *original* complaint type, the standardized type, and status.
- **Selection summary** — live totals for the current filter, broken down by city and by standardized complaint type.
- **Jurisdiction comparison table** — records vs mapped vs missing-coordinate counts, % mapped, year range, resident-filed counts (where the source separates them), and records per 100k residents for every jurisdiction.
- **“Citizen reports only” toggle** — Baltimore logs its proactive Rat Rubout baiting rounds as 311 records; the toggle re-counts and re-maps everything using resident-filed cases only (Baltimore: *SW-Rat Rubout* + follow-ups + *HCD-Rodents* = 145,183 of its 1,922,689 records), with both totals shown side by side.
- **Per-city trends** — complaints-per-year sparkline for every city, from the full history.
- **About the data panel** — every source linked to its official portal page, the exact filter used per city, the fetch date, and the limitations.
- **CSV export** — download exactly the current selection (cities + dates) as CSV, including latitude and longitude for every record. Full per-city CSVs (all records, including non-geocoded ones) are linked in the app and live in [`data/csv/`](data/csv/).

---

## Data sources & filters

Each city was verified by hand against its official portal: the exact dataset, the exact field that classifies complaints, and the exact values that genuinely denote rat/rodent cases. Substring lookalikes were audited and excluded everywhere (e.g. *Registration*, *Restoration*, *Operating*, *Refrigerator*, *Generator*, *Grates* are not rodent complaints). The machine-readable source of truth is [`pipeline/cities.json`](pipeline/cities.json); the app's About panel shows the same information per city.

| City | Portal / dataset | Rat filter (on the city's own classification) |
|---|---|---|
| Baltimore, MD | ArcGIS — 311 Customer Service Requests, yearly layers 2004–2022 + annual services 2023–2026 | `SRType LIKE 'SW-Rat%'` (Rat Rubout, incl. proactive rounds) + `SRType = 'HCD-Rodents'` (resident housing complaints) |
| Chicago, IL | Socrata `v6vf-nfxy` (2019– ) + `97t6-zrhs` (historical, –2018) | `sr_type = 'Rodent Baiting/Rat Complaint'` |
| New York, NY | Socrata `erm2-nwe9` (2020– ) + `76ig-c548` (2010–2019) | `complaint_type = 'Rodent'`; original type = descriptor |
| Washington, DC | ArcGIS — 311 City Service Requests, yearly layers 2009–2026 | `SERVICECODEDESCRIPTION = 'Rodent Inspection and Treatment'` |
| Boston, MA | CKAN — 311 Service Requests, yearly files 2011–2026 | `type LIKE '%Rodent%'` (in practice: 'Rodent Activity') |
| Buffalo, NY | Socrata `whkc-e5vr` (2008–May 2024) + `3tj7-3tdz` (May 2024– ) | `type = 'Rodents (Req_Serv)'` / `'Rodent Control Issue'` |
| Detroit, MI | ArcGIS — Improve Detroit Issues | `request_type LIKE '%Rodent%'` (all: 'Rodent Extermination') |
| Kansas City, MO | Socrata `7at3-sxhp` (2007–2021) + `d4px-6rwg` (current) | `type IN ('Rat Treatment','Rat Control and Treatment','Rodent')`; `issue_sub_type = 'Rats'` |
| Somerville, MA | Socrata `4pyi-uqq6` | `type LIKE '%Rodent%' OR type = 'Rats'` |
| Pittsburgh, PA | CKAN (WPRDC) — Pittsburgh 311, combined file | `subject = 'Rodent Control'` |
| New Orleans, LA | Socrata `2jgv-pqrq` | `request_type = 'Mosquito, Termite & Rodent Control'` AND `request_reason IN ('Rodent Complaint (Rats)','Rodent Complaint (Mice & Rats)')` |
| San Francisco, CA | Socrata `vw6y-z8j6` (311 Cases) | `service_subtype IN ('Building - Infestation_Rodent_Insect','infestation_rodent_insect')` |
| Cincinnati, OH | Socrata `gcej-gmiw` | `sr_type_desc IN (…)` — 12 verified rat/rodent values, enumerated in `cities.json` |
| Hartford, CT | ArcGIS — Service Requests 2015 to Current, yearly layers | `upper(USER_Record_Type) LIKE '%RODENT%'` |
| Norfolk, VA | Socrata `nbyu-xjez` | `service_request_type IN ('Rat Observed','Potential Rat Harborage')` |
| Baton Rouge, LA | Socrata `bktv-u9ua` — East Baton Rouge Parish Mosquito & Rodent Service Requests | `type = 'RODENT'` ('MOSQUITO' and joint 'BOTH' excluded) |
| Cambridge, MA | Socrata `2z9k-mv9g` — Commonwealth Connect (SeeClickFix) | `issue_type = 'Rodent Sighting'` |
| Evanston, IL | ArcGIS — 311 Service Requests 2013 to 2022 (historical archive) | `Title IN ('Dead Rodent-Rat','Rodents- Rats')`, deduplicated on request ID |
| Denver, CO | ArcGIS — 311 Service Requests, yearly archive tables 2007–2023 + rolling-12-months table | `Case_Summary IN ('Rat Problems','Mice Problems','EQ - Rats','Rats','Rats & Mice')` — exact values only (see COVERAGE.md) |
| Berkeley, CA | Socrata `p88g-6gs2` — 311 Cases | `case_request = 'Vector Control'` — **combined** vector category (rodents + mosquitoes + other vectors), labeled combined |
| Prince George's County, MD | Socrata `y8p6-7ur2` — County Click 311 (QAlert) | `service_name IN ('Rodents','Infestation of Bugs and/or Rodents')` — the second is a **combined** bugs-and-rodents category, labeled combined |

Cities investigated and **excluded** because no genuine, separable rat/rodent category exists in their public 311 data (or the data is not openly queryable): Dallas, Seattle, Columbus, Austin, Los Angeles, Nashville, Minneapolis, Philadelphia, San Antonio, Providence, Honolulu, Memphis (token-secured service), Houston, Milwaukee, Louisville, San Diego. Excluding them is deliberate: padding the jurisdiction count with non-rodent data would make the dataset less reliable, not more comprehensive. In this revision Dallas and Philadelphia were re-checked and remain excluded (Dallas has no rodent category — only 'registration' substring matches; Philadelphia's 311 feed offers only combined 'Infestation' services that do not name rodents), while Cambridge, MA — previously listed here — was re-audited and **included** after its formal 'Rodent Sighting' category was verified. In the latest round Denver, CO — also previously listed here — was re-audited and **included**: its yearly archive tables do expose exact controlled rodent categories after all. Two further jurisdictions were added in the same round: Berkeley, CA (combined vector-control category, labeled combined, 2026 only) and Prince George's County, MD — a county, not a city — whose rodent series is historical (2012–2016).

---

## Methodology

1. **Discovery & verification.** For each candidate city, the portal's own catalog/API was queried for 311 datasets; the classification field's distinct values were enumerated and read by a human reviewer to identify the values that genuinely denote rat/rodent cases — including historical renames and era changes (e.g. NYC's December 2025 dataset split, Buffalo's May 2024 system change, Chicago's 2018/2019 system change), which are stitched together without overlap.
2. **Extraction.** Full history, all years, paged through each API (Socrata `$limit`/`$offset`, CKAN `datastore_search_sql`, ArcGIS `resultOffset` with transfer-limit handling). Counts were cross-checked against independent `count(*)` queries before and after pulling.
3. **Standardization.** Every record is normalized to: `date` (ISO), `latitude`, `longitude`, `type_original` (the city's own classification, **always preserved verbatim**), `type_standard` (one of ten shared categories: Rat sighting · Mouse sighting · Rodent activity / signs · Rodent infestation · Rodent baiting / treatment · Rodent inspection · Dead rodent removal · Conditions attracting rodents · Rodent bite · Other rodent complaint), `status`, and `source`.
4. **Geocoding honesty.** Coordinates are exactly what the source publishes — this project does **not** geocode addresses itself and never invents locations. Records whose source has no usable coordinates are counted as "no coords" per city, kept in the CSVs, and left off the map.
5. **Accounting.** For every city the pipeline records pulled vs geocoded vs missing-coordinate counts, the observed date range, the full per-type breakdown (original and standardized), and per-year counts. Those figures populate `data/summary.json`, the table above, and the app — one set of numbers, everywhere.

### Data dictionary

Per-city point files (`data/<city>.json`, or `data/<city>-<year>.json` for the largest cities) are compact arrays:

```json
[latitude, longitude, "YYYY-MM-DD", "type_original", "type_standard", "status"]
```

Consolidated CSVs (`data/csv/`, one or more files per city, each ≤ 20 MB) have one row per pulled record — including records without coordinates:

```
city,state,date,latitude,longitude,type_original,type_standard,status,source
```

`data/summary.json` carries the per-city coverage statistics, type breakdowns, per-year counts, source links, filters, and the fetch timestamp.

---

## Limitations

- **Complaints ≠ rat population.** Reporting propensity, 311 accessibility, awareness campaigns, and classification practices differ by city and over time. Cross-city comparisons measure reporting systems as much as rodents.
- **Baltimore is a special case.** 1,777,181 of Baltimore's 1,922,689 records (92%) are `SW-Rat Rubout Proactive` — baiting/inspection visits initiated by the city itself under its Rat Rubout program and logged as 311 service requests. They are genuine records from Baltimore's official 311 dataset and are counted, but they are **not** resident complaints. Resident-filed Baltimore cases total **145,183**: the `SW-Rat Rubout` complaint type (102,422), its follow-ups (750), and `HCD-Rodents` housing complaints (42,011 — a category the original version of this atlas missed and this revision adds). The app's “Citizen reports only” toggle shows the whole atlas on the resident-filed basis; the distinction is never hidden.
- **Category heterogeneity.** Cities classify differently: San Francisco's category is a combined rodent/insect building-infestation type; Detroit's is extermination requests; DC's is inspection-and-treatment orders. The original classification is preserved on every record precisely so these differences stay visible.
- **Missing coordinates.** 25,167 records (0.7%) have no usable coordinates in their source data, including all records from Somerville and Norfolk, whose portals publish no coordinate fields. They are in the CSVs and totals, not on the map. Denver stores placeholder 0,0 coordinates on 252 records; those count as missing too.
- **Coordinate precision varies.** Some portals publish full-precision coordinates; Pittsburgh's are rounded by the source (block-level approximations). Points show where the *source* locates the complaint.
- **Source snapshots change.** Cities edit and re-publish their datasets; a re-run may produce slightly different historical counts. Washington DC's 2026 layer, for example, ended at 2026-05-01 in the source at fetch time.
- **Duplicates across eras were avoided by construction** (non-overlapping date ranges per source), but a single real-world incident can legitimately generate multiple 311 requests in any city's system.
- **Two coverage caveats added in this revision.** Evanston's only published 311 archive ends 2022-02-22 and repeats each request roughly twice in the raw layer; records are deduplicated on the city request ID (8,625 rows → 4,169 requests). Baton Rouge's dataset is the East Baton Rouge *Parish* mosquito & rodent control log: ~89% of its rodent records are in Baton Rouge proper, the rest in parish communities (Baker, Zachary, Central, Greenwell Springs).
- **Three jurisdictions added in the latest round, each with a caveat.** Denver's series has a **gap from Jan 2024 to Nov 2025**: the city exposes yearly archive tables through 2023 and a rolling table covering only the last 12 months, and no queryable source covers the months between. Prince George's County's series is **historical** — its QAlert-based County Click 311 data ends in Aug 2016 and its successor systems publish no rodent category — so the county cannot support a present-day trend. Berkeley's 'Vector Control' category is **combined** (rodents, mosquitoes and other vectors; the rodent share cannot be separated) and exists only from 2026; it is labeled combined everywhere, as is Prince George's County's 'Infestation of Bugs and/or Rodents' category and San Francisco's combined category.

---

## Repository layout

```
app/                  the static web app (index.html, style.css, app.js)
data/                 generated dataset — do not edit by hand
  <city>.json         geocoded points per city (largest cities split by year)
  csv/                full consolidated CSVs per city (all records)
  summary.json        coverage statistics, breakdowns, sources, fetch date
pipeline/
  fetch.py            the pipeline (Socrata / CKAN / ArcGIS adapters)
  cities.json         per-city endpoints, fields, filters, standard mappings
  resident_split.py   Baltimore resident-filed vs proactive split + citizen totals
  make_coverage.py    regenerates COVERAGE.md from data/summary.json
  probe.py            endpoint-verification helper used during development
README.md             this file
COVERAGE.md           per-jurisdiction coverage: source, filter, date range, counts
```

## Adding a city

Add an entry to `pipeline/cities.json` (adapter, endpoint, field mapping, verified rat filter, standard-type mapping, 2020 Census population) and re-run `python3 pipeline/fetch.py`. The summary, app, and CSVs pick it up automatically.

## Attribution

Complaint data © the respective cities and counties, published through their official open-data portals (linked per jurisdiction above) under their open-data terms. Basemap © OpenStreetMap contributors. Populations: US Census Bureau, 2020 Census. This project consolidates and documents the data; it does not alter the underlying records.
