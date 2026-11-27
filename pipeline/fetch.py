#!/usr/bin/env python3
"""US 311 Rat Complaint Map -- data pipeline.

Fetches rat/rodent complaints directly from public municipal 311 open-data
APIs, standardizes them, and writes:
  data/<slug>.json        compact geocoded points [lat,lng,date,type_original,type_standard,status]
  data/csv/<slug>*.csv    full consolidated records (split by year when large)
  data/summary.json       per-city totals, type breakdowns, coverage, limitations

Transport: curl via subprocess (this VM's python HTTP stack fails through the
egress proxy; curl works). Re-running this script refreshes all data.

Usage:  python3 fetch.py [--only slug,slug] [--config cities.json]
"""
import argparse
import csv
import io
import json
import os
import subprocess
import sys
import time
import urllib.parse
from datetime import datetime, timezone

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_DIR = os.path.join(ROOT, "data")
CSV_DIR = os.path.join(DATA_DIR, "csv")
PAGE = 50000
CSV_SPLIT_BYTES = 20 * 1024 * 1024

STANDARD_TYPES = [
    "Rat sighting",
    "Mouse sighting",
    "Rodent activity / signs",
    "Rodent infestation",
    "Rodent baiting / treatment",
    "Rodent inspection",
    "Dead rodent removal",
    "Conditions attracting rodents",
    "Rodent bite",
    "Other rodent complaint",
]


def log(*a):
    print(time.strftime("%H:%M:%S"), *a, flush=True)


def curl(url, timeout=300):
    """GET via curl; returns body text or raises."""
    for attempt in range(3):
        p = subprocess.run(
            ["curl", "-sL", "--fail", "--max-time", str(timeout), url],
            capture_output=True, text=True, timeout=timeout + 30,
        )
        if p.returncode == 0 and p.stdout:
            return p.stdout
        log("  curl retry", attempt, "rc", p.returncode, url[:110])
        time.sleep(2 + attempt * 2)
    raise RuntimeError(f"curl failed: {url[:160]}")


def curl_json(url, timeout=300):
    return json.loads(curl(url, timeout))


def q(s):
    """Percent-encode a query value. Everything except ':' and ',' is
    encoded — a raw '&' or '<' in a WHERE clause corrupts the request."""
    return urllib.parse.quote(str(s), safe=":,")


# ---------------------------------------------------------------- adapters
def fetch_socrata(cfg):
    f = cfg["fields"]
    select = ",".join({f["date"], f["lat"], f["lng"], f["type"], f["status"]}.difference({""}))
    base = f"https://{cfg['domain']}/resource/{cfg['dataset']}.json"
    rows = []

    def page(where, tag):
        offset = 0
        while True:
            url = (f"{base}?$select={select}&$where={q(where)}"
                   f"&$limit={PAGE}&$offset={offset}&$order={q(':id')}")
            batch = curl_json(url)
            rows.extend(batch)
            log(f"  {cfg['slug']} {tag} offset {offset}: +{len(batch)} (total {len(rows)})")
            if len(batch) < PAGE:
                break
            offset += PAGE
            time.sleep(0.4)

    split = cfg.get("split_years")
    try:
        if split:
            # huge datasets page far faster inside one-year windows
            fld = split["field"]
            for year in range(split["from"], split["to"] + 1):
                w = (f"{cfg['where']} AND {fld} >= '{year}-01-01T00:00:00.000' "
                     f"AND {fld} < '{year + 1}-01-01T00:00:00.000'")
                page(w, str(year))
        else:
            page(cfg["where"], "")
    except RuntimeError:
        # dataset may publish no latitude/longitude columns at all:
        # retry without them; every record then counts as missing coordinates
        if not f.get("lat"):
            raise
        log(f"  {cfg['slug']}: retrying without coordinate columns")
        cfg = dict(cfg)
        cfg["fields"] = dict(f, lat="", lng="")
        return fetch_socrata(cfg)
    return rows


def fetch_ckan(cfg):
    """CKAN datastore_search_sql paging. cfg['resources'] = list of resource ids
    (e.g. one per year); cfg['where'] is a SQL WHERE fragment with {col} quoting
    already applied by the config author."""
    f = cfg["fields"]
    cols = ", ".join(f'"{f[k]}"' for k in ("date", "lat", "lng", "type", "status"))
    rows = []
    for rid in cfg["resources"]:
        offset = 0
        while True:
            sql = (f'SELECT {cols} FROM "{rid}" WHERE {cfg["where"]} '
                   f"ORDER BY \"{f['date']}\" LIMIT {PAGE} OFFSET {offset}")
            url = f"{cfg['base']}/api/3/action/datastore_search_sql?sql={q(sql)}"
            d = curl_json(url)
            batch = d["result"]["records"]
            rows.extend(batch)
            log(f"  {cfg['slug']} {rid[:8]} offset {offset}: +{len(batch)} (total {len(rows)})")
            if len(batch) < PAGE:
                break
            offset += PAGE
            time.sleep(0.4)
    return rows


def fetch_arcgis(cfg):
    """ArcGIS FeatureServer layer/table paging. Geometry in 4326 is requested
    so coordinates are lon/lat even for projected services; tables without
    geometry can instead name Latitude/Longitude attribute fields."""
    f = cfg["fields"]
    out = {f["date"], f["type"], f["status"]}
    if f.get("lat") not in (None, "", "__lat"):
        out.add(f["lat"])
        out.add(f["lng"])
    out_fields = ",".join(out - {""})
    rows = []
    if cfg.get("service_layers"):
        plans = [(s, ls) for s, ls in cfg["service_layers"]]
    else:
        plans = [(s, cfg["layers"]) for s in (cfg.get("services") or [cfg["service"]])]
    for service, layers in plans:
        for layer in layers:
            offset = 0
            while True:
                url = (f"{service}/{layer}/query?where={q(cfg['where'])}"
                       f"&outFields={out_fields}&returnGeometry=true&outSR=4326"
                       f"&resultOffset={offset}&resultRecordCount=2000"
                       f"&orderByFields={q(f['date'])}&f=json")
                d = curl_json(url)
                feats = d.get("features", [])
                for ft in feats:
                    a = dict(ft.get("attributes", {}))
                    g = ft.get("geometry") or {}
                    a["__lat"] = g.get("y")
                    a["__lng"] = g.get("x")
                    rows.append(a)
                log(f"  {cfg['slug']} {service.rsplit('/', 1)[-1]} L{layer} "
                    f"offset {offset}: +{len(feats)} (total {len(rows)})")
                if not feats:
                    break
                offset += len(feats)
                # some servers cap pages below the requested 2000; only stop
                # on a short page when the server says nothing more is waiting
                if len(feats) < 2000 and not d.get("exceededTransferLimit"):
                    break
                time.sleep(0.3)
    return rows


def fetch_carto(cfg):
    f = cfg["fields"]
    cols = ", ".join({f["date"], f["lat"], f["lng"], f["type"], f["status"]} - {""})
    rows = []
    offset = 0
    while True:
        sql = (f"SELECT {cols} FROM {cfg['table']} WHERE {cfg['where']} "
               f"ORDER BY {f['date']} LIMIT {PAGE} OFFSET {offset}")
        url = f"{cfg['base']}/api/v2/sql?q={q(sql)}"
        d = curl_json(url)
        batch = d.get("rows", [])
        rows.extend(batch)
        log(f"  {cfg['slug']} offset {offset}: +{len(batch)} (total {len(rows)})")
        if len(batch) < PAGE:
            break
        offset += PAGE
        time.sleep(0.4)
    return rows


ADAPTERS = {
    "socrata": fetch_socrata,
    "ckan": fetch_ckan,
    "arcgis": fetch_arcgis,
    "carto": fetch_carto,
}


# ------------------------------------------------------------- normalize
def norm_date(v):
    if v is None:
        return ""
    if isinstance(v, (int, float)):  # ArcGIS epoch ms
        try:
            return datetime.fromtimestamp(v / 1000, tz=timezone.utc).strftime("%Y-%m-%d")
        except Exception:
            return ""
    s = str(v).strip()
    if not s:
        return ""
    return s[:10]


def norm_coord(v):
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if f == 0:
        return None
    return round(f, 5)


def normalize(cfg, raw):
    f = cfg["fields"]
    smap = cfg.get("standard_map", {})
    points = []          # geocoded: [lat, lng, date, type_orig, type_std, status]
    all_rows = []        # every pulled record (for CSV), same fields, coords may be ""
    missing = 0
    type_counts = {}
    std_counts = {}
    year_counts = {}
    dmin, dmax = None, None
    for r in raw:
        date = norm_date(r.get(f["date"]))
        if len(date) >= 4 and date[:4].isdigit():
            year_counts[date[:4]] = year_counts.get(date[:4], 0) + 1
        t_orig = str(r.get(f["type"]) or "").strip()
        if not t_orig and cfg.get("type_fallback"):
            t_orig = cfg["type_fallback"]
        t_std = smap.get(t_orig, "Other rodent complaint")
        status = str(r.get(f["status"]) or "").strip()
        if cfg["adapter"] == "arcgis" and f.get("lat") == "__lat":
            lat = norm_coord(r.get("__lat"))
            lng = norm_coord(r.get("__lng"))
        else:
            lat = norm_coord(r.get(f["lat"]))
            lng = norm_coord(r.get(f["lng"]))
        type_counts[t_orig] = type_counts.get(t_orig, 0) + 1
        std_counts[t_std] = std_counts.get(t_std, 0) + 1
        if date:
            dmin = date if dmin is None or date < dmin else dmin
            dmax = date if dmax is None or date > dmax else dmax
        if lat is None or lng is None:
            missing += 1
            all_rows.append(["", "", date, t_orig, t_std, status])
        else:
            points.append([lat, lng, date, t_orig, t_std, status])
            all_rows.append([lat, lng, date, t_orig, t_std, status])
    points.sort(key=lambda p: p[2])
    all_rows.sort(key=lambda p: p[2])
    return points, all_rows, {
        "pulled": len(raw),
        "geocoded": len(points),
        "missing_coords": missing,
        "date_min": dmin,
        "date_max": dmax,
        "types_original": dict(sorted(type_counts.items(), key=lambda kv: -kv[1])),
        "types_standard": dict(sorted(std_counts.items(), key=lambda kv: -kv[1])),
        "by_year": dict(sorted(year_counts.items())),
    }


def write_city(cfg, points, all_rows):
    slug = cfg["slug"]
    # Points JSON: one file, or split by year when the city is very large
    # (keeps every file comfortably hostable, e.g. on GitHub Pages).
    json_info = {}
    if len(points) <= 200000:
        path = os.path.join(DATA_DIR, f"{slug}.json")
        with open(path, "w") as fh:
            json.dump(points, fh, separators=(",", ":"))
        json_info["points_file"] = f"{slug}.json"
        json_info["points_bytes"] = os.path.getsize(path)
    else:
        by_year = {}
        for p in points:
            by_year.setdefault(p[2][:4] or "unknown", []).append(p)
        parts = []
        total_bytes = 0
        for year in sorted(by_year):
            path = os.path.join(DATA_DIR, f"{slug}-{year}.json")
            with open(path, "w") as fh:
                json.dump(by_year[year], fh, separators=(",", ":"))
            size = os.path.getsize(path)
            total_bytes += size
            parts.append({"file": f"{slug}-{year}.json",
                          "rows": len(by_year[year]), "bytes": size})
        json_info["points_files"] = parts
        json_info["points_bytes"] = total_bytes
    # CSV: one file, or split by year if it would exceed the split threshold
    def csv_bytes(rows):
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["city", "state", "date", "latitude", "longitude",
                    "type_original", "type_standard", "status", "source"])
        for lat, lng, date, t_o, t_s, status in rows:
            w.writerow([cfg["city"], cfg["state"], date, lat, lng, t_o, t_s,
                        status, cfg["source_name"]])
        return buf.getvalue()

    files = []
    whole = csv_bytes(all_rows)
    if len(whole.encode()) <= CSV_SPLIT_BYTES:
        path = os.path.join(CSV_DIR, f"{slug}.csv")
        with open(path, "w") as fh:
            fh.write(whole)
        files.append({"file": f"csv/{slug}.csv", "rows": len(all_rows),
                      "bytes": len(whole.encode())})
    else:
        by_year = {}
        for row in all_rows:
            by_year.setdefault(row[2][:4] or "unknown", []).append(row)
        for year in sorted(by_year):
            part = csv_bytes(by_year[year])
            path = os.path.join(CSV_DIR, f"{slug}-{year}.csv")
            with open(path, "w") as fh:
                fh.write(part)
            files.append({"file": f"csv/{slug}-{year}.csv",
                          "rows": len(by_year[year]), "bytes": len(part.encode())})
    return files, json_info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default=os.path.join(HERE, "cities.json"))
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    with open(args.config) as fh:
        cities = json.load(fh)["cities"]
    only = {s.strip() for s in args.only.split(",") if s.strip()}
    os.makedirs(CSV_DIR, exist_ok=True)
    summary_path = os.path.join(DATA_DIR, "summary.json")
    summary = {"generated_utc": datetime.now(timezone.utc).isoformat(),
               "cities": []}
    if os.path.exists(summary_path) and only:
        with open(summary_path) as fh:
            old = json.load(fh)
        summary["cities"] = [c for c in old.get("cities", [])
                              if c["slug"] not in only]
    # group config entries by slug: a city may have several sources
    # (e.g. a historical dataset plus the current one) that must merge
    grouped = {}
    order = []
    for cfg in cities:
        if cfg["slug"] not in grouped:
            grouped[cfg["slug"]] = []
            order.append(cfg["slug"])
        grouped[cfg["slug"]].append(cfg)
    for slug in order:
        if only and slug not in only:
            continue
        cfgs = grouped[slug]
        head = cfgs[0]
        all_points, all_rows_all = [], []
        merged = {"pulled": 0, "geocoded": 0, "missing_coords": 0,
                  "date_min": None, "date_max": None,
                  "types_original": {}, "types_standard": {}, "by_year": {}}
        failed = []
        for cfg in cfgs:
            log("FETCH", cfg["city"], cfg["state"], "via", cfg["adapter"],
                cfg.get("dataset") or cfg.get("table") or "")
            try:
                raw = ADAPTERS[cfg["adapter"]](cfg)
            except Exception as e:
                log("ERROR", slug, e)
                failed.append(str(e)[:200])
                continue
            points, all_rows, stats = normalize(cfg, raw)
            all_points.extend(points)
            all_rows_all.extend(all_rows)
            for k in ("pulled", "geocoded", "missing_coords"):
                merged[k] += stats[k]
            for src, dst in (("types_original", "types_original"),
                             ("types_standard", "types_standard"),
                             ("by_year", "by_year")):
                for kk, vv in stats[src].items():
                    merged[dst][kk] = merged[dst].get(kk, 0) + vv
            if stats["date_min"] and (merged["date_min"] is None or stats["date_min"] < merged["date_min"]):
                merged["date_min"] = stats["date_min"]
            if stats["date_max"] and (merged["date_max"] is None or stats["date_max"] > merged["date_max"]):
                merged["date_max"] = stats["date_max"]
        if failed and not all_points and merged["pulled"] == 0:
            summary["cities"].append({"city": head["city"], "state": head["state"],
                                      "slug": slug, "error": "; ".join(failed)})
            continue
        all_points.sort(key=lambda p: p[2])
        all_rows_all.sort(key=lambda p: p[2])
        files, json_info = write_city(head, all_points, all_rows_all)
        entry = {
            "city": head["city"], "state": head["state"], "slug": slug,
            "source_name": " + ".join(c["source_name"] for c in cfgs),
            "source_url": head["source_url"],
            "dataset": ", ".join(filter(None, (c.get("dataset") or c.get("table") or "" for c in cfgs))),
            "filter": " | ".join(c["filter_description"] for c in cfgs),
            "population_2020_census": head.get("population_2020_census"),
            **merged,
            **json_info,
            "csv_files": files,
        }
        if failed:
            entry["source_errors"] = failed
        summary["cities"].append(entry)
        log("DONE", slug, merged)
    summary["cities"].sort(key=lambda c: -c.get("geocoded", 0))
    summary["total_pulled"] = sum(c.get("pulled", 0) for c in summary["cities"])
    summary["total_geocoded"] = sum(c.get("geocoded", 0) for c in summary["cities"])
    summary["total_missing_coords"] = sum(c.get("missing_coords", 0) for c in summary["cities"])
    summary["city_count"] = len([c for c in summary["cities"] if "error" not in c])
    with open(summary_path, "w") as fh:
        json.dump(summary, fh, indent=1)
    log("SUMMARY", summary["city_count"], "cities,",
        summary["total_pulled"], "pulled,", summary["total_geocoded"], "geocoded")


if __name__ == "__main__":
    main()
