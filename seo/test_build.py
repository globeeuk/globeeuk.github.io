"""Guard the expensive mistakes: wrong dates, free claims and stale publication."""
import copy
import json
import tempfile
import unittest
from datetime import date, datetime, timezone
from html.parser import HTMLParser
from pathlib import Path

from build import LONDON, build, choose, guide, validate, weekend
from prepare_catalog import prepare

HERE = Path(__file__).parent
TODAY = date(2026, 9, 10)


class GuideChecks(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Keep regression dates independent of tomorrow's live publication snapshot.
        cls.catalog = prepare(json.loads((HERE / "research/verified-candidates-2026-09-10.json").read_text()))
        cls.items = validate(cls.catalog, TODAY)

    def test_current_weekend_is_not_invented_from_evergreen_opening_hours(self):
        selected = choose(self.items, "this-weekend", TODAY)
        self.assertGreaterEqual(len(selected), 2)
        self.assertTrue(all(i["kind"] == "event" for i in selected))
        self.assertNotIn("ramm", [i["id"] for i in selected])

    def test_sunday_uses_the_current_weekend_and_excludes_saturday_only(self):
        sunday = date(2026, 9, 13)
        self.assertEqual(weekend(sunday), (date(2026, 9, 12), sunday))
        ids = [i["id"] for i in choose(self.items, "this-weekend", sunday)]
        self.assertIn("killerton-heritage-open-days-2026", ids)
        self.assertNotIn("quayside-shanty-festival-2026", ids)

    def test_dst_weekend_uses_calendar_dates(self):
        self.assertEqual(weekend(date(2026, 10, 25)), (date(2026, 10, 24), date(2026, 10, 25)))

    def test_sunday_event_is_removed_at_its_london_end_time(self):
        # 16:00 UTC is 17:00 in London in September.
        before = datetime(2026, 9, 13, 15, 59, tzinfo=timezone.utc)
        closed = datetime(2026, 9, 13, 16, 0, tzinfo=timezone.utc)
        self.assertIn("killerton-heritage-open-days-2026", [i["id"] for i in choose(self.items, "this-weekend", before)])
        self.assertNotIn("killerton-heritage-open-days-2026", [i["id"] for i in choose(self.items, "this-weekend", closed)])

    def test_unknown_end_time_lasts_until_local_day_end(self):
        item = copy.deepcopy(next(i for i in self.items if i["id"] == "killerton-heritage-open-days-2026"))
        item["occurrences"] = [{"start": "2026-09-13"}]
        self.assertEqual(len(choose([item], "this-weekend", datetime(2026, 9, 13, 23, 59, tzinfo=LONDON))), 1)
        self.assertEqual(choose([item], "this-weekend", datetime(2026, 9, 14, 0, 0, tzinfo=LONDON)), [])

    def test_end_time_after_autumn_clock_change_uses_gmt(self):
        item = copy.deepcopy(next(i for i in self.items if i["kind"] == "event"))
        item.update(verified_at="2026-10-24", occurrences=[{"start": "2026-10-25", "end_time": "17:00"}])
        self.assertEqual(len(choose([item], "this-weekend", datetime(2026, 10, 25, 16, 59, tzinfo=timezone.utc))), 1)
        self.assertEqual(choose([item], "this-weekend", datetime(2026, 10, 25, 17, 0, tzinfo=timezone.utc)), [])

    def test_next_weekend_stays_in_its_own_dated_section_after_current_events_end(self):
        upcoming = []
        for number, event_date in enumerate(("2026-09-19", "2026-09-20"), 1):
            item = copy.deepcopy(next(i for i in self.items if i["kind"] == "event"))
            item.update(id=f"next-event-{number}", name=f"Future family event {number}",
                        occurrences=[{"start": event_date, "start_time": "10:00", "end_time": "16:00"}])
            upcoming.append(item)
        moment = datetime(2026, 9, 13, 18, 0, tzinfo=LONDON)
        page, selected, indexable = guide("this-weekend", self.items + upcoming, moment, True)
        current_section, next_section = page.split('<section class="weekend-section" id="next-weekend"')
        self.assertIn("No remaining confirmed events", current_section)
        self.assertNotIn('<article class="activity"', current_section)
        self.assertIn('datetime="2026-09-12"', current_section)
        self.assertIn('datetime="2026-09-19"', next_section)
        self.assertIn("Future family event 1", next_section)
        self.assertIn("Future family event 2", next_section)
        self.assertEqual({item["id"] for item in selected}, {"next-event-1", "next-event-2"})
        self.assertTrue(indexable)

    def test_repeated_activity_has_separate_occurrences_and_unique_anchors(self):
        item = copy.deepcopy(next(i for i in self.items if i["kind"] == "event"))
        item["occurrences"] = [{"start": "2026-09-12"}, {"start": "2026-09-19"}]
        self.assertEqual(choose([item], "this-weekend", TODAY)[0]["occurrences"], [{"start": "2026-09-12"}])
        self.assertEqual(choose([item], "this-weekend", TODAY, week_offset=1)[0]["occurrences"], [{"start": "2026-09-19"}])
        page, selected, indexable = guide("this-weekend", [item], TODAY, True)
        self.assertEqual(len(selected), 1)
        self.assertFalse(indexable)  # One option repeated twice is still one option.
        self.assertIn(f'id="{item["id"]}"', page)
        self.assertIn(f'id="{item["id"]}-next-weekend"', page)
        self.assertEqual(len(item["occurrences"]), 2)  # The source stays untouched.

    def test_invalid_or_reversed_explicit_times_are_rejected(self):
        for occurrence in ({"start": "2026-09-12", "end_time": "25:00"},
                           {"start": "2026-09-12", "start_time": "18:00", "end_time": "17:00"}):
            data = copy.deepcopy(self.catalog)
            next(i for i in data["items"] if i["kind"] == "event")["occurrences"] = [occurrence]
            with self.assertRaises(ValueError):
                validate(data, TODAY)

    def test_expired_verification_is_not_refreshed_by_running_a_build(self):
        for slug in ("this-weekend", "free-things-to-do", "rainy-day"):
            self.assertEqual(choose(self.items, slug, date(2026, 11, 1)), [])

    def test_free_word_in_a_paid_price_never_makes_an_activity_free(self):
        item = copy.deepcopy(next(i for i in self.items if i["id"] == "ramm"))
        item.update(price_type="paid", price_text="£8.50 per child; accompanying adults free")
        self.assertEqual(choose([item], "free-things-to-do", TODAY), [])

    def test_free_event_does_not_turn_into_year_round_free_admission(self):
        self.assertTrue(all(i["kind"] == "place" for i in choose(self.items, "free-things-to-do", TODAY)))

    def test_unrecognised_region_is_rejected(self):
        data = copy.deepcopy(self.catalog)
        data["items"][0]["region"] = "nottingham"
        with self.assertRaises(ValueError):
            validate(data, TODAY)

    def test_thin_or_empty_page_is_not_indexed(self):
        page, _, indexable = guide("this-weekend", [], TODAY, True)
        self.assertFalse(indexable)
        self.assertIn('content="noindex,follow"', page)

    def test_text_and_structured_data_are_escaped(self):
        data = copy.deepcopy(self.items)
        data[0]["name"] = '</script><script>alert("test")</script>'
        page, _, _ = guide("this-weekend", data, TODAY, False)
        self.assertNotIn('<script>alert(', page)
        self.assertIn('&lt;/script&gt;', page)

    def test_preview_and_production_have_different_indexing(self):
        with tempfile.TemporaryDirectory() as d:
            destination = Path(d)
            fixture = destination / "fixture.json"
            fixture.write_text(json.dumps(self.catalog))
            preview = build(fixture, destination, TODAY)
            self.assertFalse(any(p["indexable"] for p in preview["pages"]))
            self.assertNotIn("googletagmanager", (destination / "exeter/index.html").read_text())
            self.assertNotIn("analytics.js", (destination / "exeter/index.html").read_text())
            self.assertNotIn("analytics-choice", (destination / "exeter/index.html").read_text())
            production = build(fixture, destination, TODAY, True)
            self.assertTrue(all(p["indexable"] for p in production["pages"]))
            sitemap = (destination / "seo-sitemap.xml").read_text()
            self.assertNotIn("/globee/", sitemap)
            self.assertNotIn("lastmod", sitemap)
            html = (destination / "exeter/this-weekend/index.html").read_text()
            self.assertIn('rel="canonical" href="https://globeeuk.github.io/exeter/this-weekend/"', html)
            self.assertIn("Quayside Shanty", html)
            self.assertNotIn("fetch(", html)
            self.assertIn('<script defer src="/analytics.js"></script>', html)
            self.assertNotIn("googletagmanager", html)
            self.assertNotIn("gtag(", html)
            self.assertEqual(html.count('id="analytics-choice"'), 1)
            self.assertIn('data-analytics-choice="denied"', html)
            self.assertIn('data-analytics-choice="granted"', html)
            self.assertIn('data-cookie-settings', html)
            self.assertIn('href="/privacy.html"', html)
            self.assertIn('class="detail-link"', html)
            hub = (destination / "exeter/index.html").read_text()
            self.assertEqual(hub.count('id="analytics-choice"'), 1)
            self.assertIn('<script defer src="/analytics.js"></script>', hub)

    def test_generated_ids_are_unique_and_provider_links_use_existing_tracking(self):
        class Elements(HTMLParser):
            def __init__(self):
                super().__init__()
                self.ids, self.provider_links = [], []

            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if "id" in attrs:
                    self.ids.append(attrs["id"])
                if tag == "a" and attrs.get("target") == "_blank":
                    self.provider_links.append(attrs)

        page, _, _ = guide("this-weekend", self.items, TODAY, True)
        parsed = Elements()
        parsed.feed(page)
        self.assertEqual(len(parsed.ids), len(set(parsed.ids)))
        self.assertTrue(parsed.provider_links)
        self.assertTrue(all("detail-link" in link.get("class", "").split() for link in parsed.provider_links))


if __name__ == "__main__":
    unittest.main()
