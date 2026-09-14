#!/usr/bin/env python3
"""Prepare an unverified Sheet candidate queue; never update a catalogue or site.

Fetch the two published CSVs, or supply both local CSV paths for a repeatable run.
Every candidate still requires official-source verification. Sheet added dates
are retained as source data, never promoted to verification dates. This output is
deliberately not the research-export format consumed by prepare_catalog.py.
"""
import argparse
import csv
import hashlib
import io
import json
import os
import tempfile
import unicodedata
import urllib.request
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


PUBLISHED_CSV = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vRjvwZecLwxmLMRcd6Um0chyEW_2_zrmyJsL4bVZUpQ1Vu2GU5cUzF5HvyEG_jpbZz0-vxYoJfTy9J9"
    "/pub?gid={gid}&single=true&output=csv"
)
MASTER_URL = PUBLISHED_CSV.format(gid=0)
EVENTS_URL = PUBLISHED_CSV.format(gid=1801686098)
MASTER_HEADERS = {
    "name", "tab", "type", "area", "price", "age_min", "age_max", "price_type",
    "dates", "end_date", "season", "location", "url", "description", "date_added", "region",
}
EVENT_HEADERS = {"date", "end", "name", "icon", "price", "bg", "added", "region"}
REGION_ALIASES = {"Exeter": "Devon", "Devon": "Devon", "Nottingham": "Nottingham", "Bristol": "Bristol"}
QUEUE_TYPE = "globee_sheet_candidates"
MAX_BYTES = 10 * 1024 * 1024


def fingerprint(value):
    encoded = json.dumps(value, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(encoded.encode("utf-8")).hexdigest()


def load_csv(path, url, required_headers):
    if path is not None:
        payload = path.read_bytes()
        source = {"kind": "local_csv", "location": str(path.resolve())}
    else:
        request = urllib.request.Request(url, headers={"User-Agent": "Globee-Sheet-Candidates/1.0"})
        with urllib.request.urlopen(request, timeout=30) as response:
            payload = response.read(MAX_BYTES + 1)
        source = {"kind": "published_csv", "location": url}
    if len(payload) > MAX_BYTES:
        raise ValueError(f"{source['location']}: CSV exceeds 10 MiB")
    reader = csv.reader(io.StringIO(payload.decode("utf-8-sig"), newline=""), strict=True)
    try:
        headers = [header.strip() for header in next(reader)]
    except StopIteration:
        raise ValueError(f"{source['location']}: empty CSV") from None
    if not all(headers) or len(headers) != len(set(headers)):
        raise ValueError(f"{source['location']}: empty or duplicate CSV headers")
    missing = required_headers - set(headers)
    if missing:
        raise ValueError(f"{source['location']}: missing headers: {', '.join(sorted(missing))}")
    rows = []
    for row_number, cells in enumerate(reader, start=2):
        if not any(cell.strip() for cell in cells):
            continue
        if len(cells) != len(headers):
            raise ValueError(f"{source['location']}: CSV row {row_number} has the wrong column count")
        data = dict(zip(headers, cells))
        if not data["name"].strip():
            raise ValueError(f"{source['location']}: CSV row {row_number} has no name")
        rows.append({"row_number": row_number, "data": data, "fingerprint": fingerprint(data)})
    if not rows:
        raise ValueError(f"{source['location']}: no non-empty data rows")
    source.update({"sha256": hashlib.sha256(payload).hexdigest(), "row_count": len(rows)})
    return rows, source


def join_key(row):
    data = row["data"]
    raw_region = data["region"].strip()
    if raw_region not in REGION_ALIASES:
        raise ValueError(f"CSV row {row['row_number']}: unknown region {raw_region!r}")
    name = " ".join(unicodedata.normalize("NFC", data["name"]).split()).casefold()
    return name, REGION_ALIASES[raw_region]


def prepare_queue(master_rows, event_rows, sources):
    masters = {}
    for row in master_rows:
        key = join_key(row)
        if key in masters:
            raise ValueError(f"Duplicate master name/region at rows {masters[key]['row_number']} and {row['row_number']}")
        masters[key] = row
    events = defaultdict(list)
    seen_events = {}
    for row in event_rows:
        key = join_key(row)
        # Repeated dates for one activity are valid; repeated occurrence rows are not.
        occurrence = key + (row["data"]["date"].strip(), row["data"]["end"].strip())
        if occurrence in seen_events:
            raise ValueError(f"Duplicate event occurrence at rows {seen_events[occurrence]} and {row['row_number']}")
        seen_events[occurrence] = row["row_number"]
        events[key].append(row)
    candidates = []
    for key in sorted(set(masters) | set(events), key=lambda value: (value[1], value[0])):
        master = masters.get(key)
        matches = sorted(events[key], key=lambda row: (
            row["data"]["date"].strip(), row["data"]["end"].strip(), row["fingerprint"]))
        data = master["data"] if master else matches[0]["data"]
        raw_price_type = master["data"]["price_type"].strip().lower() if master else ""
        price_type = raw_price_type if raw_price_type in ("free", "paid") else "unknown"
        source_url = master["data"]["url"].strip() if master else ""
        reasons = ["official_source_verification_required"]
        if master is None:
            reasons.append("no_exact_master_match")
        if not source_url:
            reasons.append("missing_source_url")
        if price_type == "unknown":
            reasons.append("unknown_price_type")
        candidates.append({
            "candidate_id": fingerprint(list(key))[:24],
            "name": data["name"].strip(), "region": key[1],
            "status": "pending_official_verification", "verified_at": None,
            "price_type": price_type, "source_url": source_url or None,
            "source_url_checked": False, "review_reasons": reasons,
            "master_row": master, "matching_event_rows": matches,
            # Row positions are excluded: moving rows is not a change of evidence.
            "fingerprint": fingerprint({
                "master": master["data"] if master else None,
                "events": [row["data"] for row in matches],
            }),
        })
    return {
        "schema_version": 1, "queue_type": QUEUE_TYPE,
        "prepared_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "verified_at": None,
        "provenance": (
            "Unverified candidate queue from the existing Sheet database. No official-source "
            "verification was performed. prepared_at is the queue preparation time; "
            "date_added and added are source data, not verification dates. No historical "
            "rows are discarded. Review candidates against official sources before creating "
            "a separate dated research export for prepare_catalog.py."
        ),
        "region_aliases": REGION_ALIASES, "sources": sources,
        "summary": {
            "master_rows": len(master_rows), "event_rows": len(event_rows),
            "candidates": len(candidates),
            "event_only_candidates": sum(item["master_row"] is None for item in candidates),
        },
        "candidates": candidates,
    }


def write_queue(output, queue):
    if output.suffix.lower() != ".json":
        raise ValueError("--output must name a JSON candidate queue")
    if output.exists():
        previous = json.loads(output.read_text(encoding="utf-8"))
        if not isinstance(previous, dict) or previous.get("queue_type") != QUEUE_TYPE:
            raise ValueError("Refusing to overwrite a file that is not a Sheet candidate queue")
    # Replace atomically only after all sources, joins and duplicate checks pass.
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=output.parent,
                                         prefix=".sheet-candidates-", suffix=".tmp", delete=False) as handle:
            temporary = Path(handle.name)
            json.dump(queue, handle, ensure_ascii=False, indent=2)
            handle.write("\n")
        os.replace(temporary, output)
    finally:
        if temporary is not None:
            temporary.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--master-csv", type=Path)
    parser.add_argument("--events-csv", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    if (args.master_csv is None) != (args.events_csv is None):
        parser.error("Supply both --master-csv and --events-csv, or neither to fetch published CSVs")
    if any(path is not None and path.resolve() == args.output.resolve()
           for path in (args.master_csv, args.events_csv)):
        parser.error("--output must not overwrite an input CSV")
    try:
        master, master_source = load_csv(args.master_csv, MASTER_URL, MASTER_HEADERS)
        events, event_source = load_csv(args.events_csv, EVENTS_URL, EVENT_HEADERS)
        queue = prepare_queue(master, events, {"master": master_source, "events": event_source})
        write_queue(args.output, queue)
    except (OSError, ValueError, csv.Error) as error:
        parser.exit(2, f"Candidate queue not written: {error}\n")
    print(f"Prepared {len(queue['candidates'])} pending candidates in {args.output}; no verification dates assigned.")


if __name__ == "__main__":
    main()
