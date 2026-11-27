#!/usr/bin/env python3
"""Probe candidate city open-data portals for a genuine rat/rodent 311 category.

Uses curl via subprocess (this VM's python HTTP stack fails through the proxy).
Writes probe-results.json next to this file. Every match is reviewed by a human
before it goes into cities.json -- substring traps (e.g. 'rat' inside
'Operating' or 'Grates') are rejected by the RAT_WORDS allowlist logic below.
"""
import json
import re
import subprocess
import sys
import time

OUT = {}
OUT_PATH = "probe-results.json"

RAT_EXACT = {
    "rat", "rats", "rodent", "rodents", "rat complaint", "rat complaints",
    "rat sighting", "rat sightings", "rodent sighting", "rodent complaints",
    "rat problem", "rodent problem", "rat infestation", "rodent infestation",
    "rat control", "rodent control", "rat baiting", "rodent baiting",
    "dead rat", "dead rodent", "rat removal", "rodent removal",
    "rat droppings", "rodent activity", "rodent inspection",
    "rodent inspections", "rodent abatement", "rat abatement",
}


def is_rat_value(v):
    if v is None:
        return False
    s = str(v).strip().lower()
    if "rodent" in s:
        return True
    if s in RAT_EXACT:
        return True
    # 'rat' as a standalone word, not inside other words
    if re.search(r"(?<![a-z])rats?(?![a-z])", s):
        return True
    return False


def curl(url, timeout=50):
    for attempt in range(2):
        try:
            p = subprocess.run(
                ["curl", "-sL", "--max-time", str(timeout), url],
                capture_output=True, text=True, timeout=timeout + 15,
            )
            if p.returncode == 0 and p.stdout:
                return p.stdout
        except Exception:
            pass
        time.sleep(1.0)
    return None


def curl_json(url, timeout=50):
    raw = curl(url, timeout)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except Exception:
        return None


def save():
    with open(OUT_PATH, "w") as f:
        json.dump(OUT, f, indent=1)


def socrata_type_probe(domain, dsid, label):
    """Find type-like fields in a Socrata dataset and count rat values."""
    meta = curl_json(f"https://{domain}/api/1/metastore/schemas/dataset/items/{dsid}")
    fields = []
    if meta and "resource" in meta:
        fields = [c["fieldName"] for c in meta["resource"].get("columns", [])]
    if not fields:
        rec = curl_json(f"https://{domain}/resource/{dsid}.json?$limit=1")
        if rec:
            fields = list(rec[0].keys())
    type_fields = [f for f in fields if re.search(
        r"type|category|categ|service|subject|reason|desc|request", f, re.I)]
    found = []
    for tf in type_fields[:6]:
        url = (f"https://{domain}/resource/{dsid}.json?$select={tf},count(*)"
               f"&$group={tf}&$limit=500")
        rows = curl_json(url, timeout=60)
        if not rows:
            continue
        for r in rows:
            v = r.get(tf)
            if is_rat_value(v):
                found.append({"field": tf, "value": v, "count": int(r["count"])})
        time.sleep(0.4)
    return {"domain": domain, "dataset": dsid, "label": label,
            "fields": fields, "rat_matches": found}


def socrata_catalog(domain, queries=("311", "service requests")):
    ids = []
    for q in queries:
        d = curl_json(
            f"https://api.us.socrata.com/api/catalog/v1?domains={domain}"
            f"&q={q.replace(' ', '%20')}&only=datasets&limit=10")
        if d:
            for r in d.get("results", []):
                rid = r["resource"]["id"]
                name = r["resource"]["name"]
                if rid not in [i[0] for i in ids]:
                    ids.append((rid, name))
        time.sleep(0.4)
    return ids


SOCRATA_KNOWN = [
    # (city, domain, dataset_id, label) -- from the original candidate list
    ("Chicago", "data.cityofchicago.org", "v6vf-nfxy", "311 Service Requests (current)"),
    ("Baltimore", None, None, None),
    ("New Orleans", "data.nola.gov", None, None),
    ("Cincinnati", "data.cincinnati-oh.gov", "gcej-gmiw", "Cincinnati 311"),
    ("Kansas City", "data.kcmo.org", "d4px-6rwg", "311 Call Center Reported Issues"),
    ("Kansas City (historic)", "data.kcmo.org", "7at3-sxhp", "311 SR 2007-Mar 2021"),
    ("Buffalo", "data.buffalony.gov", None, None),
    ("Austin", "data.austintexas.gov", None, None),
    ("Hartford", "data.hartford.gov", None, None),
    ("Cambridge MA", "data.cambridgema.gov", "2z9k-mv9g", "Commonwealth Connect SR"),
    ("Somerville MA", "data.somervillema.gov", "4pyi-uqq6", "311 Service Requests"),
    ("Sacramento", "data.cityofsacramento.org", None, None),
    # expansion list
    ("Dallas", "dallasopendata.com", None, None),
    ("Seattle", "data.seattle.gov", None, None),
    ("Cleveland", "data.clevelandohio.gov", None, None),
    ("Miami-Dade", "data.miamidade.gov", None, None),
    ("Providence RI", "data.providenceri.gov", None, None),
    ("New Haven CT", "data.newhavenct.gov", None, None),
    ("Honolulu", "data.honolulu.gov", "6hui-dvrh", "Honolulu 311 Reports"),
    ("Honolulu (HNL)", "data.honolulu.gov", "jdy7-ftwe", "HNL 311 Reports"),
    ("Fort Worth", "data.fortworthtexas.gov", None, None),
    ("Memphis", "data.memphistn.gov", None, None),
    ("Nashville", "data.nashville.gov", None, None),
    ("Tulsa", "data.cityoftulsa.org", None, None),
    ("Norfolk VA", "data.norfolk.gov", "nbyu-xjez", "MyNorfolk"),
    ("Birmingham AL", "data.birminghamal.gov", None, None),
    ("San Diego", "data.sandiego.gov", None, None),
    ("Oakland CA", "data.oaklandca.gov", "quth-gb8e", "OAK 311 Call Center"),
    ("Long Beach CA", "data.longbeach.gov", None, None),
    ("San Jose", "data.sanjoseca.gov", None, None),
    ("St. Louis", "data.stlouis-mo.gov", None, None),
    ("Detroit", "data.detroitmi.gov", None, None),
]

DOMAIN_ONLY = {
    "Baltimore": "data.baltimorecity.gov",
    "Buffalo": "data.buffalony.gov",
    "Austin": "data.austintexas.gov",
    "Hartford": "data.hartford.gov",
    "Sacramento": "data.cityofsacramento.org",
    "Dallas": "dallasopendata.com",
    "Seattle": "data.seattle.gov",
    "Cleveland": "data.clevelandohio.gov",
    "Miami-Dade": "data.miamidade.gov",
    "Providence RI": "data.providenceri.gov",
    "New Haven CT": "data.newhavenct.gov",
    "Fort Worth": "data.fortworthtexas.gov",
    "Memphis": "data.memphistn.gov",
    "Nashville": "data.nashville.gov",
    "Tulsa": "data.cityoftulsa.org",
    "Birmingham AL": "data.birminghamal.gov",
    "San Diego": "data.sandiego.gov",
    "Long Beach CA": "data.longbeach.gov",
    "San Jose": "data.sanjoseca.gov",
    "St. Louis": "data.stlouis-mo.gov",
    "Detroit": "data.detroitmi.gov",
}


def main():
    for city, domain, dsid, label in SOCRATA_KNOWN:
        key = f"socrata:{city}"
        if key in OUT:
            continue
        try:
            if dsid:
                OUT[key] = socrata_type_probe(domain, dsid, label)
            else:
                dom = domain or DOMAIN_ONLY.get(city)
                cands = socrata_catalog(dom)
                probes = []
                for rid, name in cands[:3]:
                    if re.search(r"311|service request|customer", name, re.I):
                        probes.append(socrata_type_probe(dom, rid, name))
                        time.sleep(0.4)
                OUT[key] = {"domain": dom, "catalog": cands, "probes": probes}
        except Exception as e:
            OUT[key] = {"error": str(e)}
        print(key, "->", json.dumps(OUT[key])[:220], flush=True)
        save()
    print("DONE")


if __name__ == "__main__":
    main()
