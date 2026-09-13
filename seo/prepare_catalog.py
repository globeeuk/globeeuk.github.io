#!/usr/bin/env python3
"""Convert an official-source research export into the page renderer's snapshot.

No inferred prices, opening times or age restrictions are added here.
Run after the daily verification has produced a checked research export.
"""
import argparse
import json
from pathlib import Path


def prepare(source):
    if not source.get("verified_at") or not source.get("records"):
        raise ValueError("A dated official-source research export with records is required")
    items = []
    for record in source["records"]:
        item = dict(record)
        # Locality remains a useful neighbourhood label; city is a separate strict field.
        item["city"] = record.get("city", "Exeter" if record["locality"].startswith("Exeter") else "")
        item["notes"] = record.get("practical_notes", [])
        if item["price_type"] == "free":
            item["free_basis"] = item["price_text"]
        if item.get("indoor") is True:
            item["indoor_basis"] = record["rainy_day"]["basis"]
        for s in item["sources"]:
            if isinstance(s["supports"], list):
                s["supports"] = " ".join(s["supports"])
        item["price_text"] = item["price_text"].replace("GBP ", "£")
        items.append(item)
    return {"schema_version": 1, "provenance": "Generated presentation snapshot of the dated official-source research export. Update the source export after verification; do not maintain a second event database here.",
            "source_verified_at": source["verified_at"], "items": items}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("--output", type=Path, default=Path(__file__).parent / "catalog.json")
    args = parser.parse_args()
    catalog = prepare(json.loads(args.source.read_text(encoding="utf-8")))
    args.output.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Prepared {len(catalog['items'])} checked records; verification dates preserved.")


if __name__ == "__main__":
    main()
