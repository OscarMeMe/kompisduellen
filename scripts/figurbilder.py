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


def prepare(name: str) -> None:
    image = Image.open(SOURCE / f'{name}.png').convert('RGBA')
    pixels = np.array(image)
    alpha = pixels[:, :, 3]
    alpha[alpha < HAZE] = 0
    pixels[alpha == 0] = 0
    mask = alpha > 0
    ys, xs = np.where(mask)
    top, bottom = ys.min(), ys.max()
    height = bottom - top
    lower = range(int(top + height * 0.5), bottom + 1)
    body = max(widest_run(mask[y]) for y in lower) * BODY_FIX.get(name, 1)
    cleaned = Image.fromarray(pixels).crop((xs.min(), top, xs.max() + 1, bottom + 1))
    # Kroppens mitt: mitten av den bredaste raden i nedre halvan.
    widest_y = max(lower, key=lambda y: widest_run(mask[y]))
    row = np.where(mask[widest_y])[0]
    center_x = (row.min() + row.max()) / 2 - xs.min()
    scale = BODY_WIDTH / body
    for suffix, size in SIZES.items():
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
        canvas.save(TARGET / f'{name}{suffix}.webp', 'WEBP', quality=86, method=6)
    print(f'{name}: kropp {body:.0f} px, skala {scale:.3f}')


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
