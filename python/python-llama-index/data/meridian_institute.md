# Meridian Polar Institute

The Meridian Polar Institute (MPI) is a fictional non-profit research
organization headquartered in Hobart, Tasmania. It operates three Antarctic
facilities: Kestrel Station on the Brunt Ice Shelf, Petrel Camp in the
Transantarctic Mountains, and the seasonal Skua Point fuel depot on the
Weddell Sea coast.

## Funding

MPI is funded by a consortium of four universities and the (fictional)
Southern Ocean Climate Trust. Its 2025 operating budget was 41 million
dollars, of which roughly a third is spent on logistics and fuel. Grant
cycles run on three-year terms, and every station must publish an annual
environmental impact statement to keep its operating permit.

## Logistics

Supplies reach Kestrel Station twice per year aboard the icebreaker RSV
Southern Tern, which anchors at the ice edge while cargo is sledged the
final 40 kilometres. Petrel Camp is supplied entirely by ski-equipped
Twin Otter aircraft staging out of Skua Point. Fresh produce is grown
year-round at Kestrel in a small hydroponic module nicknamed "the
greenhouse", which doubles as a crew morale space during winter.

## Petrel Camp

Petrel Camp is a summer-only field camp housing up to 12 geologists. Unlike
Kestrel Station it has no wind turbines: the camp runs on portable diesel
generators and fold-out solar panels, which is acceptable because it is
evacuated before the polar night begins. Petrel Camp's main project is
mapping subglacial lake networks with ground-penetrating radar.

## Winter operations at Kestrel Station

During the polar night, Kestrel Station reduces its crew to a winter team
of 24. The 300 kW wind array carries most of the winter load, because the
solar field produces nothing for roughly 105 days of continuous darkness.
A 1.2 MWh lithium battery bank smooths out wind lulls, and the diesel
backup generators are started only when wind speed stays below the
turbines' cut-in threshold for more than 36 hours — which happened twice
during the 2024 winter. Waste heat from the generator room is recovered to
keep the freshwater tanks from freezing.

## Why this file exists

Like `kestrel_station.md`, this document is deliberately fictional so that
a RAG pipeline must retrieve it to answer questions. It also adds enough
chunks — including near-miss distractors like Petrel Camp's diesel setup —
to make hybrid retrieval, reranking, and chunk expansion meaningful.
