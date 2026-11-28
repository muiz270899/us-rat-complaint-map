# Coverage — US 311 Rat & Rodent Complaint Atlas

Snapshot assembled 2026-11-28 by re-running the project's open pipeline (`pipeline/fetch.py`) against each jurisdiction's official open-data API. Dates below are the first and last qualifying records in each published source; a jurisdiction may have internal gaps. Every count is recomputable from the CSVs in `data/csv/` and the statistics in `data/summary.json`.

| Jurisdiction | First record | Latest record | Records | Mapped | Unmapped | Resident-filed |
|---|---|---|---:|---:|---:|---:|
| Baltimore, MD | 2010-01-01 | 2026-11-25 | 1,922,689 | 1,921,638 | 1,051 | 145,183 |
| Chicago, IL | 1999-11-29 | 2026-11-26 | 711,869 | 711,440 | 429 | — |
| New York, NY | 2010-01-01 | 2026-11-25 | 517,619 | 514,277 | 3,342 | — |
| Washington, DC | 2013-05-23 | 2026-05-01 | 114,945 | 114,945 | 0 | — |
| Boston, MA | 2012-01-02 | 2026-11-10 | 48,172 | 47,731 | 441 | — |
| Buffalo, NY | 2008-07-29 | 2026-11-26 | 37,313 | 35,939 | 1,374 | — |
| Detroit, MI | 2017-06-14 | 2026-11-25 | 27,177 | 27,177 | 0 | — |
| Kansas City, MO | 2007-01-04 | 2026-11-20 | 20,177 | 20,176 | 1 | — |
| Baton Rouge, LA | 2019-02-07 | 2026-11-25 | 18,345 | 18,325 | 20 | — |
| Somerville, MA | 2015-07-04 | 2026-11-23 | 14,810 | 0 | 14,810 | — |
| Pittsburgh, PA | 2015-04-30 | 2026-11-24 | 8,465 | 8,384 | 81 | — |
| New Orleans, LA | 2019-01-01 | 2026-11-23 | 6,519 | 6,497 | 22 | — |
| San Francisco, CA | 2010-01-26 | 2026-11-25 | 5,746 | 4,645 | 1,101 | — |
| Cambridge, MA | 2016-01-07 | 2026-11-23 | 5,166 | 5,166 | 0 | — |
| Cincinnati, OH | 2006-09-13 | 2026-11-22 | 4,745 | 4,745 | 0 | — |
| Evanston, IL | 2014-01-09 | 2022-02-22 | 4,169 | 4,168 | 1 | — |
| Hartford, CT | 2015-07-06 | 2026-11-02 | 2,070 | 2,035 | 35 | — |
| Norfolk, VA | 2019-10-02 | 2026-11-24 | 2,012 | 0 | 2,012 | — |
| Denver, CO | 2007-03-15 | 2026-11-19 | 1,536 | 1,230 | 306 | — |
| Prince George's County, MD | 2012-07-12 | 2016-08-13 | 1,179 | 1,037 | 142 | — |
| Berkeley, CA | 2026-01-24 | 2026-06-24 | 25 | 25 | 0 | — |
| **Total — 21 jurisdictions** | | | **3,474,748** | **3,449,580** | **25,168** | **1,697,242** |

“Resident-filed” is shown only where the source data itself separates resident-filed cases from city-initiated proactive work (Baltimore). For all other jurisdictions the 311 categories are resident-filed requests; some categories name the inspection or treatment the city performs in response to the request.

## Sources and inclusion rules

**Baltimore, MD** — [Baltimore Open Data (ArcGIS) - 311 Customer Service Requests, yearly layers 2004-2022 + annual services 2023-2026](https://services1.arcgis.com/UWYHeuuJISiGmgXx/arcgis/rest/services/311_Customer_Service_Requests_Yearly/FeatureServer)

Two filters on the same services. (1) `SRType LIKE 'SW-Rat%'` — the Rat Rubout program. Most of these records are **'SW-Rat Rubout Proactive'**: baiting/inspection rounds initiated by the city itself, which Baltimore logs as 311 service requests. The resident-initiated complaint type is 'SW-Rat Rubout', plus its follow-ups. (2) `SRType = 'HCD-Rodents'` — resident-filed rodent complaints taken by Housing & Community Development code enforcement. **This category was missed by the original SW-Rat-only filter and is added in this revision.** Resident-filed total = SW-Rat Rubout + SW-Rat Rubout Follow-up + HCD-Rodents; the app's 'Citizen reports only' toggle and the comparison table show both counts side by side. Dates use the record creation date.

Filter as configured: `SRType LIKE 'SW-Rat%' — Baltimore's Rat Rubout program. Most records are 'SW-Rat Rubout Proactive': city-initiated baiting/inspection visits that Baltimore itself logs as 311 service requests; resident-initiated complaints are the 'SW-Rat Rubout' type. Both are counted, with the split visible in the per-type breakdown. | SRType = 'HCD-Rodents' exactly — resident-filed rodent complaints taken by Baltimore's Housing & Community Development code enforcement. The original SW-Rat-only filter missed this category entirely; it is counted as resident-initiated.`

**Chicago, IL** — [Chicago Data Portal - 311 Service Requests (current system, 2019-present) + Chicago Data Portal - 311 Service Requests, Rodent Baiting (historical, to Dec 2018)](https://data.cityofchicago.org/Service-Requests/311-Service-Requests/v6vf-nfxy)

Current system (2019– ): `sr_type = 'Rodent Baiting/Rat Complaint'`. Historical archive (to 2018-12-18): the dedicated rodent-baiting dataset, same category. The two sources are stitched without overlap (current system starts 2019-02-25). A 311 rodent-baiting request is a resident-filed service request; the baiting is the city's response.

Filter as configured: `sr_type = 'Rodent Baiting/Rat Complaint' | historical rodent-baiting dataset (ends 2018-12-18; current system starts 2019-02-25, no overlap)`

**New York, NY** — [NYC Open Data - 311 Service Requests from 2020 to Present + NYC Open Data - 311 Service Requests from 2010 to 2019](https://data.cityofnewyork.us/d/erm2-nwe9)

`complaint_type = 'Rodent'` in both the 2010–2019 archive and the 2020–present dataset (NYC split its 311 dataset in Dec 2025; no overlap). The original descriptor is preserved per record: Rat Sighting, Condition Attracting Rodents, Signs of Rodents, Mouse Sighting, Rodent Bite. Unlike some compilations, mouse sightings are kept but always labeled as their own descriptor/standard type.

Filter as configured: `complaint_type = 'Rodent'; original type shown is the NYC descriptor | complaint_type = 'Rodent' in the archived 2010-2019 dataset (NYC split its 311 dataset in Dec 2025; the current dataset starts 2020, no overlap)`

**Washington, DC** — [DC GIS - 311 City Service Requests, yearly layers 2009-2026](https://opendata.dc.gov/datasets/311-city-service-requests)

`SERVICECODEDESCRIPTION = 'Rodent Inspection and Treatment'` exactly, across the yearly layers. 'Rat Replacement Containers' is a trash-can program and is excluded. The category is the service the city performs on rodent cases; the source does not separate resident-filed from city-initiated cases, so no resident split is shown. The 2026 layer ended 2026-05-01 in the source at fetch time.

Filter as configured: `SERVICECODEDESCRIPTION = 'Rodent Inspection and Treatment' exactly ('Rat Replacement Containers' is a trash-can program and is excluded)`

**Boston, MA** — [Boston Open Data (Analyze Boston) - 311 Service Requests, yearly files 2011-2026](https://data.boston.gov/dataset/311-service-requests)

`type LIKE '%Rodent%'` in each yearly 311 file 2011–2026 (in practice the single value 'Rodent Activity').

Filter as configured: `type LIKE '%Rodent%' (in practice the single value 'Rodent Activity') in each yearly 311 file 2011-2026`

**Buffalo, NY** — [Open Data Buffalo - 311 Service Requests (July 2008 - May 2024) + Open Data Buffalo - 311 Service Requests (May 2024 - Present)](https://data.buffalony.gov/Quality-of-Life/311-Service-Requests/whkc-e5vr)

`type = 'Rodents (Req_Serv)'` in the July 2008 – May 2024 dataset and `type = 'Rodent Control Issue'` in its May 2024–present successor; the two are stitched without overlap. **Correction applied (28 Nov 2026): Buffalo's May 2024–present dataset stores latitude and longitude interchanged for 191 records (its `latitude` field holds values like −78.83 and `longitude` values like 42.91). The interchange is unambiguous — Buffalo longitudes are negative and latitudes positive — so those 191 records are restored to the evident order in the map points and the CSV; every other record is reproduced exactly as published.

Filter as configured: `type = 'Rodents (Req_Serv)' (2008-May 2024 dataset) | type = 'Rodent Control Issue' (May 2024-present dataset; continues the older dataset without overlap)`

**Detroit, MI** — [City of Detroit Open Data - Improve Detroit Issues (ArcGIS FeatureServer)](https://services2.arcgis.com/qvkbeam7Wirps6zC/arcgis/rest/services/improve_detroit/FeatureServer)

`request_type LIKE '%Rodent%'` in Improve Detroit issues — in practice the single value 'Rodent Extermination'. Requests are resident-filed; extermination is the city's response service.

Filter as configured: `request_type LIKE '%Rodent%' in the Improve Detroit issues layer`

**Kansas City, MO** — [Open Data KC - 311 Call Center Service Requests 2007-Mar 2021 + Open Data KC - 311 Call Center Reported Issues (current)](https://data.kcmo.org/Operations/311-Call-Center-Service-Requests-2007-March-2021/7at3-sxhp)

Historic system (2007 – Mar 2021): `type IN ('Rat Treatment','Rat Control and Treatment','Rodent')`. Current system: `issue_sub_type = 'Rats'`. Treatment types are resident-requested services — the request is the complaint, the treatment is the response. Note: the historic system assigns one placeholder coordinate pair (35.7975, −103.8906 — a default pin in the legacy system, shared by 40,610 records of all types) to 353 of the rodent records; those records are mapped at the coordinates the source publishes.

Filter as configured: `type IN ('Rat Treatment','Rat Control and Treatment','Rodent') | issue_sub_type = 'Rats' (this dataset publishes no coordinate columns; records are CSV-only)`

**Baton Rouge, LA** — [East Baton Rouge Parish Open Data - Mosquito and Rodent Service Requests](https://data.brla.gov/d/bktv-u9ua)

`type = 'RODENT'` exactly, in the East Baton Rouge Parish Mosquito & Rodent Control call-in log — resident service requests phoned in to the parish program. 'MOSQUITO' requests and the joint 'BOTH' (mosquito + rodent) category are excluded. The program is parish-wide: about 89% of RODENT records are in Baton Rouge proper; the rest are in parish communities (Baker, Zachary, Central, Greenwell Springs, Pride). The dataset's caller-name fields are never selected by the pipeline — only date, type and the published point location are pulled.

Filter as configured: `type = 'RODENT' exactly in the East Baton Rouge Parish Mosquito & Rodent Control call-in log (resident service requests). 'MOSQUITO' requests and the joint 'BOTH' category are excluded. Parish-wide program: about 89% of RODENT records are in Baton Rouge proper; the rest are in parish communities (Baker, Zachary, Central, Greenwell Springs).`

**Somerville, MA** — [City of Somerville Open Data - 311 Service, Information and Feedback Requests](https://data.somervillema.gov/Public-Services/311-Service-Information-and-Feedback-Requests/4pyi-uqq6)

`type LIKE '%Rodent%' OR type = 'Rats'`. **This dataset publishes no coordinate columns at all**, so Somerville's records are CSV-only: counted in every total, absent from the map. No coordinates were invented or geocoded from addresses.

Filter as configured: `type LIKE '%Rodent%' OR type = 'Rats' (this dataset publishes no coordinate columns; records are CSV-only)`

**Pittsburgh, PA** — [Western Pennsylvania Regional Data Center - Pittsburgh 311 Data (combined)](https://data.wprdc.org/dataset/pittsburgh-311-data)

`subject = 'Rodent Control'` exactly. Substring lookalikes ('Catch Basins, Grates and Sewers', 'Operating Without a License', …) were audited and excluded. Coordinates are rounded by the source for some records.

Filter as configured: `subject = 'Rodent Control' exactly (substring lookalikes such as 'Catch Basins, Grates and Sewers' and 'Operating Without a License' deliberately excluded)`

**New Orleans, LA** — [NOLA.gov Open Data - 311 OPCD Calls (2012-Present)](https://data.nola.gov/Administrative-Data/311-OPCD-Calls-2012-Present-/2jgv-pqrq)

`request_type = 'Mosquito, Termite & Rodent Control'` AND `request_reason IN ('Rodent Complaint (Rats)','Rodent Complaint (Mice & Rats)')`. The same dataset's 'Non-Rodent Complaint' reasons are excluded. Only the current system (2019– ) is used; the historic 2012–2018 system's records were migrated into it with new dates, which would corrupt the timeline.

Filter as configured: `request_type = 'Mosquito, Termite & Rodent Control' AND request_reason IN ('Rodent Complaint (Rats)','Rodent Complaint (Mice & Rats)'); the same dataset's 'Non-Rodent Complaint' reasons are excluded`

**San Francisco, CA** — [DataSF - 311 Cases](https://data.sfgov.org/City-Infrastructure/311-Cases/vw6y-z8j6)

`service_subtype IN ('Building - Infestation_Rodent_Insect', 'infestation_rodent_insect')` — San Francisco's combined rodent/insect building-infestation category. It is labeled as a combined category everywhere it appears; the city publishes no rodent-only building category.

Filter as configured: `service_subtype IN ('Building - Infestation_Rodent_Insect','infestation_rodent_insect') - SF's combined rodent/insect building-infestation category`

**Cambridge, MA** — [Cambridge Open Data - Commonwealth Connect (SeeClickFix) Service Requests](https://data.cambridgema.gov/d/2z9k-mv9g)

`issue_type = 'Rodent Sighting'` exactly — the formal rodent category of Cambridge's Commonwealth Connect (SeeClickFix) feed. The same feed carries thousands of free-text one-off ticket titles (residents can title tickets freely); those are not a category and are excluded, even when a title mentions rats.

Filter as configured: `issue_type = 'Rodent Sighting' exactly — the dataset's formal rodent category. Free-text one-off ticket titles in the same feed are not a category and are excluded.`

**Cincinnati, OH** — [City of Cincinnati Open Data - 311 (Non-Emergency) Service Requests](https://data.cincinnati-oh.gov/Safer-Streets/Cincinnati-311-Non-Emergency-Service-Requests/gcej-gmiw)

`sr_type_desc IN (…)` — 12 values verified one by one from the dataset's own type list (RATS, IN A BUILDING; RATS, OUTSIDE A BUILDING; FOOD OPERATION, RODENTS; …). Substring lookalikes (REGISTRATION, RESTORATION, OPERATING, REFRIGERATOR, GENERATOR) were deliberately excluded.

Filter as configured: `sr_type_desc IN (12 verified rat/rodent values) - the full list was enumerated from the dataset's own type values; substring lookalikes (REGISTRATION, RESTORATION, OPERATING, REFRIGERATOR, GENERATOR) deliberately excluded`

**Evanston, IL** — [City of Evanston Open Data (ArcGIS) - 311 Service Requests 2013 to 2022 (historical archive)](https://services3.arcgis.com/RVAJnWJd9M0xRdYG/arcgis/rest/services/311_Service_Requests_(2013_to_2022)/FeatureServer/0)

`Title IN ('Dead Rodent-Rat','Rodents- Rats')` in the city's historical 311 archive (2013–2022; the archive ends 2022-02-22 and the city publishes no successor archive, so Evanston cannot support a present-day trend). **The layer repeats each request roughly twice** (8,625 rows for 4,169 requests); rows are deduplicated on the city request ID, keeping the earliest record per request. The deduplicated count was cross-checked against an independent distinct-ID count of the layer.

Filter as configured: `Title IN ('Dead Rodent-Rat','Rodents- Rats') in the city's historical 311 archive (2013-2022; the archive ends Feb 2022). The layer repeats requests, so rows are deduplicated on the city request ID, keeping the earliest record per request.`

**Hartford, CT** — [Hartford Open Data (ArcGIS) - Service Requests 2015 to Current, yearly layers](https://utility.arcgis.com/usrsvcs/servers/fa056981accc4bb993ff2f85573bf7dd/rest/services/Service_Requests_2015_to_Current/FeatureServer)

`upper(USER_Record_Type) LIKE '%RODENT%'` across the yearly layers — values: 'External Rodent Complaint' and its older path-style equivalent. These are externally (resident) reported complaints by definition.

Filter as configured: `USER_Record_Type LIKE '%RODENT%' (values: 'External Rodent Complaint' and the older path-style 'ServiceRequest/HHS/Environmental/External Rodent Complaint')`

**Norfolk, VA** — [City of Norfolk Open Data - Citizen Request Tracker (Norfolk AIR)](https://data.norfolk.gov/d/nbyu-xjez)

`service_request_type IN ('Rat Observed','Potential Rat Harborage')`. **This dataset publishes street-address text only, no coordinate columns**, so Norfolk's records are CSV-only, exactly as with Somerville.

Filter as configured: `service_request_type IN ('Rat Observed','Potential Rat Harborage') - this dataset publishes street-address text only, no coordinate columns; records are CSV-only`

**Denver, CO** — [City & County of Denver Open Data (ArcGIS) - 311 Service Requests, yearly archive tables 2007-2023 + City & County of Denver Open Data (ArcGIS) - 311 Service Requests, current rolling 12 months](https://services1.arcgis.com/zdB7qR0BtYrg0Xpl/arcgis/rest/services/311_Service_Requests_2023/FeatureServer)

Denver's 311 archive is split into one table per year (2007–2023) plus a current rolling-12-months table. The category lives in `Case_Summary`, which also carries thousands of free-text one-off summaries; only the five exact controlled values are counted: 'Rat Problems' (to 2015), 'Mice Problems' (2007 only), 'EQ - Rats' (2016–2019), 'Rats' (a few from 2015–2019, the main label from 2020) and 'Rats & Mice' (2022– ). Denver's SQL matching is case-insensitive, so the pipeline keeps only rows whose stored value matches an allowlisted value exactly — case-variant noise in the source ('rats', 'RATS'; 22 records) is excluded. The combined 'Cockroaches, rodents, maggots, ants, spiders, fleas' category is not counted. **Coverage gap: Denver publishes no queryable 311 source for Jan 2024 – Nov 2025** (the 2024 archive is not exposed on the city's ArcGIS org and the rolling table covers only the last 12 months), so the series jumps from Dec 2023 to Nov 2025. 252 records carry placeholder 0,0 coordinates in the source and are counted as unmapped, exactly like records with no coordinates. Each yearly table's system ObjectId is unique within its table and the tables cover disjoint periods, so no record can be double-counted. One record (24 Mar 2023) publishes a longitude identical to its latitude (39.74159, 39.74159) — not a real location; it is kept in the CSV but excluded from the map and counted as unmapped.

Filter as configured: `Case_Summary IN ('Rat Problems','Mice Problems','EQ - Rats','Rats','Rats & Mice') in Denver's yearly 311 archive tables 2007-2023 — the exact controlled rodent values of Denver's own taxonomy (the label changed over the years: 'Rat Problems' to 2015, 'EQ - Rats' from 2016, 'Rats'/'Rats & Mice' from 2020). Free-text one-off summaries that also occur in Case_Summary are not a category and are excluded. Denver publishes no queryable 311 source for Jan 2024 - Nov 2025, so the series has that gap. | the same five exact Case_Summary values in Denver's current rolling-12-months 311 table (its rodent records currently span 2025-11-25 onward; the table rolls, so a re-run may shift the window)`

**Prince George's County, MD** — [Prince George's County Open Data - County Click 311, QAlert Service Requests](https://data.princegeorgescountymd.gov/d/y8p6-7ur2)

`service_name IN ('Rodents','Infestation of Bugs and/or Rodents')` in County Click 311, the county's QAlert-based system. 'Infestation of Bugs and/or Rodents' (1,114 of the 1,179 records) is a combined bugs-and-rodents category and is labeled combined everywhere it appears; 'Rodents' alone is 65 records. **The series is historical: the QAlert data stops in Aug 2016** and the county's successor systems publish no rodent category, so Prince George's County cannot support a present-day trend. Records are deduplicated on `service_request_id` (no duplicates found). It is a county, not a city — the atlas's one county jurisdiction.

Filter as configured: `service_name IN ('Rodents','Infestation of Bugs and/or Rodents') in the county's County Click 311 (QAlert) system. 'Infestation of Bugs and/or Rodents' is a combined bugs-and-rodents category and is labeled combined everywhere it appears. The QAlert series is historical: it ends in 2016, and the county's successor systems publish no rodent category.`

**Berkeley, CA** — [City of Berkeley Open Data - 311 Cases](https://data.cityofberkeley.info/d/p88g-6gs2)

`case_request = 'Vector Control'` — Berkeley Environmental Health's combined vector-control category: rodents, mosquitoes and other vectors in a single case type. The rodent share cannot be separated from the data; the category is labeled combined everywhere it appears, exactly as San Francisco's combined category is. The value was introduced in 2026, so Berkeley's series covers 2026 only. Records are deduplicated on `case_id` (no duplicates found).

Filter as configured: `case_request = 'Vector Control' — Berkeley Environmental Health's combined vector-control category (rodents, mosquitoes and other vectors). The rodent share cannot be separated from the data; the category is labeled combined everywhere it appears, exactly as San Francisco's combined category is. The value exists only from 2026 in this dataset.`

## Counting rules that apply everywhere

- Coordinates are exactly what the source publishes. This project never geocodes addresses and never invents map points; records without coordinates are counted, kept in the CSVs, and left off the map. Coordinates stored as 0,0 placeholders (Denver) count as missing.
- The original city classification is preserved verbatim on every record (`type_original`), next to one of ten standardized categories.
- Era changes inside a jurisdiction's 311 system (NYC 2025, Buffalo 2024, Chicago 2018/19) are stitched from non-overlapping sources so no record is double-counted.
- Complaint volume measures *reporting*, not rat populations: it also reflects 311 accessibility, public awareness, and whether a city runs proactive programs.
