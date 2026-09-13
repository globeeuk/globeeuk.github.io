"""Publication must use the reviewed Sheet evidence, not merely any valid row."""
import copy
import unittest
from datetime import date, datetime, timedelta, timezone

from check_sheet_bindings import check_bindings
from sheet_candidates import (EVENT_HEADERS, EVENTS_URL, MASTER_HEADERS, MASTER_URL,
                              fingerprint, prepare_queue)

NOW = datetime(2026, 9, 13, 15, 0, tzinfo=timezone.utc)


def row(headers, position, **data):
    values = dict.fromkeys(headers, "")
    values.update(data)
    return {"row_number": position, "data": values, "fingerprint": fingerprint(values)}


def queue_for(masters, events):
    sources = {key: {"kind": "published_csv", "location": url,
                     "sha256": "a" * 64, "row_count": len(rows)}
               for key, url, rows in (("master", MASTER_URL, masters), ("events", EVENTS_URL, events))}
    queue = prepare_queue(copy.deepcopy(masters), copy.deepcopy(events), sources)
    queue["prepared_at"] = NOW.isoformat()
    return queue


def binding(queue, name):
    candidate = next(c for c in queue["candidates"] if c["name"] == name)
    return {key: candidate[key] for key in ("candidate_id", "name", "region", "fingerprint")}


def item(item_id, name, url, kind="place", day=None):
    value = {"id": item_id, "name": name, "description": "A checked family activity.",
             "kind": kind, "region": "Devon", "city": "Exeter", "locality": "Exeter",
             "address": "Exeter, Devon", "age_text": "All ages", "price_text": "Free",
             "price_type": "free", "free_basis": "Free admission on the official page",
             "booking_text": "Check the provider", "schedule_text": "See confirmed dates",
             "verified_at": "2026-09-13", "sources": [{"url": url, "supports": "Visitor information"}]}
    if kind == "event":
        value["occurrences"] = [{"start": day, "end": day, "start_time": "10:00", "end_time": "17:00"}]
    return value


class SheetBindingChecks(unittest.TestCase):
    def setUp(self):
        self.masters = [row(MASTER_HEADERS, 2, name="RAMM Museum", region="Exeter", price_type="free", url="https://ramm.example/visit"),
                        row(MASTER_HEADERS, 3, name="Exeter Library", region="Devon", price_type="free", url="https://library.example/"),
                        row(MASTER_HEADERS, 4, name="Family Open Day", region="Devon", price_type="free", url="https://event.example/open-day")]
        self.events = [row(EVENT_HEADERS, 2, name="Family Open Day", region="Devon", date="2026-09-19", end="2026-09-19")]
        self.queue = queue_for(self.masters, self.events)
        museum = item("ramm", "Royal Albert Memorial Museum", "https://ramm.example/visit")
        event = item("family-day", "Family Open Day", "https://event.example/open-day", "event", "2026-09-19")
        past = item("past-event", "Past event", "https://event.example/past", "event", "2026-09-12")
        museum["sheet_bindings"] = [binding(self.queue, "RAMM Museum")]
        event["sheet_bindings"] = [binding(self.queue, "Family Open Day")]
        self.catalog = {"schema_version": 1, "items": [museum, event, past]}

    def check(self, catalog=None, queue=None, **kwargs):
        return check_bindings(catalog or self.catalog, queue or self.queue, now=NOW, **kwargs)

    def test_selected_alias_and_next_weekend_pass_historical_unbound_is_ignored(self):
        self.assertEqual(self.check()["item_ids"], ["family-day", "ramm"])

    def test_row_reordering_does_not_change_evidence(self):
        for r in self.masters + self.events:
            r["row_number"] += 100
        self.assertEqual(self.check(queue=queue_for(self.masters, self.events))["selected_items"], 2)

    def test_next_weekend_binding_is_required(self):
        del self.catalog["items"][1]["sheet_bindings"]
        with self.assertRaisesRegex(ValueError, "family-day: missing"):
            self.check()

    def test_whole_valid_binding_for_another_place_is_rejected(self):
        self.catalog["items"][0]["sheet_bindings"] = [binding(self.queue, "Exeter Library")]
        with self.assertRaisesRegex(ValueError, "master source URL"):
            self.check()

    def test_changed_master_or_matching_event_evidence_blocks_publication(self):
        for kind in ("master", "event", "new_event", "removed_event"):
            with self.subTest(kind=kind):
                masters, events = copy.deepcopy(self.masters), copy.deepcopy(self.events)
                if kind == "master":
                    masters[0] = row(MASTER_HEADERS, 2, **dict(masters[0]["data"], price="GBP 5"))
                elif kind == "event":
                    events[0] = row(EVENT_HEADERS, 2, **dict(events[0]["data"], price="Ticketed"))
                elif kind == "new_event":
                    events.append(row(EVENT_HEADERS, 3, name="Family Open Day", region="Devon", date="2026-09-20", end="2026-09-20"))
                else:
                    events.clear()
                with self.assertRaisesRegex(ValueError, "content changed"):
                    self.check(queue=queue_for(masters, events))

    def test_missing_master_candidate_is_not_silently_dropped(self):
        with self.assertRaisesRegex(ValueError, "bound Sheet candidate missing"):
            self.check(queue=queue_for(self.masters[1:], self.events))

    def test_bound_date_must_cover_the_published_occurrence(self):
        self.catalog["items"][1]["occurrences"][0].update(start="2026-09-20", end="2026-09-20")
        with self.assertRaisesRegex(ValueError, "not covered"):
            self.check()

    def test_raw_row_tampering_with_old_hash_is_rejected(self):
        self.queue["candidates"][0]["master_row"]["data"]["price"] = "Changed"
        with self.assertRaisesRegex(ValueError, "raw row fingerprint mismatch"):
            self.check()

    def test_queue_identity_and_derived_hash_cannot_be_swapped(self):
        for mutation in ("wrong_source", "duplicate_id", "derived_hash", "local_source"):
            with self.subTest(mutation=mutation):
                q = copy.deepcopy(self.queue)
                if mutation == "wrong_source":
                    q["sources"]["master"]["location"] = EVENTS_URL
                elif mutation == "duplicate_id":
                    q["candidates"][1]["candidate_id"] = q["candidates"][0]["candidate_id"]
                elif mutation == "derived_hash":
                    q["candidates"][0]["fingerprint"] = "b" * 64
                else:
                    q["sources"]["master"]["kind"] = "local_csv"
                with self.assertRaises(ValueError):
                    self.check(queue=q)

    def test_freshness_is_separate_from_renderer_fixture_date(self):
        for stamp in ((NOW - timedelta(hours=2)).isoformat(),
                      (NOW + timedelta(seconds=1)).isoformat(), "2026-09-13T15:00:00"):
            with self.subTest(stamp=stamp):
                q = copy.deepcopy(self.queue)
                q["prepared_at"] = stamp
                with self.assertRaises(ValueError):
                    self.check(queue=q, as_of=date(2026, 9, 13))

    def test_unrelated_sheet_addition_does_not_invalidate_existing_bindings(self):
        masters = self.masters + [row(MASTER_HEADERS, 5, name="Other place", region="Devon", url="https://other.example/")]
        self.assertEqual(self.check(queue=queue_for(masters, self.events))["selected_items"], 2)


if __name__ == "__main__":
    unittest.main()
