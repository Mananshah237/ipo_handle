import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('sync_data', Path(__file__).resolve().parents[1] / 'scripts/sync-data.py')
sync = importlib.util.module_from_spec(spec)
spec.loader.exec_module(sync)
RAW = (Path(__file__).parent / 'fixtures/gmptoday-live.json').read_bytes()

class SyncTests(unittest.TestCase):
    def test_live_fixture(self):
        data = sync.normalize(json.loads(RAW))
        self.assertEqual(len(data['ipos']), 35)
        self.assertTrue(any(i['history'] for i in data['ipos']))
        lcc = next(i for i in data['ipos'] if i['id'] == 'lcc-projects')
        self.assertEqual(lcc['gmpPercent'], 41.1)
        # median_pct is a graphic marker position, NOT the GMP/issue-price ratio.
        self.assertAlmostEqual(lcc['gmpPercent'], lcc['gmp'] / lcc['priceMax'] * 100, places=1)

    def test_optional_missing_and_malformed(self):
        data = sync.normalize({'generated_at': '2026-09-12T00:00:00Z', 'ipos': [{'slug': 'sample', 'name': 'Sample', 'lot_size': 'invalid', 'history': None}]})
        self.assertNotIn('lotSize', data['ipos'][0])
        self.assertEqual(data['ipos'][0]['history'], [])

    def test_required_fields(self):
        for change in ({'ipos': []}, {'generated_at': None}, {'ipos': [{'slug': 'a'}]}):
            data = json.loads(RAW)
            data.update(change)
            with self.assertRaises((ValueError, TypeError)):
                sync.normalize(data)

    def test_boa_date_formats(self):
        # boa_date is null upstream today; when it arrives it must parse in every observed format.
        for raw in ('2026-09-16', '16 Sep 2026', '16-Sep-2026', '16 Sept 2026', '16 September 2026'):
            data = sync.normalize({'generated_at': '2026-09-12T00:00:00Z', 'ipos': [{'slug': 'sample', 'name': 'Sample', 'boa_date': raw}]})
            self.assertEqual(data['ipos'][0]['allotmentDate'], '2026-09-16')
        data = sync.normalize({'generated_at': '2026-09-12T00:00:00Z', 'ipos': [{'slug': 'sample', 'name': 'Sample', 'boa_date': None}]})
        self.assertNotIn('allotmentDate', data['ipos'][0])

    def test_hash(self):
        raw = json.loads(RAW)
        before = sync.meaningful_hash(sync.normalize(raw))
        raw['generated_at'] = '2026-09-13T00:00:00Z'
        raw['generated_display'] = 'different'
        raw['ipos'][0]['prose'] = 'generation-only HTML'
        self.assertEqual(before, sync.meaningful_hash(sync.normalize(raw)))
        raw['ipos'][0]['median_gmp'] += 1
        self.assertNotEqual(before, sync.meaningful_hash(sync.normalize(raw)))

    def test_failure_and_noop_preserve_latest(self):
        with tempfile.TemporaryDirectory(dir=Path(__file__).parent) as temp:
            directory = Path(temp)
            self.assertTrue(sync.sync(directory, lambda: RAW))
            previous = (directory / 'latest.json').read_bytes()
            raw = json.loads(RAW)
            raw['generated_at'] = '2026-09-13T00:00:00Z'
            self.assertFalse(sync.sync(directory, lambda: json.dumps(raw).encode()))
            for fetcher in (lambda: b'broken', lambda: b'{"ipos": []}', lambda: (_ for _ in ()).throw(TimeoutError())):
                with self.assertRaises(Exception):
                    sync.sync(directory, fetcher)
                self.assertEqual(previous, (directory / 'latest.json').read_bytes())
            self.assertEqual(len(list((directory / 'snapshots').glob('*.json'))), 1)

if __name__ == '__main__':
    unittest.main()
