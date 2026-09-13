#!/usr/bin/env python3
"""Stop publication when selected guide records no longer match the Sheet DB.

Store reviewed bindings on research records before prepare_catalog.py runs:
sheet_bindings: [{candidate_id, name, region, fingerprint}]
Copy those four fields from the verified candidate in a fresh Sheet queue.
The candidate fingerprint covers its master and all matching event rows; row
positions are intentionally ignored. This check does not verify provider facts.

By default fetch both published CSVs. --queue accepts a fresh published-source
export for repeatable pipeline steps; local CSV fixtures are not publish inputs.
No files are written. Exit 2 means do not publish.
"""
import argparse
import csv
import json
import re
from datetime import datetime, timezone
from pathlib import Path

from build import GUIDES, choose, parse_date, validate
from sheet_candidates import (EVENT_HEADERS, EVENTS_URL, MASTER_HEADERS, MASTER_URL,
                              QUEUE_TYPE, REGION_ALIASES, fingerprint, load_csv,
                              prepare_queue)

HERE = Path(__file__).resolve().parent
BINDING_FIELDS = ("candidate_id", "name", "region", "fingerprint")
MAX_QUEUE_AGE_SECONDS = 3600


def fetch_queue():
    master, master_source = load_csv(None, MASTER_URL, MASTER_HEADERS)
    events, events_source = load_csv(None, EVENTS_URL, EVENT_HEADERS)
    return prepare_queue(master, events, {"master": master_source, "events": events_source})


def checked_candidates(queue, now):
    """Rebuild derived identity/hash fields instead of trusting JSON metadata."""
    if queue.get("schema_version") != 1 or queue.get("queue_type") != QUEUE_TYPE:
        raise ValueError("Expected a globee_sheet_candidates queue, schema_version=1")
    prepared = datetime.fromisoformat(queue.get("prepared_at", ""))
    if prepared.tzinfo is None or now.tzinfo is None:
        raise ValueError("Queue and current timestamps must include a timezone")
    age = (now - prepared).total_seconds()
    if not 0 <= age <= MAX_QUEUE_AGE_SECONDS:
        raise ValueError("Queue must be prepared within the last hour, never in the future")
    sources = queue.get("sources", {})
    for kind, url in (("master", MASTER_URL), ("events", EVENTS_URL)):
        source = sources.get(kind, {})
        if source.get("kind") != "published_csv" or source.get("location") != url:
            raise ValueError(f"{kind}: source must be the configured published Sheet CSV")
        if not re.fullmatch(r"[0-9a-f]{64}", source.get("sha256", "")):
            raise ValueError(f"{kind}: missing CSV hash")
    original = queue.get("candidates")
    if not isinstance(original, list) or not original:
        raise ValueError("Queue must contain candidates")
    rows = {"master": [], "events": []}
    ids = set()
    for candidate in original:
        cid = candidate.get("candidate_id")
        if not cid or cid in ids:
            raise ValueError("Queue has a missing or duplicate candidate ID")
        ids.add(cid)
        if candidate.get("master_row") is not None:
            rows["master"].append(candidate["master_row"])
        events = candidate.get("matching_event_rows")
        if not isinstance(events, list):
            raise ValueError(f"{cid}: matching_event_rows must be an array")
        rows["events"].extend(events)
    for kind, headers in (("master", MASTER_HEADERS), ("events", EVENT_HEADERS)):
        positions = set()
        if sources[kind].get("row_count") != len(rows[kind]):
            raise ValueError(f"{kind}: queue row count does not match its source metadata")
        for row in rows[kind]:
            data, position = row.get("data"), row.get("row_number")
            if type(position) is not int or position < 2 or position in positions:
                raise ValueError(f"{kind}: invalid or duplicate row position")
            positions.add(position)
            if not isinstance(data, dict) or not headers <= data.keys() or not all(
                    isinstance(value, str) for value in data.values()):
                raise ValueError(f"{kind} row {position}: invalid raw row")
            if row.get("fingerprint") != fingerprint(data):
                raise ValueError(f"{kind} row {position}: raw row fingerprint mismatch")
    rebuilt = prepare_queue(rows["master"], rows["events"], sources)
    index = {candidate["candidate_id"]: candidate for candidate in rebuilt["candidates"]}
    if set(index) != ids:
        raise ValueError("Queue candidate identities do not match its raw rows")
    for candidate in original:
        expected = index[candidate["candidate_id"]]
        for field in BINDING_FIELDS + ("source_url",):
            if candidate.get(field) != expected[field]:
                raise ValueError(f"{candidate['candidate_id']}: derived {field} mismatch")
    return index


def published_selection(catalog, as_of):
    """Use the renderer's actual rules, including its next-weekend section."""
    items = validate(catalog, as_of)
    selected = {}
    for slug in GUIDES:
        for offset in ((0, 1) if slug == "this-weekend" else (0,)):
            for item in choose(items, slug, as_of, week_offset=offset):
                entry = selected.setdefault(item["id"], {"item": item, "occurrences": []})
                entry["occurrences"].extend(item.get("occurrences", []))
    return selected


def covered(occurrence, event_rows):
    """Date intervals may span several contiguous curated event rows."""
    cursor = parse_date(occurrence["start"]).toordinal()
    end = parse_date(occurrence.get("end", occurrence["start"])).toordinal()
    intervals = []
    for row in event_rows:
        data = row["data"]
        try:
            first = parse_date(data["date"].strip()).toordinal()
            last = parse_date(data["end"].strip() or data["date"].strip()).toordinal()
        except ValueError:
            continue  # Unknown Sheet dates cannot substantiate an occurrence.
        if last >= first:
            intervals.append((first, last))
    for first, last in sorted(intervals):
        if first > cursor:
            break
        if last >= cursor:
            cursor = last + 1
        if cursor > end:
            return True
    return False


def check_bindings(catalog, queue, as_of=None, *, now=None):
    now = now or datetime.now(timezone.utc)
    candidates = checked_candidates(queue, now)
    selected = published_selection(catalog, as_of if as_of is not None else now)
    errors = []
    for item_id, selection in selected.items():
        item = selection["item"]
        bindings = item.get("sheet_bindings")
        if not isinstance(bindings, list) or not bindings:
            errors.append(f"{item_id}: missing reviewed sheet_bindings")
            continue
        seen, event_rows = set(), []
        urls = {source["url"].strip() for source in item["sources"]}
        for binding in bindings:
            if not isinstance(binding, dict) or not all(binding.get(k) for k in BINDING_FIELDS):
                errors.append(f"{item_id}: incomplete Sheet binding")
                continue
            cid = binding["candidate_id"]
            if cid in seen:
                errors.append(f"{item_id}: duplicate Sheet binding {cid}")
                continue
            seen.add(cid)
            candidate = candidates.get(cid)
            if candidate is None:
                errors.append(f"{item_id}: bound Sheet candidate missing ({binding['name']})")
                continue
            if any(binding[k] != candidate[k] for k in BINDING_FIELDS):
                errors.append(f"{item_id}: bound Sheet name, region or content changed ({binding['name']})")
            if candidate["region"] != REGION_ALIASES.get(item["region"]):
                errors.append(f"{item_id}: Sheet region does not match the published item")
            if candidate["master_row"] is None:
                errors.append(f"{item_id}: binding needs a master Sheet row")
            if not candidate["source_url"] or candidate["source_url"] not in urls:
                errors.append(f"{item_id}: master source URL is absent from reviewed official sources")
            event_rows.extend(candidate["matching_event_rows"])
        if item["kind"] == "event":
            for occurrence in selection["occurrences"]:
                if not covered(occurrence, event_rows):
                    errors.append(f"{item_id}: published occurrence {occurrence['start']} is not covered by bound events rows")
    if errors:
        raise ValueError("\n".join(dict.fromkeys(errors)))
    return {"status": "passed", "selected_items": len(selected), "item_ids": sorted(selected),
            "queue_prepared_at": queue["prepared_at"], "checked_at": now.isoformat(),
            "note": "Sheet bindings match; provider verification dates were not changed."}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=HERE / "catalog.json")
    parser.add_argument("--queue", type=Path, help="Fresh published-CSV queue; otherwise fetch live")
    parser.add_argument("--as-of", type=parse_date, help="Renderer selection at London midnight; queue age still uses real time")
    args = parser.parse_args()
    try:
        catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
        queue = json.loads(args.queue.read_text(encoding="utf-8")) if args.queue else fetch_queue()
        result = check_bindings(catalog, queue, args.as_of)
    except (OSError, ValueError, csv.Error, KeyError, TypeError, AttributeError) as error:
        parser.exit(2, f"Publication blocked by Sheet binding check: {error}\n")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
