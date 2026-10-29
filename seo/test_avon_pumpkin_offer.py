import json
import unittest
from pathlib import Path

HERE = Path(__file__).resolve().parent


class AvonPumpkinOfferTests(unittest.TestCase):
    def test_promotion_is_date_limited_and_does_not_make_admission_free(self):
        source = json.loads((HERE / 'research/verified-candidates-2026-10-29.json').read_text())
        old = json.loads((HERE / 'research/verified-candidates-2026-10-28.json').read_text())
        current = next(r for r in source['records'] if r['id'] == 'avon-valley-pumpkin-patch-2026')
        previous = next(r for r in old['records'] if r['id'] == current['id'])
        self.assertEqual(current['price_type'], 'paid')
        self.assertIn('28–31 October', current['price_text'])
        self.assertIn('one free orange field pumpkin per child', current['price_text'])
        self.assertIn('exact 2026 entry price TBC', current['price_text'])
        self.assertEqual(current['occurrences'], previous['occurrences'])
        self.assertEqual(current['verified_at'], '2026-10-29')
        self.assertNotEqual(current['sheet_bindings'][0]['fingerprint'], previous['sheet_bindings'][0]['fingerprint'])
        for row in source['records']:
            if row['id'] != current['id']:
                self.assertEqual(row, next(r for r in old['records'] if r['id'] == row['id']))


if __name__ == '__main__':
    unittest.main()
