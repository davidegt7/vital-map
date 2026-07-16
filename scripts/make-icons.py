#!/usr/bin/env python3
"""
Generates the PWA icon PNGs.

This is a script rather than four committed binaries so the icons stay
reproducible: change a colour here and re-run, instead of wondering which
long-lost tool produced icon-192.png and whether it still exists.

Deps: Pillow (ships with the system python3 here). Run: python3 scripts/make-icons.py
"""

from pathlib import Path
from PIL import Image, ImageChops, ImageDraw

BG = (15, 26, 20, 255)      # --bg
ACCENT = (95, 208, 138, 255)  # --accent

OUT = Path(__file__).resolve().parent.parent / "public" / "icons"
OUT.mkdir(parents=True, exist_ok=True)

# Render at 4x and downsample — PIL has no antialiased vector drawing, so
# supersampling is what keeps the pin's curves from looking like stairs.
SS = 4


def draw_icon(size: int, padding_ratio: float) -> Image.Image:
    """padding_ratio leaves the maskable safe zone: Android crops to a circle
    that can eat the outer ~10% on each side, so the art has to sit inside it."""
    s = size * SS
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    radius = int(s * 0.22)
    d.rounded_rectangle([0, 0, s - 1, s - 1], radius=radius, fill=BG)

    pad = s * padding_ratio
    inner = s - 2 * pad
    cx = s / 2

    # Teardrop pin: a disc, plus a triangle whose top edge is a chord of it.
    r = inner * 0.30
    cy = pad + inner * 0.34
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=ACCENT)

    tip_y = pad + inner * 0.98
    half = r * 0.74
    chord_y = cy + (r**2 - half**2) ** 0.5
    d.polygon([(cx - half, chord_y), (cx + half, chord_y), (cx, tip_y)], fill=ACCENT)

    # Leaf, cut out of the pin as negative space: the lens where two circles
    # offset horizontally overlap. Geometry drives whether it reads as a leaf —
    #   width  = 2*rr - gap
    #   height = 2*sqrt(rr^2 - (gap/2)^2)
    # A small gap gives a fat lens that reads as an egg-shaped hole. Pushing the
    # circles apart until height ≈ 2*width is what makes the points appear.
    rr = r * 1.00
    gap = r * 1.20
    leaf_half_h = (rr**2 - (gap / 2) ** 2) ** 0.5

    masks = []
    for offset in (-gap / 2, gap / 2):
        m = Image.new("L", (s, s), 0)
        ImageDraw.Draw(m).ellipse(
            [cx + offset - rr, cy - rr, cx + offset + rr, cy + rr], fill=255
        )
        masks.append(m)
    leaf = ImageChops.multiply(masks[0], masks[1])

    img.paste(Image.new("RGBA", (s, s), BG), (0, 0), leaf)

    # Midrib. It has to be ACCENT, not BG: the leaf is already a BG-coloured
    # hole, so a BG vein inside it would be invisible.
    d.line(
        [(cx, cy - leaf_half_h * 0.72), (cx, cy + leaf_half_h * 0.86)],
        fill=ACCENT,
        width=max(2, int(s * 0.011)),
    )

    return img.resize((size, size), Image.LANCZOS)


for size in (192, 512):
    draw_icon(size, 0.16).save(OUT / f"icon-{size}.png")
    print(f"wrote icon-{size}.png")

draw_icon(512, 0.26).save(OUT / "icon-maskable-512.png")
print("wrote icon-maskable-512.png")

draw_icon(180, 0.16).save(OUT / "apple-touch-icon.png")
print("wrote apple-touch-icon.png")
