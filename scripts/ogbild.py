"""Gör delningsbilderna (Open Graph, 1200 × 630) för spelsidorna till spel med ett eget paket.

Bakgrunden är spelets mönster upprepat över hela bilden. I mitten ligger en krämvit ruta med en kant i spelets färg,
som spelkortet på startsidan, med spelets logga stort på. Bilderna används av spelsidorna (image i spelsidor.ts).

- public/og/exploderande-tanter.jpg: väntrummets mönster, krämvit ruta med vinröd kant.
- public/og/imposterjakten.png: det mörka mönstret (Nattspanarna), krämvit ruta med lampgul kant.

Kör: python scripts/ogbild.py (kräver Pillow).
"""
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = (1200, 630)
# Rutan i mitten: storlek, rundning och kantens tjocklek.
CARD = (860, 480)
RADIUS = 44
BORDER = 10
# JPEG med kvalitet 85 ger en liten fil (cirka 100 kB) utan synlig skillnad mot PNG, som blev nästan fyra gånger större.
QUALITY = 85


@dataclass
class Picture:
    pattern: Path
    # Mönstrets ruta i bilden (px), ungefär som det visas i väntrummet.
    tile: int
    logo: Path
    # Loggans största höjd och bredd i rutan (px).
    logo_height: int
    logo_width: int
    # Rutans färg, kantens färg och skuggans färg under rutan.
    paper: tuple[int, int, int]
    border: tuple[int, int, int]
    shadow: tuple[int, int, int, int]
    target: Path


PICTURES = [
    # Exploderande Tanter: tant-kram-2 och tant-vinrod i src/index.css.
    Picture(
        pattern=Path('public/images/tantpanik/vantrum-monster.webp'),
        tile=320,
        logo=Path('public/images/tantpanik/logga.webp'),
        logo_height=390,
        logo_width=760,
        paper=(255, 248, 236),
        border=(142, 27, 48),
        shadow=(70, 20, 30, 90),
        target=Path('public/og/exploderande-tanter.jpg'),
    ),
    # Imposterjakten: natt-kram och natt-lampa. Filen är en png, som den förra bilden, så att adressen är densamma.
    Picture(
        pattern=Path('public/images/imposterjakten/monster-mork.webp'),
        tile=256,
        logo=Path('public/images/imposterjakten/logga.webp'),
        logo_height=390,
        logo_width=740,
        paper=(245, 233, 207),
        border=(242, 193, 78),
        shadow=(0, 0, 0, 150),
        target=Path('public/og/imposterjakten.png'),
    ),
]


def background(picture: Picture) -> Image.Image:
    """Mönstret upprepat över hela bilden."""
    tile = Image.open(picture.pattern).convert('RGB').resize((picture.tile, picture.tile), Image.LANCZOS)
    image = Image.new('RGB', SIZE)
    for x in range(0, SIZE[0], picture.tile):
        for y in range(0, SIZE[1], picture.tile):
            image.paste(tile, (x, y))
    return image


def card_box() -> tuple[int, int, int, int]:
    left = (SIZE[0] - CARD[0]) // 2
    top = (SIZE[1] - CARD[1]) // 2
    return (left, top, left + CARD[0], top + CARD[1])


def make(picture: Picture) -> None:
    image = background(picture).convert('RGBA')
    box = card_box()

    # En mjuk skugga under rutan, så att den lyfter från mönstret.
    shadow = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((box[0], box[1] + 10, box[2], box[3] + 10), RADIUS, fill=picture.shadow)
    image = Image.alpha_composite(image, shadow.filter(ImageFilter.GaussianBlur(14)))

    # Rutan ritas i dubbel storlek och skalas ned, så att den rundade kanten blir mjuk.
    scale = 2
    layer = Image.new('RGBA', (SIZE[0] * scale, SIZE[1] * scale), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        tuple(value * scale for value in box), RADIUS * scale, fill=picture.paper + (255,), outline=picture.border + (255,), width=BORDER * scale
    )
    image = Image.alpha_composite(image, layer.resize(SIZE, Image.LANCZOS))

    # Loggan så stor som får plats i rutan.
    logo = Image.open(picture.logo).convert('RGBA')
    ratio = min(picture.logo_height / logo.height, picture.logo_width / logo.width)
    logo = logo.resize((round(logo.width * ratio), round(logo.height * ratio)), Image.LANCZOS)
    image.alpha_composite(logo, ((SIZE[0] - logo.width) // 2, (SIZE[1] - logo.height) // 2))

    picture.target.parent.mkdir(parents=True, exist_ok=True)
    if picture.target.suffix == '.png':
        # Färre färger ger en liten png utan synlig skillnad (bilden har få färger).
        image.convert('RGB').quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(picture.target, 'PNG', optimize=True)
    else:
        image.convert('RGB').save(picture.target, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    print(f'{picture.target}: {SIZE[0]} × {SIZE[1]}, {picture.target.stat().st_size // 1024} kB')


if __name__ == '__main__':
    for picture in PICTURES:
        make(picture)
