"""Immutable 28 October research fixture: exact activities and qualified costs."""
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).parent

class October28ResearchTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.before = json.loads((ROOT / "research/verified-candidates-2026-10-27.json").read_text())
        cls.after = json.loads((ROOT / "research/verified-candidates-2026-10-28.json").read_text())
        cls.records = {r["id"]: r for r in cls.after["records"]}

    def test_only_reviewed_existing_records_receive_new_verification(self):
        reviewed = set(self.after["coverage"]["selected_reviewed_ids"])
        for old in self.before["records"]:
            new = self.records[old["id"]]
            if old["id"] in reviewed:
                self.assertEqual(new["verified_at"], "2026-10-28")
            else:
                self.assertEqual(old, new)
        self.assertEqual(len(self.records), len(self.after["records"]))

    def test_aardman_uses_current_route_and_does_not_infer_free_map(self):
        r = self.records["bristol-aardman-mini-museum-hunt-2026"]
        self.assertEqual(r["price_type"], "unknown")
        self.assertIn("TBC", r["price_text"])
        self.assertTrue(r["sources"][0]["url"].endswith("/museum-hunt-aardman/"))
        self.assertEqual([o["start"] for o in r["occurrences"]], ["2026-10-31", "2026-11-01"])
        self.assertEqual(r["sheet_match"]["row_id"], 146)
        self.assertEqual(r["sheet_match"]["event_rows"], [172])

    def test_zine_keeps_specific_age_and_pair_price_basis(self):
        r = self.records["exeter-phoenix-spooky-zine-2026"]
        self.assertIn("6+", r["age_text"])
        self.assertIn("£24 per pair", r["price_text"])
        self.assertIn("£1.50", r["price_text"])
        self.assertEqual(r["occurrences"][0]["start_time"], "10:30")
        self.assertEqual(r["occurrences"][0]["end_time"], "13:00")
        self.assertEqual(r["sheet_match"]["row_id"], 212)
        self.assertEqual(r["sheet_match"]["event_rows"], [262])

    def test_blaise_quote_is_date_specific_not_every_day(self):
        r = self.records["blaise-museum-autumn-week-2026"]
        self.assertIn("31 October 11am", r["price_text"])
        self.assertIn("1 November", r["price_text"])
        self.assertIn("TBC", r["price_text"])
        self.assertTrue(any(s["url"] == "https://pretix.eu/bristolmuseums/33pus/5012306/" for s in r["sources"]))
        self.assertFalse(any(o["start"] <= "2026-10-28" <= o["end"] for o in r["occurrences"]))

if __name__ == "__main__":
    unittest.main()

