#!/usr/bin/env python3
"""Post-process data/summary.json: add resident-vs-proactive splits.

Only Baltimore's source data explicitly separates city-initiated proactive
work from resident-filed cases (via SRType). For Baltimore:
  citizen   = 'SW-Rat Rubout' + 'SW-Rat Rubout Follow-up' + 'HCD-Rodents'
  proactive = 'SW-Rat Rubout Proactive'
  other     = the two 'SW-Rat Rubout Alley Concern' types
Pulled counts come from the summary's own per-type breakdown; mapped counts
are recomputed by scanning the city's point files (type_original is index 3).
Also writes summary.total_citizen_pulled / total_citizen_geocoded (cities
without a split count in full, since their categories are resident-filed).
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(os.path.dirname(HERE), "data")

CITIZEN = ["SW-Rat Rubout", "SW-Rat Rubout Follow-up", "HCD-Rodents"]
PROACTIVE = ["SW-Rat Rubout Proactive"]


def points_files(entry):
    if entry.get("points_files"):
        return [f["file"] for f in entry["points_files"]]
    if entry.get("points_file"):
        return [entry["points_file"]]
    return []


def main():
    path = os.path.join(DATA, "summary.json")
    with open(path) as fh:
        summary = json.load(fh)
    for entry in summary["cities"]:
        if entry["slug"] != "baltimore" or "error" in entry:
            continue
        types = entry["types_original"]
        citizen_pulled = sum(types.get(t, 0) for t in CITIZEN)
        proactive_pulled = sum(types.get(t, 0) for t in PROACTIVE)
        other_pulled = entry["pulled"] - citizen_pulled - proactive_pulled
        citizen_geo = proactive_geo = 0
        for fname in points_files(entry):
            with open(os.path.join(DATA, fname)) as fh:
                pts = json.load(fh)
            for p in pts:
                if p[3] in CITIZEN:
                    citizen_geo += 1
                elif p[3] in PROACTIVE:
                    proactive_geo += 1
        entry["resident"] = {
            "citizen_types": CITIZEN,
            "citizen_pulled": citizen_pulled,
            "citizen_geocoded": citizen_geo,
            "proactive_pulled": proactive_pulled,
            "proactive_geocoded": proactive_geo,
            "other_pulled": other_pulled,
            "note": ("Resident-filed = 'SW-Rat Rubout' complaints, their "
                     "follow-up visits, and 'HCD-Rodents' housing complaints. "
                     "Proactive = 'SW-Rat Rubout Proactive' baiting/inspection "
                     "rounds initiated by the city itself. Other = the two "
                     "'Alley Concern' types."),
        }
        print("baltimore resident split:", entry["resident"])
    total_cp = total_cg = 0
    for entry in summary["cities"]:
        if "error" in entry:
            continue
        if "resident" in entry:
            total_cp += entry["resident"]["citizen_pulled"]
            total_cg += entry["resident"]["citizen_geocoded"]
        else:
            total_cp += entry["pulled"]
            total_cg += entry["geocoded"]
    summary["total_citizen_pulled"] = total_cp
    summary["total_citizen_geocoded"] = total_cg
    with open(path, "w") as fh:
        json.dump(summary, fh, indent=1)
    print("totals: pulled", summary["total_pulled"], "geocoded",
          summary["total_geocoded"], "| citizen pulled", total_cp,
          "citizen geocoded", total_cg, "| cities", summary["city_count"])


if __name__ == "__main__":
    main()
