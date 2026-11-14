"""Gör delningsbilden (Open Graph, 1200 × 630) för Exploderande Tanters spelsida.

Bakgrunden är väntrummets mönster (public/images/tantpanik/vantrum-monster.webp) upprepat över hela bilden. I mitten
ligger en krämvit ruta med vinröd kant, som spelkortet på startsidan, med spelets logga (logga.webp) stort på.
Bilden sparas som public/og/exploderande-tanter.jpg och används av spelsidan (image i spelsidor.ts).

Kör: python scripts/ogbild.py (kräver Pillow).
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

PATTERN = Path('public/images/tantpanik/vantrum-monster.webp')
LOGO = Path('public/images/tantpanik/logga.webp')
TARGET = Path('public/og/exploderande-tanter.jpg')
# JPEG med kvalitet 85 ger en liten fil (cirka 100 kB) utan synlig skillnad mot PNG, som blev nästan fyra gånger större.
QUALITY = 85

SIZE = (1200, 630)
# Mönstrets ruta i bilden (px). Originalet är 1024 px, och i väntrummet visas det i ungefär den här storleken.
TILE = 320
# Rutan i mitten: storlek, rundning, kantens tjocklek och färgerna (tant-kram-2 och tant-vinrod i src/index.css).
CARD = (860, 480)
RADIUS = 44
BORDER = 10
CREAM = (255, 248, 236)
WINE = (142, 27, 48)
# Loggans höjd i rutan (px).
LOGO_HEIGHT = 390


def background() -> Image.Image:
    """Mönstret upprepat över hela bilden."""
    tile = Image.open(PATTERN).convert('RGB').resize((TILE, TILE), Image.LANCZOS)
    image = Image.new('RGB', SIZE)
    for x in range(0, SIZE[0], TILE):
        for y in range(0, SIZE[1], TILE):
            image.paste(tile, (x, y))
    return image


def card_box() -> tuple[int, int, int, int]:
    left = (SIZE[0] - CARD[0]) // 2
    top = (SIZE[1] - CARD[1]) // 2
    return (left, top, left + CARD[0], top + CARD[1])


def main() -> None:
    image = background().convert('RGBA')
    box = card_box()

    # En mjuk skugga under rutan, så att den lyfter från mönstret.
    shadow = Image.new('RGBA', SIZE, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle((box[0], box[1] + 10, box[2], box[3] + 10), RADIUS, fill=(70, 20, 30, 90))
    image = Image.alpha_composite(image, shadow.filter(ImageFilter.GaussianBlur(14)))

    # Rutan ritas i dubbel storlek och skalas ned, så att den rundade kanten blir mjuk.
    scale = 2
    layer = Image.new('RGBA', (SIZE[0] * scale, SIZE[1] * scale), (0, 0, 0, 0))
    ImageDraw.Draw(layer).rounded_rectangle(
        tuple(value * scale for value in box), RADIUS * scale, fill=CREAM + (255,), outline=WINE + (255,), width=BORDER * scale
    )
    image = Image.alpha_composite(image, layer.resize(SIZE, Image.LANCZOS))

    logo = Image.open(LOGO).convert('RGBA')
    width = round(logo.width * LOGO_HEIGHT / logo.height)
    logo = logo.resize((width, LOGO_HEIGHT), Image.LANCZOS)
    image.alpha_composite(logo, ((SIZE[0] - width) // 2, (SIZE[1] - LOGO_HEIGHT) // 2))

    TARGET.parent.mkdir(parents=True, exist_ok=True)
    image.convert('RGB').save(TARGET, 'JPEG', quality=QUALITY, optimize=True, progressive=True)
    print(f'{TARGET}: {SIZE[0]} × {SIZE[1]}, {TARGET.stat().st_size // 1024} kB')


if __name__ == '__main__':
    main()
