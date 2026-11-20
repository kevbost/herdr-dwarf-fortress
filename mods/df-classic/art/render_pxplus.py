#!/usr/bin/env python3
"""Draw the code page 437 tileset from the bundled PxPlus IBM VGA 9x16 font.

Writes art/PxPlus9x16.png: 256 tiles of 9x16 px, 16 a row, in code page 437
order, white on magenta, the form art/slice_tileset.py reads. Pixels only (no
anti-aliasing), so each tile is the font's own bitmap.

Usage (needs Pillow): python3 -I art/render_pxplus.py
Then:                  python3 -I art/slice_tileset.py art/PxPlus9x16.png
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

MOD_DIR = Path(__file__).resolve().parent.parent
FONT = MOD_DIR / "fonts" / "PxPlus_IBM_VGA_9x16.ttf"
TILE_W, TILE_H, PER_SIDE = 9, 16, 16
MAGENTA = (255, 0, 255, 255)
WHITE = (255, 255, 255, 255)

# Bytes 0-31 and 127 are controls in text, pictures in code page 437.
LOW = "\u0000☺☻♥♦♣♠•◘○◙♂♀♪♫☼►◄↕‼¶§▬↨↑↓→←∟↔▲▼"


def char_of(index):
    if index < 32:
        return LOW[index]
    if index == 127:
        return "⌂"
    return bytes([index]).decode("cp437")


def main():
    font = ImageFont.truetype(str(FONT), TILE_H)
    sheet = Image.new("RGBA", (TILE_W * PER_SIDE, TILE_H * PER_SIDE), MAGENTA)
    draw = ImageDraw.Draw(sheet)
    draw.fontmode = "1"
    for index in range(256):
        char = char_of(index)
        if char in ("\u0000", " "):
            continue
        draw.text(((index % PER_SIDE) * TILE_W, (index // PER_SIDE) * TILE_H), char, font=font, fill=WHITE)
    out = MOD_DIR / "art" / "PxPlus9x16.png"
    sheet.save(out)
    print(out)


if __name__ == "__main__":
    main()
