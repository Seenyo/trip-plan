"""Create immutable full/thumbnail variants. Requires Pillow; preserves originals."""
import json
import sys
from pathlib import Path
from PIL import Image, ImageOps

source, full_path, thumbnail_path = map(Path, sys.argv[1:4])
with Image.open(source) as image:
    if getattr(image, 'is_animated', False):
        raise ValueError('Animated image: leave its original unchanged')
    image = ImageOps.exif_transpose(image).convert('RGBA')
    for output, edge, quality in [(full_path, 1600, 82), (thumbnail_path, 480, 75)]:
        variant = image.copy()
        variant.thumbnail((edge, edge), Image.Resampling.LANCZOS)
        variant.save(output, 'WEBP', quality=quality, method=6)
print(json.dumps({'original': source.stat().st_size, 'full': full_path.stat().st_size,
                  'thumbnail': thumbnail_path.stat().st_size}))
