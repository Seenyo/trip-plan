"""Run with Python + Pillow: python3 tests/test_attachment_compression.py."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from PIL import Image

SCRIPT = Path(__file__).resolve().parents[1] / 'scripts' / 'compress-attachment.py'


class AttachmentCompressionTest(unittest.TestCase):
    def compress(self, source, full, thumbnail):
        return json.loads(subprocess.check_output(
            [sys.executable, str(SCRIPT), str(source), str(full), str(thumbnail)], text=True))

    def test_animated_gif_does_not_abort_or_overwrite_original(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source, full, thumbnail = root / 'animation.gif', root / 'full.webp', root / 'thumb.webp'
            frames = [Image.new('RGB', (32, 32), color) for color in ['red', 'blue']]
            frames[0].save(source, save_all=True, append_images=frames[1:], duration=100, loop=0)
            original = source.read_bytes()
            result = self.compress(source, full, thumbnail)
            self.assertTrue(result['skipped'])
            self.assertEqual(source.read_bytes(), original)
            self.assertFalse(full.exists())
            self.assertFalse(thumbnail.exists())
            # A following static image is still processed successfully.
            photo = root / 'photo.png'
            Image.new('RGB', (2000, 1000), 'green').save(photo)
            result = self.compress(photo, full, thumbnail)
            self.assertNotIn('skipped', result)
            with Image.open(full) as image:
                self.assertEqual(image.size, (1600, 800))
            with Image.open(thumbnail) as image:
                self.assertEqual(image.size, (480, 240))


if __name__ == '__main__':
    unittest.main()
