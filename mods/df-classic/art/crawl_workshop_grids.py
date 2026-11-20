#!/usr/bin/env python3
"""Fetch the 3 x 3 tile grids the Dwarf Fortress Wiki draws for each workshop, furnace and
a few buildings (v0.31 pages), into wiki_workshop_grids.json next to this script.

Each wiki page has an infobox table of the building's tiles: a glyph, its color and its
background per cell. `workshops.js` is written from that data (a cell is [tile, color,
background]); this script exists so the data can be refetched or extended.

Be polite: one request every 2 seconds, an identifying User-Agent, pages cached in
.wiki-cache/ (git-ignored). The wiki answered a generic fetch tool with HTTP 429 but
answers this. Wiki content is GFDL and MIT; credit it (see ../SYMBOLS.md).
Run: python3 art/crawl_workshop_grids.py
"""
import html, json, os, re, time, urllib.parse, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(HERE, ".wiki-cache")
PAGES = ["Ashery", "Bowyer's workshop", "Butcher's shop", "Carpenter's workshop", "Craftsdwarf's workshop",
         "Farmer's workshop", "Fishery", "Jeweler's workshop", "Kitchen", "Leather works", "Loom", "Magma forge",
         "Mason's workshop", "Mechanic's workshop", "Metalsmith's forge", "Millstone", "Quern", "Screw press",
         "Siege workshop", "Still", "Soap maker's workshop", "Tanner's shop", "Wood furnace", "Smelter",
         "Magma smelter", "Glass furnace", "Magma glass furnace", "Kiln", "Magma kiln", "Trade depot", "Bridge",
         "Drawbridge", "Well"]
UA = "df-reference-fetch/1.0 (reference collection for a Herdr layout)"
GRID = re.compile(r'<table style="border-spacing: 0; background: black[^"]*">(.*?)</table>', re.S)
CELL = re.compile(r'<td style="padding: 0; line-height: 1.25em">(.*?)</td>', re.S)
SPAN = re.compile(r'<span style="color: (#[0-9A-Fa-f]{6}); background: (#[0-9A-Fa-f]{6});[^"]*">(.*?)</span>', re.S)

os.makedirs(CACHE, exist_ok=True)
grids = {}
for name in PAGES:
    path = os.path.join(CACHE, re.sub(r"\W+", "_", name) + ".html")
    if not os.path.exists(path):
        url = "https://dwarffortresswiki.org/index.php/v0.31:" + urllib.parse.quote(name.replace(" ", "_"), safe="_")
        try:
            page = urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=30).read().decode("utf-8", "replace")
        except Exception as error:
            print(name, "failed:", error)
            if "429" in str(error):
                break
            time.sleep(2)
            continue
        open(path, "w", encoding="utf-8").write(page)
        time.sleep(2)
    page = open(path, encoding="utf-8").read()
    found = []
    for table in GRID.findall(page):
        rows = []
        for tr in re.findall(r"<tr>(.*?)</tr>", table, re.S):
            rows.append([({"ch": html.unescape(m.group(3)), "fg": m.group(1), "bg": m.group(2)} if (m := SPAN.search(cell)) else None) for cell in CELL.findall(tr)])
        found.append(rows)
    grids[name] = found
    print(name, len(found), "grid(s)")
json.dump(grids, open(os.path.join(HERE, "wiki_workshop_grids.json"), "w"), ensure_ascii=False, indent=1)
