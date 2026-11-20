#!/usr/bin/env python3
"""Turn a Dwarf Fortress tileset into the sheet the df-classic mod draws from.

A tileset is one image of 256 tiles, 16 a row, in code page 437 order (see
https://dwarffortresswiki.org/Tileset_repository). The game tints each tile:
white shows the foreground color, grays a darker shade of it, magenta (or
transparency) the background.

Writes, into the mod folder:

  tileset/sheet.svg   the whole sheet as a few paths the app tints: a pixel's
                      brightness becomes its opacity, so white is the full
                      foreground color and gray a darker one
  tileset.js          the tile and cell sizes, for kit.js

Black pixels are left out: over the black the layout draws on, that is what
the game shows too.

Usage (needs Pillow):

  python3 -I art/slice_tileset.py [tileset.png] [--cell WxH]

Without arguments it slices art/PxPlus9x16.png (see art/render_pxplus.py). --cell is the size a tile is
drawn at, in px at zoom 1 (default: the tile's own size).
"""

import argparse
import json
from pathlib import Path

from PIL import Image

TILES_PER_SIDE = 16
MAGENTA = (255, 0, 255)
MOD_DIR = Path(__file__).resolve().parent.parent


def is_background(pixel):
    red, green, blue, alpha = pixel
    return alpha == 0 or (red, green, blue) == MAGENTA


def write_svg(tileset, path):
    """
    The sheet as one path per brightness: each row of pixels as runs of one
    opacity, runs of the same place in rows under each other joined into one
    taller rectangle. Brightness is how much foreground shows.
    """
    width, height = tileset.size
    pixels = tileset.load()

    def opacity_at(x, y):
        pixel = pixels[x, y]
        return 0 if is_background(pixel) else round(max(pixel[:3]) / 255 * pixel[3] / 255, 3)

    # Rectangles still growing downward: (x, width, opacity) -> [top, height].
    open_runs = {}
    rects = []  # (opacity, x, y, width, height)
    for y in range(height + 1):
        runs = set()
        x = 0
        while y < height and x < width:
            opacity = opacity_at(x, y)
            start = x
            x += 1
            while x < width and opacity_at(x, y) == opacity:
                x += 1
            if opacity > 0:
                runs.add((start, x - start, opacity))
        for key in [key for key in open_runs if key not in runs]:
            top, rows = open_runs.pop(key)
            rects.append((key[2], key[0], top, key[1], rows))
        for key in runs:
            if key in open_runs:
                open_runs[key][1] += 1
            else:
                open_runs[key] = [y, 1]
    by_opacity = {}
    for opacity, x, y, w, h in sorted(rects):
        by_opacity.setdefault(opacity, []).append(f"M{x} {y}h{w}v{h}h-{w}z")
    paths = []
    for opacity, shapes in by_opacity.items():
        shade = "" if opacity == 1 else f' fill-opacity="{opacity:g}"'
        paths.append(f'<path{shade} d="{"".join(shapes)}"/>')
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" '
           f'fill="#ffffff" shape-rendering="crispEdges">\n' + "\n".join(paths) + "\n</svg>\n")
    path.write_text(svg, encoding="utf-8")
    return len(rects)


def main():
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("tileset", nargs="?", type=Path, default=MOD_DIR / "art" / "PxPlus9x16.png")
    parser.add_argument("--cell", help="the size a tile is drawn at, WxH px (default: the tile's size)")
    args = parser.parse_args()

    tileset = Image.open(args.tileset).convert("RGBA")
    width, height = tileset.size
    if width % TILES_PER_SIDE or height % TILES_PER_SIDE:
        parser.error(f"{args.tileset.name} is {width}x{height}: not {TILES_PER_SIDE} tiles a side")
    tile_width, tile_height = width // TILES_PER_SIDE, height // TILES_PER_SIDE
    cell_width, cell_height = (int(n) for n in args.cell.lower().split("x")) if args.cell else (tile_width, tile_height)

    out_dir = MOD_DIR / "tileset"
    out_dir.mkdir(exist_ok=True)
    rects = write_svg(tileset, out_dir / "sheet.svg")

    name = args.tileset.stem
    (MOD_DIR / "tileset.js").write_text(
        f"// Written by art/slice_tileset.py from {args.tileset.name}. Do not edit: run the script again.\n"
        f"export const TILESET = {json.dumps({'name': name, 'tileWidth': tile_width, 'tileHeight': tile_height, 'cellWidth': cell_width, 'cellHeight': cell_height})};\n",
        encoding="utf-8",
    )
    print(f"{name}: {tile_width}x{tile_height} tiles drawn at {cell_width}x{cell_height}; sheet.svg ({rects} runs), tileset.js")


if __name__ == "__main__":
    main()
