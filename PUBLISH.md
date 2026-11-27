# Publish manifest — rat-map revision (2026-11-27)

Target repo: https://github.com/muiz270899/us-rat-complaint-map
Live app: https://muiz270899.github.io/us-rat-complaint-map/app/

**Status: NOT yet published.** The working tree in `~/workspace/poidh-rat-map/`
is complete and verified locally (18 cities; 3,472,008 records pulled;
3,447,288 mapped; 80 CSVs, every one ≤ 20 MB). This VM has no git/GitHub
auth, so the upload happens from a browser session signed in to GitHub.
Repo paths below are relative to the repository root, which mirrors this
folder's layout. Every file in the upload list is ≤ 25 MB, so the GitHub
web uploader works for all of them (the largest single file is
`data/csv/baltimore-2020-part1.csv` at 19,499,988 bytes).

## (a) UPLOAD / REPLACE — 65 files

### New files (16)

| Repo path | Bytes | Notes |
|---|---:|---|
| `COVERAGE.md` | 16,017 | Per-city coverage documentation (generated from `data/summary.json` by `pipeline/make_coverage.py`) |
| `SUBMIT.md` | 4,043 | Exact claim title/description for the 29 Nov submission + reference numbers |
| `PUBLISH.md` | — (this file) | This manifest |
| `claim-image.png` | 1,333,218 | Claim image — screenshot of the revised app (upload to poidh with the claim; commit it too) |
| `data/baton-rouge.json` | 1,314,999 | New city: 18,325 mapped points |
| `data/cambridge.json` | 401,757 | New city: 5,166 mapped points |
| `data/evanston.json` | 324,604 | New city: 4,168 mapped points (deduplicated) |
| `data/csv/baton-rouge.csv` | 2,765,431 | New city: 18,345 rows |
| `data/csv/cambridge.csv` | 804,782 | New city: 5,166 rows |
| `data/csv/evanston.csv` | 724,965 | New city: 4,169 rows |
| `data/csv/baltimore-2015-part1.csv` | 19,499,963 | Re-split of the former `baltimore-2015.csv` (was 25,610,116 B, over the web-UI limit) |
| `data/csv/baltimore-2015-part2.csv` | 6,110,231 | Re-split of the former `baltimore-2015.csv` |
| `data/csv/baltimore-2016-part1.csv` | 19,499,804 | Re-split of the former `baltimore-2016.csv` (was 25,903,628 B, over the web-UI limit) |
| `data/csv/baltimore-2016-part2.csv` | 6,403,902 | Re-split of the former `baltimore-2016.csv` |
| `pipeline/resident_split.py` | 3,493 | Post-processing: Baltimore resident/proactive split → `summary.json` |
| `pipeline/make_coverage.py` | 11,444 | Generates `COVERAGE.md` from `summary.json` |

### Replace files (49) — same repo path, new content

| Repo path | Bytes | What changed |
|---|---:|---|
| `README.md` | 16,307 | 18 cities, new totals, regenerated coverage table, Baltimore split + new-city sources, CSV size limit now ≤ 20 MB |
| `app/index.html` | 5,677 | New "Counting mode" section with the Citizen reports only toggle; comparison-table footnote |
| `app/app.js` | 26,600 | Citizen-mode filtering, header stats + mode note, citizen labels, comparison-table columns, COVERAGE.md link, `?citizen=1` deep link |
| `app/style.css` | 10,974 | Toggle + mode-note styles |
| `data/summary.json` | 34,890 | Regenerated: 18 cities, totals 3,472,008 pulled / 3,447,288 mapped, Baltimore `resident` split, Baltimore `csv_files` listing updated for the re-split |
| `data/baltimore-2010.json` | 1,974,675 | Rewritten — now includes the 42,011 HCD-Rodents records |
| `data/baltimore-2011.json` | 3,973,715 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2012.json` | 3,039,887 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2013.json` | 4,146,986 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2014.json` | 7,379,664 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2015.json` | 11,396,947 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2016.json` | 11,528,499 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2017.json` | 13,033,318 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2018.json` | 16,930,567 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2019.json` | 14,569,782 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2020.json` | 12,072,629 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2021.json` | 15,884,468 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2022.json` | 13,794,298 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2023.json` | 13,698,379 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2024.json` | 15,109,347 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2025.json` | 12,033,376 | Rewritten (HCD-Rodents included) |
| `data/baltimore-2026.json` | 15,685,878 | Rewritten (HCD-Rodents included) |
| `data/csv/baltimore-2010.csv` | 4,532,192 | Rewritten with HCD-Rodents rows |
| `data/csv/baltimore-2011.csv` | 8,978,752 | Rewritten with HCD-Rodents rows |
| `data/csv/baltimore-2012.csv` | 6,916,804 | Rewritten with HCD-Rodents rows |
| `data/csv/baltimore-2013.csv` | 9,381,223 | Rewritten with HCD-Rodents rows |
| `data/csv/baltimore-2014.csv` | 16,569,701 | Rewritten with HCD-Rodents rows |
| `data/csv/baltimore-2017-part1.csv` | 19,499,951 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2017-part2.csv` | 9,539,681 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2018-part1.csv` | 19,499,974 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2018-part2.csv` | 18,151,253 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2019-part1.csv` | 19,499,795 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2019-part2.csv` | 12,891,937 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2020-part1.csv` | 19,499,988 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2020-part2.csv` | 7,358,901 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2021-part1.csv` | 19,499,839 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2021-part2.csv` | 15,857,309 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2022-part1.csv` | 19,499,969 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2022-part2.csv` | 11,196,171 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2023-part1.csv` | 19,499,805 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2023-part2.csv` | 10,975,347 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2024-part1.csv` | 19,499,910 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2024-part2.csv` | 14,091,004 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2025-part1.csv` | 19,499,827 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2025-part2.csv` | 7,260,547 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2026-part1.csv` | 19,499,820 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `data/csv/baltimore-2026-part2.csv` | 15,378,412 | Re-split at ≤ 19.5 MB per part (row stream unchanged — same rows, same order) + HCD-Rodents rows |
| `pipeline/cities.json` | 25,291 | Added entries: Baltimore HCD-Rodents, Cambridge, Evanston, Baton Rouge |
| `pipeline/fetch.py` | 18,618 | ArcGIS `dedupe_on` support; Socrata GeoJSON point-column coordinate handling |

Total upload size: 609,687,537 bytes across the 64 sized files above, plus this manifest.

## (b) DELETE from the repo — 3 files

These exist in the repo today but no longer exist in the local tree;
delete them (GitHub web UI: open the file → `…` → Delete file), or the
repo will keep stale duplicates next to the re-split parts:

| Repo path | Why |
|---|---|
| `data/csv/baltimore-2015.csv` | Replaced by `baltimore-2015-part1.csv` + `baltimore-2015-part2.csv` |
| `data/csv/baltimore-2016.csv` | Replaced by `baltimore-2016-part1.csv` + `baltimore-2016-part2.csv` |
| `data/csv/.gitkeep/.gitkeep` | Leftover placeholder artifact from the original upload; no local counterpart |

After the upload + deletes, the repo holds exactly 80 CSVs in
`data/csv/`, matching `data/summary.json` and SUBMIT.md.

## (c) Post-publish verification

After uploading, re-check the live app (GitHub Pages may take a few
minutes to rebuild):

1. Open https://muiz270899.github.io/us-rat-complaint-map/app/ — the
   header must read exactly:
   **"18 cities · 3,447,288 complaints mapped · 3,472,008 records pulled"**
2. Open the same URL with `?citizen=1` — the header must switch to the
   citizen-filed totals (1,670,741 mapped of 1,694,502 pulled).
3. Spot-check the archive: `data/csv/` in the repo lists 80 files;
   `baltimore-2015.csv` and `baltimore-2016.csv` are gone, and
   `baltimore-2015-part1.csv` / `baltimore-2016-part1.csv` are present.

## Not uploaded

- `claim-screenshot.png` — stale screenshot of the pre-revision app, kept
  locally only; superseded by `claim-image.png`.
- `BUILD-REPORT.md` — already in the repo and unchanged.
- All other `data/*.json` point files, `data/csv/*.csv` files for the
  other 14 cities, `pipeline/probe.py`, and `pipeline/probe-results.json`
  are unchanged and already in the repo.
