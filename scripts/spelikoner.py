"""Förbereder spelens egna ikoner: små bilder som visas i stället för emojin där spelets ikon står i liten storlek
(spelvalet och rubrikraden i väntrummet, listorna på spelsidorna och guiderna).

Alla ikoner är 256 × 256 med genomskinlig bakgrund, som emojierna i public/emoji. Originalen ändras aldrig.

- public/images/imposterjakten/ikon.webp: detektiven utan ljuskägla (docs/skisser/imposterjakten/
  spelkort-detektiv-utan-kagla.png), beskuren till figuren och centrerad i en kvadrat.
- public/images/tantpanik/ikon.webp: huvudet på den exploderande tanten (docs/tantpanik-original/
  exploderande-tant.png) i en rund bricka med vinröd kant.

Kör: python scripts/spelikoner.py (kräver Pillow och numpy).
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

SIZE = 256
# Ritas i dubbel storlek och skalas ned, så att kanterna blir mjuka.
OVER = 2
ALPHA_EDGE = 40
# Vinrött som i Exploderande Tanters stil (--tant-vinrod).
RING = (0x8E, 0x1B, 0x30, 255)
RING_WIDTH = 0.045
# Rutan runt tantens huvud i kortbilden, som andelar av bildens bredd och höjd (vänster, topp, höger, botten). Kvadratisk
# i pixlar: huvudet med håret och smällen bakom, ned till hakan.
TANT_HEAD = (0.207, 0.207, 0.823, 0.656)


def save(image: Image.Image, target: Path) -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, 'WEBP', quality=90, method=6)
    print(f'{target}: {image.width} × {image.height}, {target.stat().st_size // 1024} kB')


def detective() -> None:
    original = Image.open('docs/skisser/imposterjakten/spelkort-detektiv-utan-kagla.png').convert('RGBA')
    alpha = np.asarray(original)[..., 3]
    rows = np.where((alpha > ALPHA_EDGE).mean(axis=1) > 0.01)[0]
    columns = np.where((alpha > ALPHA_EDGE).mean(axis=0) > 0.01)[0]
    cropped = original.crop((int(columns[0]), int(rows[0]), int(columns[-1]) + 1, int(rows[-1]) + 1))
    scale = SIZE / max(cropped.size)
    small = cropped.resize((round(cropped.width * scale), round(cropped.height * scale)), Image.LANCZOS)
    icon = Image.new('RGBA', (SIZE, SIZE), (0, 0, 0, 0))
    icon.alpha_composite(small, ((SIZE - small.width) // 2, (SIZE - small.height) // 2))
    save(icon, Path('public/images/imposterjakten/ikon.webp'))


def tant() -> None:
    original = Image.open('docs/tantpanik-original/exploderande-tant.png').convert('RGB')
    left, top, right, bottom = TANT_HEAD
    box = (round(left * original.width), round(top * original.height), round(right * original.width), round(bottom * original.height))
    big = SIZE * OVER
    head = original.crop(box).resize((big, big), Image.LANCZOS).convert('RGBA')
    mask = Image.new('L', (big, big), 0)
    ImageDraw.Draw(mask).ellipse((2, 2, big - 3, big - 3), fill=255)
    head.putalpha(mask)
    ImageDraw.Draw(head).ellipse((2, 2, big - 3, big - 3), outline=RING, width=round(big * RING_WIDTH))
    save(head.resize((SIZE, SIZE), Image.LANCZOS), Path('public/images/tantpanik/ikon.webp'))


if __name__ == '__main__':
    detective()
    tant()
