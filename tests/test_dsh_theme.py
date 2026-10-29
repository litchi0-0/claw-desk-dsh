import json
import hashlib
import unittest
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1] / 'themes' / 'dsh-whale-chan'


class ThemeAssetsTest(unittest.TestCase):
    def test_preserves_24fps_cadence(self):
        manifest = json.loads((ROOT / 'sources.json').read_text())
        for key, metadata in manifest['assets'].items():
            self.assertEqual(metadata.get('encoding', {}).get('fps'), 24, key)
            with Image.open(ROOT / 'assets' / (key + '.webp')) as image:
                self.assertEqual(image.n_frames, metadata['frames'], key)
                elapsed = 0
                for index in range(image.n_frames):
                    image.seek(index)
                    image.load()
                    elapsed += image.info['duration']
                    # WebP stores integer milliseconds; boundaries must track the 24 Hz clock.
                    ticks = elapsed * 24 / 1000
                    self.assertLessEqual(abs(ticks - round(ticks)), 0.025, key)
                self.assertLessEqual(abs(elapsed - metadata['sourceFrames'] * 1000 / 24), 1, key)

    def test_idle_duration_matches_full_animation(self):
        theme = json.loads((ROOT / 'theme.json').read_text())
        for entry in theme.get('manualAnimations', theme['idleAnimations']):
            with self.subTest(asset=entry['file']), Image.open(ROOT / 'assets' / entry['file']) as image:
                duration = 0
                for index in range(image.n_frames):
                    image.seek(index)
                    image.load()
                    duration += image.info['duration']
                self.assertLessEqual(abs(duration - entry['duration']), 2)

    def test_source_manifest_matches_outputs(self):
        manifest = json.loads((ROOT / 'sources.json').read_text())
        for key, metadata in manifest['assets'].items():
            data = (ROOT / 'assets' / (key + '.webp')).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), metadata['outputSha256'])

    def test_state_assets_are_animated_and_transparent(self):
        theme = json.loads((ROOT / 'theme.json').read_text())
        self.assertTrue({'idle', 'thinking', 'working', 'sleeping'} <= theme['states'].keys())
        refs = {f for files in theme['states'].values() for f in files}
        refs.update(x['file'] for x in theme['idleAnimations'])
        refs.update(x['file'] for x in theme.get('manualAnimations', []))
        for reaction in theme['reactions'].values():
            refs.update(reaction.get('files', [reaction.get('file')]))
        for name in refs:
            with self.subTest(asset=name), Image.open(ROOT / 'assets' / name) as image:
                self.assertGreater(image.n_frames, 1)
                visible = False
                for index in range(image.n_frames):
                    image.seek(index)
                    self.assertEqual(image.size, (480, 270))
                    alpha = image.convert('RGBA').getchannel('A')
                    # Some special effects fade out; opaque pixels are not required in every frame.
                    self.assertEqual(alpha.getextrema()[0], 0)
                    box = alpha.getbbox()
                    visible |= box is not None
                self.assertTrue(visible, 'Animation must contain a visible character or effect')

    def test_entire_preview_catalog_is_imported(self):
        catalog = json.loads((ROOT / 'catalog.json').read_text())
        theme = json.loads((ROOT / 'theme.json').read_text())
        manifest = json.loads((ROOT / 'sources.json').read_text())
        self.assertEqual(len(catalog['assets']), 106)
        self.assertEqual({a['id'] + '.webp' for a in catalog['assets']},
                         {a['file'] for a in theme['manualAnimations']})
        self.assertEqual(len(theme['manualAnimations']), 106)
        for item in catalog['assets']:
            self.assertEqual(manifest['assets'][item['id']]['sourceGitBlobSha'], item['sourceGitBlobSha'])


if __name__ == '__main__':
    unittest.main()
