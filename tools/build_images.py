"""Génère les variantes AVIF + JPEG responsive à partir de src-img/."""
from PIL import Image
import glob, os
SRC = 'src-img'; OUT = 'img'
WIDTHS = [320, 480, 720, 960]
for f in sorted(glob.glob(f'{SRC}/*.jpg')):
    name = os.path.splitext(os.path.basename(f))[0]
    im = Image.open(f).convert('RGB')
    for w in WIDTHS:
        ww = min(w, im.width)
        r = im.resize((ww, round(im.height * ww / im.width)), Image.LANCZOS) if ww != im.width else im
        r.save(f'{OUT}/{name}-{w}.avif', quality=58, speed=4)
        if w == 960:
            r.save(f'{OUT}/{name}-{w}.jpg', quality=78, optimize=True, progressive=True)
    print(name, im.size)
