#!/usr/bin/env python3
"""Refresh the offline-first site snapshot from Globee's published Sheet."""

from __future__ import annotations

import csv
import datetime as dt
import io
import json
import pathlib
import urllib.request


BASE = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vRjvwZecLwxmLMRcd6Um0chyEW_2_zrmyJsL4bVZUpQ1Vu2GU5cUzF5HvyEG_jpbZz0-vxYoJfTy9J9/pub"
)
ROOT = pathlib.Path(__file__).resolve().parents[1]
EXPECTED = {
    "master": {"name", "tab", "type", "price_type", "url", "region"},
    "events": {"date", "end", "name", "price", "region"},
}


def fetch(gid: int, label: str) -> list[dict[str, str]]:
    url = f"{BASE}?gid={gid}&single=true&output=csv"
    request = urllib.request.Request(url, headers={"User-Agent": "Globee snapshot refresh"})
    with urllib.request.urlopen(request, timeout=20) as response:
        body = response.read()
    if len(body) > 2_000_000:
        raise RuntimeError(f"{label} response is unexpectedly large")
    rows = list(csv.DictReader(io.StringIO(body.decode("utf-8-sig"))))
    if not rows or not EXPECTED[label].issubset(rows[0]):
        raise RuntimeError(f"{label} columns changed")
    return [{key: (value or "").strip() for key, value in row.items()} for row in rows if any(row.values())]


def main() -> None:
    snapshot = {
        "schema": 1,
        "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "master": fetch(0, "master"),
        "events": fetch(1801686098, "events"),
    }
    payload = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"))
    (ROOT / "db-snapshot.js").write_text(f"window.GLOBEE_SNAPSHOT={payload};\n", encoding="utf-8")
    print(f"Snapshot refreshed: {len(snapshot['master'])} master rows, {len(snapshot['events'])} event rows")


if __name__ == "__main__":
    main()
