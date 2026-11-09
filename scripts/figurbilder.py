"""Förbereder blobbarnas bilder (Figur med kind: 'png').

Läser originalen i docs/skisser/blobbar/ (ändras aldrig) och skriver WebP till public/figurer/ i två storlekar:
<id>.webp (stor, väntrummet och prispallen) och <id>-liten.webp (emoji-storlek). Bilderna har inget ansikte, det ritas
i koden ovanpå (Miner.tsx).

Så här:
1. Diset runt kanterna tas bort: nästan genomskinliga pixlar blir helt genomskinliga (HAZE).
2. Kroppen mäts: den bredaste sammanhängande raden i nedre halvan (kropp och armar, men inte hatt, hår eller
   droppar som sitter högre upp eller är lösa). BODY_FIX justerar figurer där det måttet inte stämmer med hur stor
   kroppen ser ut (Spionen har armarna i kors).
3. Alla skalas så att kroppen blir lika bred (BODY_WIDTH av 200) och ställs på samma baslinje (BASELINE av 200), i en
   kvadrat på 200 × 200 som figurens koordinater i Figur. Det som sticker upp (hattar, hår) får plats ovanför.

Hero-figurerna på startsidan (HERO, hero-1.png till hero-4.png) förbereds på samma sätt men sparas i en storlek i
public/figurer/hero/, och bara den största sammanhängande delen av bilden behålls, så att lösa prickar runt kanterna
försvinner. De är inte spelarfigurer.

Dessutom bilder som bara beskärs och sparas i en storlek (CROPPED), t.ex. Sjusovaren som vilar på vågen ovanför
sidfoten på startsidan (sjusovaren-kant.webp).

Kör: python scripts/figurbilder.py (kräver Pillow och numpy).
"""
from pathlib import Path

import numpy as np
from PIL import Image

SOURCE = Path('docs/skisser/blobbar')
TARGET = Path('public/figurer')
NAMES = ['klumpen', 'spionen', 'sjusovaren', 'droppan', 'festis', 'kungen', 'ogat', 'burret', 'brakis', 'blygis', 'smaltis', 'plugghasten']

HAZE = 40
BODY_WIDTH = 156
BASELINE = 186
SIZES = {'': 480, '-liten': 120}
# Kroppens mått gånger det här, för figurer där den bredaste raden inte motsvarar kroppen.
BODY_FIX = {'spionen': 1.12}


def widest_run(row: np.ndarray) -> int:
    best = current = 0
    for filled in row:
        current = current + 1 if filled else 0
        best = max(best, current)
    return best


def largest_part(mask: np.ndarray) -> np.ndarray:
    """Den största sammanhängande delen av masken (fyra grannar), på en förminskad kopia för att gå fort."""
    step = 4
    small = mask[::step, ::step]
    labels = np.zeros(small.shape, dtype=np.int32)
    sizes = [0]
    for start in zip(*np.where(small)):
        if labels[start]:
            continue
        label = len(sizes)
        labels[start] = label
        stack = [start]
        count = 0
        while stack:
            y, x = stack.pop()
            count += 1
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < small.shape[0] and 0 <= nx < small.shape[1] and small[ny, nx] and not labels[ny, nx]:
                    labels[ny, nx] = label
                    stack.append((ny, nx))
        sizes.append(count)
    keep = labels == int(np.argmax(sizes))
    # Tillbaka till full storlek, med en ruta marginal så att kanten inte klipps.
    big = np.kron(keep, np.ones((step, step), dtype=bool))[: mask.shape[0], : mask.shape[1]]
    grown = big.copy()
    for dy in (-step, 0, step):
        for dx in (-step, 0, step):
            grown |= np.roll(np.roll(big, dy, 0), dx, 1)
    return mask & grown


def prepare(
    name: str,
    sizes: dict[str, int] = SIZES,
    target: Path = TARGET,
    only_largest: bool = False,
    body_width: float = BODY_WIDTH,
    measure_at: float | None = None,
) -> None:
    image = Image.open(SOURCE / f'{name}.png').convert('RGBA')
    pixels = np.array(image)
    alpha = pixels[:, :, 3]
    alpha[alpha < HAZE] = 0
    if only_largest:
        alpha[~largest_part(alpha > 0)] = 0
    pixels[alpha == 0] = 0
    mask = alpha > 0
    ys, xs = np.where(mask)
    top, bottom = ys.min(), ys.max()
    height = bottom - top
    lower = range(int(top + height * 0.5), bottom + 1)
    body = max(widest_run(mask[y]) for y in lower) * BODY_FIX.get(name, 1)
    if measure_at is not None:
        # Kroppen mäts nära foten, under armarna, så att utsträckta armar och händer inte räknas.
        body = widest_run(mask[int(top + height * measure_at)])
    cleaned = Image.fromarray(pixels).crop((xs.min(), top, xs.max() + 1, bottom + 1))
    # Kroppens mitt: mitten av den bredaste raden i nedre halvan.
    widest_y = max(lower, key=lambda y: widest_run(mask[y]))
    row = np.where(mask[widest_y])[0]
    center_x = (row.min() + row.max()) / 2 - xs.min()
    scale = body_width / body
    for suffix, size in sizes.items():
        unit = size / 200
        width = round(cleaned.width * scale * unit)
        height_px = round(cleaned.height * scale * unit)
        resized = cleaned.resize((width, height_px), Image.LANCZOS)
        canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        left = round(100 * unit - center_x * scale * unit)
        upper = round(BASELINE * unit - height_px)
        if upper < 0 or left < 0 or left + width > size:
            print(f'  {name}{suffix}: sticker utanför rutan (vänster {left}, överst {upper}, höger {left + width})')
        canvas.alpha_composite(resized, (max(0, left), max(0, upper)), (max(0, -left), max(0, -upper)))
        canvas.save(target / f'{name}{suffix}.webp', 'WEBP', quality=86, method=6)
    print(f'{name}: kropp {body:.0f} px, skala {scale:.3f}')


# Hero-figurerna på startsidan: 240 px räcker (de är cirka 55 px höga, även på en skärm med tät upplösning).
HERO = ['hero-1', 'hero-2', 'hero-3', 'hero-4']
HERO_SIZES = {'': 240}
HERO_TARGET = TARGET / 'hero'
# Kroppens bredd mäts på den här höjden (andel av figurens höjd), och blir HERO_BODY_WIDTH av 200: smalare än
# spelarfigurerna, så att armar, hörlurar och partyhatten får plats i rutan.
HERO_MEASURE_AT = 0.88
HERO_BODY_WIDTH = 118


# Bilder som bara beskärs till figuren och sparas i en bredd (px).
CROPPED = {'sjusovaren-kant': 300}


def crop(name: str, width: int) -> None:
    pixels = np.array(Image.open(SOURCE / f'{name}.png').convert('RGBA'))
    alpha = pixels[:, :, 3]
    alpha[alpha < HAZE] = 0
    pixels[alpha == 0] = 0
    ys, xs = np.where(alpha > 0)
    cleaned = Image.fromarray(pixels).crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    height = round(cleaned.height * width / cleaned.width)
    cleaned.resize((width, height), Image.LANCZOS).save(TARGET / f'{name}.webp', 'WEBP', quality=86, method=6)
    print(f'{name}: {width} × {height}')


if __name__ == '__main__':
    TARGET.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        prepare(name)
    for name, width in CROPPED.items():
        crop(name, width)
    HERO_TARGET.mkdir(exist_ok=True)
    for name in HERO:
        prepare(name, HERO_SIZES, HERO_TARGET, only_largest=True, body_width=HERO_BODY_WIDTH, measure_at=HERO_MEASURE_AT)
