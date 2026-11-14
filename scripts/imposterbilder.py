"""Förbereder Imposterjaktens bilder (stilen Nattspanarna).

Läser originalen i docs/skisser/imposterjakten/ (ändras aldrig) och skriver WebP till public/images/imposterjakten/:

- logga.webp och logga-800.webp: loggan med genomskinlig bakgrund, beskuren till det som syns, i två storlekar.
- monster-mork.webp: mönstret för väntrummet och bordet, på spelets marinblå.
- monster-ljus.webp: mönstret för spelkortet på startsidan, på spelets krämvita.

Mönstren är 512 × 512 och sömlösa. Originalen är det inte: figurer skärs av i kanterna och bakgrunden är inte helt
jämn. Så här rättas det:
1. Varje pixel räknas om till hur mycket "bläck" den har (0 = bakgrund, 1 = figurens färg). Svagt brus räknas som
   bakgrund, så att bakgrunden blir en enda jämn färg.
2. Figurer som nuddar bildens kant tas bort helt. Delar av samma figur som inte sitter ihop (linjerna i ett
   fingeravtryck) räknas som en figur.
3. Bilden byggs upp igen av två färger: spelets bakgrundsfärg och en bläckfärg som väljs så att kontrasten mot
   bakgrunden blir låg (CONTRAST), så att text och kort syns tydligt ovanpå.

Med --forhandsvisning skrivs också bilder till docs/skisser/imposterjakten/forhandsvisning/: varje mönster lagt 2 × 2
och loggan på mörk och ljus botten.

Kör: python scripts/imposterbilder.py [--forhandsvisning] (kräver Pillow och numpy).
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

SOURCE = Path('docs/skisser/imposterjakten')
TARGET = Path('public/images/imposterjakten')
PREVIEW = SOURCE / 'forhandsvisning'

# Spelets färger (Nattspanarna).
NAVY = (0x14, 0x23, 0x2E)
CREAM = (0xF5, 0xE9, 0xCF)

TILE = 512
# Loggans bredder (px): den stora för väntrummet och spelsidan, den mindre för mobil och spelkortet.
LOGO_WIDTHS = {'logga.webp': 1400, 'logga-800.webp': 800}
# Luft runt loggan efter beskärningen, som andel av bredden.
LOGO_PAD = 0.012

# Mönstren: originalet, målfilen, bakgrundsfärgen och kontrasten mellan bläcket och bakgrunden (WCAG-kvot). Exploderande
# Tanters mönster har 1,5. Det mörka är lite svagare, eftersom ljus text på mörk botten störs mer av ett mönster.
PATTERNS = [
    ('monster-mork.png', 'monster-mork.webp', NAVY, 1.38),
    ('monster-ljus.png', 'monster-ljus.webp', CREAM, 1.5),
]
# Bläck under den här andelen räknas som bakgrund (brus och svaga skuggor i originalet).
NOISE = 0.1
# Så nära varandra (px i originalet) räknas delar som samma figur, och så nära kanten räknas en figur som avskuren.
JOIN = 14
EDGE = 3


def luminance(color) -> float:
    c = np.asarray(color, dtype=float) / 255
    c = np.where(c <= 0.03928, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return float(0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2])


def contrast(a, b) -> float:
    la, lb = luminance(a), luminance(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def ink_color(background, original_ink, wanted: float):
    """Bläckfärgen: originalets färgton, dragen mot bakgrunden tills kontrasten är den önskade."""
    background = np.asarray(background, dtype=float)
    original_ink = np.asarray(original_ink, dtype=float)
    low, high = 0.0, 3.0
    for _ in range(40):
        mid = (low + high) / 2
        color = np.clip(background + (original_ink - background) * mid, 0, 255)
        if contrast(background, color) < wanted:
            low = mid
        else:
            high = mid
    return np.clip(background + (original_ink - background) * high, 0, 255)


def dilate(mask: np.ndarray, radius: int) -> np.ndarray:
    """Växer masken med radius pixlar åt alla håll (en kvadrat, i två steg)."""
    out = mask.copy()
    for axis in (0, 1):
        grown = out.copy()
        for shift in range(1, radius + 1):
            grown |= np.roll(out, shift, axis=axis) & edge_guard(out.shape, shift, axis)
            grown |= np.roll(out, -shift, axis=axis) & edge_guard(out.shape, -shift, axis)
        out = grown
    return out


def edge_guard(shape, shift: int, axis: int) -> np.ndarray:
    """Hindrar np.roll från att flytta pixlar runt bildens kant."""
    guard = np.ones(shape, dtype=bool)
    index = [slice(None), slice(None)]
    index[axis] = slice(0, shift) if shift > 0 else slice(shift, None)
    guard[tuple(index)] = False
    return guard


def touching_edge(mask: np.ndarray) -> np.ndarray:
    """De delar av masken som sitter ihop med bildens kant."""
    seeds = np.zeros_like(mask)
    seeds[:EDGE], seeds[-EDGE:], seeds[:, :EDGE], seeds[:, -EDGE:] = True, True, True, True
    reached = seeds & mask
    while True:
        grown = dilate(reached, 1) & mask
        if grown.sum() == reached.sum():
            return reached
        reached = grown


def seam(pixels: np.ndarray) -> float:
    """Hur mycket kanterna skiljer sig från varandra när bilden upprepas, jämfört med två rader intill varandra inne i
    bilden. Runt 1 betyder att skarven inte syns mer än resten av bilden."""
    pixels = pixels.astype(float)
    across = (np.abs(pixels[:, 0] - pixels[:, -1]).mean() + np.abs(pixels[0] - pixels[-1]).mean()) / 2
    inside = (np.abs(pixels[:, 1:] - pixels[:, :-1]).mean() + np.abs(pixels[1:] - pixels[:-1]).mean()) / 2
    return float(across / max(inside, 1e-6))


def edge_ink(pixels: np.ndarray, background) -> float:
    """Andel av kantens pixlar som inte är bakgrund (avskurna figurer)."""
    distance = np.linalg.norm(pixels.astype(float) - np.asarray(background, dtype=float), axis=2)
    edge = np.concatenate([distance[0], distance[-1], distance[:, 0], distance[:, -1]])
    return float((edge > 12).mean())


def pattern(source: str, target: str, background, wanted: float) -> Image.Image:
    original = np.asarray(Image.open(SOURCE / source).convert('RGB')).astype(float)
    flat = original.reshape(-1, 3)
    paper = np.median(flat, axis=0)
    distance = np.linalg.norm(original - paper, axis=2)
    ink = np.median(original[distance > np.percentile(distance, 99)], axis=0)
    direction = ink - paper
    # Hur mycket bläck varje pixel har, längs linjen från bakgrunden till bläcket.
    alpha = np.clip(((original - paper) @ direction) / (direction @ direction), 0, 1)
    alpha = np.where(alpha < NOISE, 0, (alpha - NOISE) / (1 - NOISE))

    shapes = alpha > 0.05
    cut = touching_edge(dilate(shapes, JOIN))
    removed = int((shapes & cut).sum())
    alpha[cut] = 0

    color = ink_color(background, np.asarray(background) + direction, wanted)
    rebuilt = np.asarray(background, dtype=float) + alpha[..., None] * (color - np.asarray(background, dtype=float))
    image = Image.fromarray(np.clip(rebuilt, 0, 255).astype(np.uint8)).resize((TILE, TILE), Image.LANCZOS)
    TARGET.mkdir(parents=True, exist_ok=True)
    image.save(TARGET / target, 'WEBP', quality=88, method=6)

    after = np.asarray(image)
    print(
        f'{target}: {TILE} × {TILE}, {(TARGET / target).stat().st_size // 1024} kB. '
        f'Skarv före {seam(original):.2f}, efter {seam(after):.2f}. '
        f'Kant som inte är bakgrund före {edge_ink(original, paper) * 100:.1f} %, efter {edge_ink(after, background) * 100:.1f} %. '
        f'Kontrast före {contrast(paper, ink):.2f}, efter {contrast(background, color):.2f}. '
        f'Borttagna pixlar i avskurna figurer: {removed}.'
    )
    return image


def logo() -> Image.Image:
    original = Image.open(SOURCE / 'logga.png').convert('RGBA')
    box = original.getbbox()
    pad = round(original.width * LOGO_PAD)
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(original.width, box[2] + pad), min(original.height, box[3] + pad))
    cropped = original.crop(box)
    TARGET.mkdir(parents=True, exist_ok=True)
    for name, width in LOGO_WIDTHS.items():
        height = round(cropped.height * width / cropped.width)
        cropped.resize((width, height), Image.LANCZOS).save(TARGET / name, 'WEBP', quality=90, method=6)
        print(f'{name}: {width} × {height}, {(TARGET / name).stat().st_size // 1024} kB')
    return cropped


def tiled(image: Image.Image) -> Image.Image:
    sheet = Image.new('RGB', (image.width * 2, image.height * 2))
    for x in (0, image.width):
        for y in (0, image.height):
            sheet.paste(image, (x, y))
    return sheet


def preview(patterns: dict[str, Image.Image], logo_image: Image.Image) -> None:
    PREVIEW.mkdir(parents=True, exist_ok=True)
    for name, image in patterns.items():
        tiled(image).save(PREVIEW / f'{Path(name).stem}-2x2.png')
    # Loggan på mönstren, som den kommer att ligga i väntrummet och på spelkortet.
    for name, image in patterns.items():
        sheet = tiled(image).crop((0, 0, 1024, 512)).convert('RGBA')
        width = 760
        small = logo_image.resize((width, round(logo_image.height * width / logo_image.width)), Image.LANCZOS)
        sheet.alpha_composite(small, ((sheet.width - small.width) // 2, (sheet.height - small.height) // 2))
        sheet.convert('RGB').save(PREVIEW / f'logga-pa-{Path(name).stem}.png')
    print(f'Förhandsvisningar i {PREVIEW}')


def main() -> None:
    logo_image = logo()
    patterns = {target: pattern(source, target, background, wanted) for source, target, background, wanted in PATTERNS}
    if '--forhandsvisning' in sys.argv:
        preview(patterns, logo_image)


if __name__ == '__main__':
    main()
