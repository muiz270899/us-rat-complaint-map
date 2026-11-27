#!/usr/bin/env python3
"""Generate COVERAGE.md at the project root from data/summary.json.

Every number in the document comes from the summary the pipeline produced;
the per-city inclusion-rule notes below are the human documentation layer.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA = os.path.join(ROOT, "data")

NOTES = {
    "baltimore": (
        "Two filters on the same services. (1) `SRType LIKE 'SW-Rat%'` — the "
        "Rat Rubout program. Most of these records are **'SW-Rat Rubout "
        "Proactive'**: baiting/inspection rounds initiated by the city "
        "itself, which Baltimore logs as 311 service requests. The "
        "resident-initiated complaint type is 'SW-Rat Rubout', plus its "
        "follow-ups. (2) `SRType = 'HCD-Rodents'` — resident-filed rodent "
        "complaints taken by Housing & Community Development code "
        "enforcement. **This category was missed by the original SW-Rat-only "
        "filter and is added in this revision.** Resident-filed total = "
        "SW-Rat Rubout + SW-Rat Rubout Follow-up + HCD-Rodents; the app's "
        "'Citizen reports only' toggle and the comparison table show both "
        "counts side by side. Dates use the record creation date."),
    "chicago": (
        "Current system (2019– ): `sr_type = 'Rodent Baiting/Rat Complaint'`. "
        "Historical archive (to 2018-12-18): the dedicated rodent-baiting "
        "dataset, same category. The two sources are stitched without "
        "overlap (current system starts 2019-02-25). A 311 rodent-baiting "
        "request is a resident-filed service request; the baiting is the "
        "city's response."),
    "new-york": (
        "`complaint_type = 'Rodent'` in both the 2010–2019 archive and the "
        "2020–present dataset (NYC split its 311 dataset in Dec 2025; no "
        "overlap). The original descriptor is preserved per record: Rat "
        "Sighting, Condition Attracting Rodents, Signs of Rodents, Mouse "
        "Sighting, Rodent Bite. Unlike some compilations, mouse sightings "
        "are kept but always labeled as their own descriptor/standard type."),
    "washington-dc": (
        "`SERVICECODEDESCRIPTION = 'Rodent Inspection and Treatment'` "
        "exactly, across the yearly layers. 'Rat Replacement Containers' is "
        "a trash-can program and is excluded. The category is the service "
        "the city performs on rodent cases; the source does not separate "
        "resident-filed from city-initiated cases, so no resident split is "
        "shown. The 2026 layer ended 2026-05-01 in the source at fetch "
        "time."),
    "boston": (
        "`type LIKE '%Rodent%'` in each yearly 311 file 2011–2026 (in "
        "practice the single value 'Rodent Activity')."),
    "buffalo": (
        "`type = 'Rodents (Req_Serv)'` in the July 2008 – May 2024 dataset "
        "and `type = 'Rodent Control Issue'` in its May 2024–present "
        "successor; the two are stitched without overlap."),
    "detroit": (
        "`request_type LIKE '%Rodent%'` in Improve Detroit issues — in "
        "practice the single value 'Rodent Extermination'. Requests are "
        "resident-filed; extermination is the city's response service."),
    "kansas-city": (
        "Historic system (2007 – Mar 2021): `type IN ('Rat Treatment','Rat "
        "Control and Treatment','Rodent')`. Current system: "
        "`issue_sub_type = 'Rats'`. Treatment types are resident-requested "
        "services — the request is the complaint, the treatment is the "
        "response."),
    "pittsburgh": (
        "`subject = 'Rodent Control'` exactly. Substring lookalikes "
        "('Catch Basins, Grates and Sewers', 'Operating Without a License', "
        "…) were audited and excluded. Coordinates are rounded by the "
        "source for some records."),
    "new-orleans": (
        "`request_type = 'Mosquito, Termite & Rodent Control'` AND "
        "`request_reason IN ('Rodent Complaint (Rats)','Rodent Complaint "
        "(Mice & Rats)')`. The same dataset's 'Non-Rodent Complaint' "
        "reasons are excluded. Only the current system (2019– ) is used; "
        "the historic 2012–2018 system's records were migrated into it "
        "with new dates, which would corrupt the timeline."),
    "cincinnati": (
        "`sr_type_desc IN (…)` — 12 values verified one by one from the "
        "dataset's own type list (RATS, IN A BUILDING; RATS, OUTSIDE A "
        "BUILDING; FOOD OPERATION, RODENTS; …). Substring lookalikes "
        "(REGISTRATION, RESTORATION, OPERATING, REFRIGERATOR, GENERATOR) "
        "were deliberately excluded."),
    "san-francisco": (
        "`service_subtype IN ('Building - Infestation_Rodent_Insect', "
        "'infestation_rodent_insect')` — San Francisco's combined "
        "rodent/insect building-infestation category. It is labeled as a "
        "combined category everywhere it appears; the city publishes no "
        "rodent-only building category."),
    "hartford": (
        "`upper(USER_Record_Type) LIKE '%RODENT%'` across the yearly "
        "layers — values: 'External Rodent Complaint' and its older "
        "path-style equivalent. These are externally (resident) reported "
        "complaints by definition."),
    "somerville": (
        "`type LIKE '%Rodent%' OR type = 'Rats'`. **This dataset publishes "
        "no coordinate columns at all**, so Somerville's records are "
        "CSV-only: counted in every total, absent from the map. No "
        "coordinates were invented or geocoded from addresses."),
    "norfolk": (
        "`service_request_type IN ('Rat Observed','Potential Rat "
        "Harborage')`. **This dataset publishes street-address text only, "
        "no coordinate columns**, so Norfolk's records are CSV-only, "
        "exactly as with Somerville."),
    "cambridge": (
        "`issue_type = 'Rodent Sighting'` exactly — the formal rodent "
        "category of Cambridge's Commonwealth Connect (SeeClickFix) feed. "
        "The same feed carries thousands of free-text one-off ticket "
        "titles (residents can title tickets freely); those are not a "
        "category and are excluded, even when a title mentions rats."),
    "evanston": (
        "`Title IN ('Dead Rodent-Rat','Rodents- Rats')` in the city's "
        "historical 311 archive (2013–2022; the archive ends 2022-02-22 "
        "and the city publishes no successor archive, so Evanston cannot "
        "support a present-day trend). **The layer repeats each request "
        "roughly twice** (8,625 rows for 4,169 requests); rows are "
        "deduplicated on the city request ID, keeping the earliest record "
        "per request. The deduplicated count was cross-checked against an "
        "independent distinct-ID count of the layer."),
    "baton-rouge": (
        "`type = 'RODENT'` exactly, in the East Baton Rouge Parish "
        "Mosquito & Rodent Control call-in log — resident service requests "
        "phoned in to the parish program. 'MOSQUITO' requests and the "
        "joint 'BOTH' (mosquito + rodent) category are excluded. The "
        "program is parish-wide: about 89% of RODENT records are in Baton "
        "Rouge proper; the rest are in parish communities (Baker, "
        "Zachary, Central, Greenwell Springs, Pride). The dataset's "
        "caller-name fields are never selected by the pipeline — only "
        "date, type and the published point location are pulled."),
}


def fmt(n):
    return f"{n:,}"


def main():
    with open(os.path.join(DATA, "summary.json")) as fh:
        summary = json.load(fh)
    cities = [c for c in summary["cities"] if "error" not in c]
    cities.sort(key=lambda c: -c["pulled"])
    fetched = (summary.get("generated_utc") or "")[:10]
    tp = summary["total_pulled"]
    tg = summary["total_geocoded"]
    lines = []
    lines.append("# Coverage — US 311 Rat & Rodent Complaint Atlas")
    lines.append("")
    lines.append(f"Snapshot assembled {fetched} by re-running the project's "
                 f"open pipeline (`pipeline/fetch.py`) against each city's "
                 f"official open-data API. Dates below are the first and last "
                 f"qualifying records in each published source; a city may "
                 f"have internal gaps. Every count is recomputable from the "
                 f"CSVs in `data/csv/` and the statistics in "
                 f"`data/summary.json`.")
    lines.append("")
    lines.append("| City | First record | Latest record | Records | Mapped | "
                 "Unmapped | Resident-filed |")
    lines.append("|---|---|---|---:|---:|---:|---:|")
    for c in cities:
        res = fmt(c["resident"]["citizen_pulled"]) if "resident" in c else "—"
        lines.append(
            f"| {c['city']}, {c['state']} | {c['date_min']} | "
            f"{c['date_max']} | {fmt(c['pulled'])} | {fmt(c['geocoded'])} | "
            f"{fmt(c['missing_coords'])} | {res} |")
    lines.append(
        f"| **Total — {summary['city_count']} cities** | | | "
        f"**{fmt(tp)}** | **{fmt(tg)}** | "
        f"**{fmt(summary['total_missing_coords'])}** | "
        f"**{fmt(summary.get('total_citizen_pulled', tp))}** |")
    lines.append("")
    lines.append("“Resident-filed” is shown only where the source data itself "
                 "separates resident-filed cases from city-initiated proactive "
                 "work (Baltimore). For all other cities the 311 categories "
                 "are resident-filed requests; some categories name the "
                 "inspection or treatment the city performs in response to "
                 "the request.")
    lines.append("")
    lines.append("## Sources and inclusion rules")
    lines.append("")
    for c in cities:
        lines.append(f"**{c['city']}, {c['state']}** — "
                     f"[{c['source_name']}]({c['source_url']})")
        lines.append("")
        note = NOTES.get(c["slug"], c.get("filter", ""))
        lines.append(note)
        lines.append("")
        lines.append(f"Filter as configured: `{c['filter']}`")
        lines.append("")
    lines.append("## Counting rules that apply everywhere")
    lines.append("")
    lines.append("- Coordinates are exactly what the source publishes. This "
                 "project never geocodes addresses and never invents map "
                 "points; records without coordinates are counted, kept in "
                 "the CSVs, and left off the map.")
    lines.append("- The original city classification is preserved verbatim "
                 "on every record (`type_original`), next to one of ten "
                 "standardized categories.")
    lines.append("- Era changes inside a city's 311 system (NYC 2025, "
                 "Buffalo 2024, Chicago 2018/19) are stitched from "
                 "non-overlapping sources so no record is double-counted.")
    lines.append("- Complaint volume measures *reporting*, not rat "
                 "populations: it also reflects 311 accessibility, public "
                 "awareness, and whether a city runs proactive programs.")
    out = os.path.join(ROOT, "COVERAGE.md")
    with open(out, "w") as fh:
        fh.write("\n".join(lines) + "\n")
    print("wrote", out, f"({len(lines)} lines)")


if __name__ == "__main__":
    main()
