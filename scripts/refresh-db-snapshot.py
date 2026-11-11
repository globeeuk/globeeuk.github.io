#!/usr/bin/env python3
"""Refresh the offline-first site snapshot from Globee's published Sheet."""

from __future__ import annotations

import csv
import datetime as dt
import io
import json
import pathlib
import re
import unicodedata
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
    path = ROOT / "db-snapshot.js"
    previous = read_snapshot(path) if path.exists() else {"master": [], "events": []}
    snapshot = {
        "schema": 1,
        "fetchedAt": dt.datetime.now(dt.timezone.utc).isoformat(),
        "master": fetch(0, "master"),
        "events": fetch(1801686098, "events"),
    }
    snapshot["publicationHistory"] = publication_history(
        snapshot, publication_history(previous, previous.get("publicationHistory", {}))
    )
    payload = json.dumps(snapshot, ensure_ascii=False, separators=(",", ":"))
    (ROOT / "db-snapshot.js").write_text(f"window.GLOBEE_SNAPSHOT={payload};\n", encoding="utf-8")
    print(f"Snapshot refreshed: {len(snapshot['master'])} master rows, {len(snapshot['events'])} event rows")


def read_snapshot(path: pathlib.Path) -> dict:
    text = path.read_text(encoding="utf-8")
    prefix = "window.GLOBEE_SNAPSHOT="
    if not text.startswith(prefix):
        raise ValueError("Unexpected snapshot format; preserve the existing publication history")
    return json.loads(text[len(prefix):].strip().removesuffix(";"))


def publication_history(snapshot: dict, previous: dict) -> dict:
    """Match db-adapter.js: immutable per-listing dates, including unknowns/tombstones."""
    history = dict(previous)
    groups = {}
    for label, field in (("master", "date_added"), ("events", "added")):
        for row in snapshot[label]:
            region = {"Devon": "Exeter", "Exeter": "Exeter", "Bristol": "Bristol", "Nottingham": "Nottingham"}.get(row.get("region", "").strip())
            if not region or not row.get("name"):
                continue
            name = re.sub(r"\s+", " ", unicodedata.normalize("NFC", row["name"]).strip().lower().replace("–", "-").replace("—", "-"))
            group = groups.setdefault(f"{region}|{name}", {"dates": []})
            value = row.get(field) or ""
            group["dates"].append(value)
            if label == "master":
                group["master"] = value
    def valid(value):
        try:
            return bool(re.fullmatch(r"\d{4}-\d{2}-\d{2}", value)) and dt.date.fromisoformat(value).isoformat() == value
        except (ValueError, TypeError):
            return False
    for key, group in groups.items():
        if key in history:
            continue
        unknown = not valid(group["master"]) if "master" in group else any(not valid(d) for d in group["dates"])
        dates = sorted(d for d in group["dates"] if valid(d))
        history[key] = None if unknown or not dates else dates[0]
    return history


if __name__ == "__main__":
    main()
