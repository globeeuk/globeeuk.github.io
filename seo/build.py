#!/usr/bin/env python3
"""Build useful, crawlable Globee guides from an officially checked snapshot.

This is a renderer, not a verifier: running it never renews verified_at.
The editorial snapshot is an export for publication, not a replacement event DB.
"""
import argparse
import hashlib
import html
import json
import re
import shutil
from datetime import date, datetime, time, timedelta
from pathlib import Path
from urllib.parse import urlencode, urlsplit
from xml.etree import ElementTree as ET
from zoneinfo import ZoneInfo

HERE = Path(__file__).resolve().parent
PUBLIC_BASE = "https://globeeuk.github.io"
LONDON = ZoneInfo("Europe/London")
GUIDES = {
    "this-weekend": {
        "title": "Things to do in Exeter with kids this weekend",
        "short": "This weekend",
        "intro": "A short list of family activities in Exeter and nearby Devon, with dates, costs and booking details together.",
        "description": "Plan this weekend with children in Exeter and nearby Devon. Compare checked event dates, prices, age guidance and official booking links.",
        "help_title": "Before you set off",
        "help": "Check the organiser’s latest update before travelling. Free admission can still mean paying for parking, food or an optional activity. An age marked TBC has not been confirmed by the organiser.",
    },
    "free-things-to-do": {
        "title": "Free things to do in Exeter with kids",
        "short": "Free activities",
        "intro": "Places where the activity or general admission is free. Parking, refreshments and special events may cost extra; the conditions are shown with each choice.",
        "description": "Find free family activities in Exeter. See what is included, opening details, age guidance and extra costs before planning a day out with children.",
        "help_title": "What counts as free here?",
        "help": "The listed activity or general admission must be free. A paid children’s activity with free accompanying adults does not qualify. Optional extras and parking are listed separately when the provider publishes them.",
    },
    "rainy-day": {
        "title": "Rainy-day activities in Exeter with kids",
        "short": "Rainy days",
        "intro": "Indoor options for a wet day in Exeter, with the information you need to choose a short visit or a longer activity.",
        "description": "Compare indoor family activities in Exeter for rainy days, with prices, opening information, age guidance and links to the official providers.",
        "help_title": "Planning a wet-weather visit",
        "help": "These choices have an indoor activity confirmed by the provider. Check opening hours and any booking requirement first. Indoor facilities do not automatically mean step-free access or pushchair access: use the provider’s accessibility information for your family’s needs.",
    },
}

BRISTOL_GUIDES = {
    "this-weekend": {
        "title": "Things to do in Bristol with kids this weekend",
        "short": "This weekend",
        "intro": "A short list of family activities in Bristol, with dates, costs and booking details together.",
        "description": "Plan this weekend with children in Bristol. Compare checked event dates, prices, age guidance and official booking links.",
        "help_title": "Before you set off",
        "help": "Check the organiser’s latest update before travelling. Free admission can still mean paying for parking, food or an optional activity. An age marked TBC has not been confirmed by the organiser.",
    },
    "edit": {
        "title": "The Bristol family edit",
        "short": "The Bristol edit",
        "intro": "A small, checked set of Bristol family picks, with the venue, dates, cost and official details together.",
        "description": "Explore the Bristol family edit: checked activities, practical details and official provider links in one place.",
        "help_title": "Before you set off",
        "help": "This is a growing editorial set rather than a popularity ranking. Check the organiser’s latest update before travelling; prices, opening details and availability can change.",
    },
}

REGIONS = {
    "exeter": {
        "label": "Exeter · Devon",
        "data_regions": ("Exeter", "Devon"),
        "city": "Exeter",
        "guides": GUIDES,
        "hub_title": "Exeter family activity guides",
        "hub_description": "Plan a family day out in Exeter: this weekend, free activities and indoor choices for rainy days. Checked details and official provider links.",
        "footer": "Curated by Globee for families in Exeter and Devon.",
    },
    "bristol": {
        "label": "Bristol",
        "data_regions": ("Bristol",),
        "city": "Bristol",
        "guides": BRISTOL_GUIDES,
        "hub_title": "Bristol family activity guides",
        "hub_description": "Plan a family day out in Bristol this weekend, with checked dates, practical details and official provider links.",
        "footer": "Curated by Globee for families in Bristol.",
    },
}
PUBLISHED_GUIDES = tuple(
    (region_key, slug)
    for region_key, region in REGIONS.items()
    for slug in region["guides"]
)


def published_routes():
    routes = []
    for region_key, region in REGIONS.items():
        routes.append(f"/{region_key}/")
        routes.extend(f"/{region_key}/{slug}/" for slug in region["guides"])
    return routes


def directory_url(region_key):
    """Keep the visitor's guide region selected in the main directory."""
    return f"{PUBLIC_BASE}/?{urlencode({'region': REGIONS[region_key]['city']})}"


def esc(value):
    return html.escape(str(value), quote=True)


def parse_date(value):
    if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise ValueError(f"Expected ISO date, got {value!r}")
    return date.fromisoformat(value)


def display_date(value):
    value = parse_date(value) if isinstance(value, str) else value
    return f"{value.day} {value.strftime('%B %Y')}"


def local_now(value):
    """Date fixtures mean London midnight; live builds keep the actual time."""
    if isinstance(value, datetime):
        if value.tzinfo is None:
            raise ValueError("A datetime must include a timezone")
        return value.astimezone(LONDON)
    return datetime.combine(value, time.min, tzinfo=LONDON)


def parse_time(value):
    if not isinstance(value, str) or not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value):
        raise ValueError(f"Expected local HH:MM time, got {value!r}")
    return time.fromisoformat(value)


def weekend(as_of):
    as_of = local_now(as_of).date()
    saturday = as_of + timedelta(days=(5 - as_of.weekday()) % 7)
    if as_of.weekday() == 6:
        saturday = as_of - timedelta(days=1)
    return saturday, saturday + timedelta(days=1)


def safe_url(value):
    parsed = urlsplit(value)
    if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
        raise ValueError(f"Expected public HTTPS URL, got {value!r}")
    return value


def validate(catalog, as_of):
    as_of = local_now(as_of).date()
    if catalog.get("schema_version") != 1 or not isinstance(catalog.get("items"), list):
        raise ValueError("Expected schema_version=1 and items array")
    ids = set()
    for item in catalog["items"]:
        required = ("id", "name", "description", "kind", "region", "locality", "address", "age_text",
                    "price_text", "price_type", "booking_text", "schedule_text", "verified_at", "sources")
        for field in required:
            if not item.get(field):
                raise ValueError(f"{item.get('id', '?')}: missing {field}")
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item["id"]) or item["id"] in ids:
            raise ValueError(f"Invalid or duplicate id: {item['id']}")
        ids.add(item["id"])
        if item["kind"] not in ("place", "event") or item["price_type"] not in ("free", "paid", "unknown"):
            raise ValueError(f"{item['id']}: invalid kind or price_type")
        if item["region"] not in ("Devon", "Exeter", "Nottingham", "Bristol"):
            raise ValueError(f"{item['id']}: region is not in the existing region allowlist")
        if parse_date(item["verified_at"]) > as_of:
            raise ValueError(f"{item['id']}: future verification date")
        if item.get("indoor") is not None and type(item["indoor"]) is not bool:
            raise ValueError(f"{item['id']}: indoor must be true, false or null")
        if item["price_type"] == "free" and not item.get("free_basis"):
            raise ValueError(f"{item['id']}: free classification requires explicit evidence")
        if item.get("indoor") is True and not item.get("indoor_basis"):
            raise ValueError(f"{item['id']}: indoor classification requires evidence")
        for source in item["sources"]:
            safe_url(source["url"])
            if not source.get("supports"):
                raise ValueError(f"{item['id']}: source needs evidence notes")
        if item["kind"] == "event" and not item.get("occurrences"):
            raise ValueError(f"{item['id']}: an event needs confirmed occurrences")
        for occurrence in item.get("occurrences", []):
            start, end = parse_date(occurrence["start"]), parse_date(occurrence.get("end", occurrence["start"]))
            if end < start:
                raise ValueError(f"{item['id']}: reversed event dates")
            for field in ("start_time", "end_time"):
                if occurrence.get(field) is not None:
                    parse_time(occurrence[field])
            if start == end and occurrence.get("start_time") and occurrence.get("end_time"):
                if parse_time(occurrence["end_time"]) < parse_time(occurrence["start_time"]):
                    raise ValueError(f"{item['id']}: reversed event times; provide the actual end date")
    return catalog["items"]


def current(item, as_of):
    # Fail closed. A successful build is not an official-source recheck.
    maximum_age = 7 if item["kind"] == "event" else 30
    age = (local_now(as_of).date() - parse_date(item["verified_at"])).days
    return 0 <= age <= maximum_age


def occurrence_end(occurrence):
    end = parse_date(occurrence.get("end", occurrence["start"]))
    if occurrence.get("end_time") is not None:
        return datetime.combine(end, parse_time(occurrence["end_time"]), tzinfo=LONDON)
    # Missing times remain unknown: keep the occurrence until the local date ends.
    return datetime.combine(end + timedelta(days=1), time.min, tzinfo=LONDON)


def choose(items, slug, as_of, *, week_offset=0, region_key="exeter"):
    region = REGIONS[region_key]
    now = local_now(as_of)
    saturday, sunday = weekend(as_of)
    saturday += timedelta(weeks=week_offset)
    sunday += timedelta(weeks=week_offset)
    selected = []
    for item in items:
        if item["region"] not in region["data_regions"] or not current(item, as_of):
            continue
        if slug == "this-weekend":
            if item["kind"] != "event":
                continue
            occurrences = [o for o in item["occurrences"]
                           if parse_date(o["start"]) <= sunday and
                           parse_date(o.get("end", o["start"])) >= saturday and
                           occurrence_end(o) > now]
            if not occurrences:
                continue
            # Keep each section's schedule distinct without changing the source snapshot.
            item = dict(item, occurrences=sorted(occurrences, key=lambda o: (o["start"], o.get("start_time", ""))))
        elif slug == "edit":
            if item["kind"] == "event":
                occurrences = [o for o in item["occurrences"] if occurrence_end(o) > now]
                if not occurrences:
                    continue
                item = dict(item, occurrences=sorted(occurrences, key=lambda o: (o["start"], o.get("start_time", ""))))
            elif item["kind"] == "place":
                if item.get("city") != region["city"]:
                    continue
            else:
                continue
        else:
            # Evergreen pages do not present one-off free days as year-round free entry.
            if item["kind"] != "place" or item.get("city") != region["city"]:
                continue
            if slug == "free-things-to-do" and item["price_type"] != "free":
                continue
            if slug == "rainy-day" and item.get("indoor") is not True:
                continue
        selected.append(item)
    return sorted(selected, key=lambda x: (x.get("occurrences", [{"start": "9999-01-01"}])[0]["start"]
                                           if x["kind"] == "event" else "", x["name"]))


def occurrence_text(occurrence):
    start = parse_date(occurrence["start"])
    end = parse_date(occurrence.get("end", occurrence["start"]))
    dates = f"{start.strftime('%A')} {display_date(start)}"
    if end != start:
        dates += f" – {end.strftime('%A')} {display_date(end)}"
    start_time, end_time = occurrence.get("start_time"), occurrence.get("end_time")
    if start_time and end_time:
        dates += f", {start_time}–{end_time}"
    elif start_time:
        dates += f", from {start_time}"
    elif end_time:
        dates += f", ends {end_time}"
    return dates


def card(item, *, anchor=None, heading_level=2):
    fee_class = " free" if item["price_type"] == "free" else ""
    fee_label = {"free": "Free admission", "paid": "Ticketed", "unknown": "Price TBC"}[item["price_type"]]
    display_item = dict(item)
    if item["kind"] == "event":
        display_item["schedule_text"] = "; ".join(occurrence_text(o) for o in item["occurrences"])
    details = "".join(f'<div><dt>{esc(label)}</dt><dd>{esc(display_item[field])}</dd></div>' for label, field in (
        ("When", "schedule_text"), ("Where", "address"), ("Cost", "price_text"),
        ("Age guidance", "age_text"), ("Booking", "booking_text")))
    notes = "".join(f"<li>{esc(note)}</li>" for note in item.get("notes", []))
    notes = f'<ul class="notes">{notes}</ul>' if notes else ""
    sources = "".join(f'<a class="detail-link" href="{esc(s["url"])}" rel="noopener" target="_blank">'
                      f'{esc(s.get("label", "Official information"))}<span class="sr-only"> (opens in a new tab)</span></a>'
                      for s in item["sources"])
    return f'''<article class="activity" id="{esc(anchor or item['id'])}">
      <div class="activity-top"><span class="location">{esc(item['locality'])}</span><span class="pill{fee_class}">{fee_label}</span></div>
      <h{heading_level}>{esc(item['name'])}</h{heading_level}><p class="description">{esc(item['description'])}</p>
      <dl>{details}</dl>{notes}<div class="sources">{sources}</div>
      <p class="checked">Official details checked <time datetime="{item['verified_at']}">{display_date(item['verified_at'])}</time></p>
    </article>'''


def head(title, description, route, indexable, schema, production=False, *, region_key="exeter"):
    region = REGIONS[region_key]
    directory = directory_url(region_key)
    robots = "index,follow" if indexable else "noindex,follow"
    canonical = PUBLIC_BASE + route
    structured = json.dumps(schema, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e")
    analytics = '<script defer src="/analytics.js?v=consent2"></script>' if production else ""
    return f'''<!doctype html><html lang="en-GB"><head><meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1"><title>{esc(title)} | Globee</title>
    <meta name="description" content="{esc(description)}"><meta name="robots" content="{robots}">
    <link rel="canonical" href="{canonical}"><meta property="og:type" content="website">
    <meta property="og:site_name" content="Globee"><meta property="og:locale" content="en_GB">
    <meta property="og:title" content="{esc(title)}"><meta property="og:description" content="{esc(description)}">
    <meta property="og:url" content="{canonical}">
    <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&amp;family=Outfit:wght@400;500;600;700&amp;display=swap" rel="stylesheet" media="print" onload="this.media='all'">
    <link rel="stylesheet" href="/seo-assets/guides.css">
    <script type="application/ld+json">{structured}</script>{analytics}</head><body>
    <a class="skip" href="#main">Skip to activities</a>
    <header><a class="brand" href="{directory}" aria-label="Globee home"><span class="brand-mark">G<span class="brand-dot"></span></span><span>Glo<span class="brand-bee">bee</span></span></a>
    <a class="region" href="/{region_key}/">{esc(region['label'])}</a><a class="directory" href="{directory}">Explore Globee <span aria-hidden="true">↗</span></a></header>'''


def navigation(slug=None, *, region_key="exeter"):
    region = REGIONS[region_key]
    return f'<nav aria-label="{esc(region["city"])} guides">' + "".join(
        f'<a href="/{region_key}/{key}/"' + (' aria-current="page"' if key == slug else '') + f'>{esc(info["short"])}</a>'
        for key, info in region["guides"].items()) + '</nav>'


def footer(production=False, *, region_key="exeter"):
    region = REGIONS[region_key]
    directory = directory_url(region_key)
    settings = '<button type="button" class="text-button" data-analytics-toggle>Analytics settings</button>' if production else ""
    other_regions = "".join(
        f'<a href="/{key}/">{esc(value["label"])} guides</a>'
        for key, value in REGIONS.items()
        if key != region_key
    )
    return f'''<footer><p>{esc(region['footer'])}</p>
    <p>These guides use official provider information. An official-source check does not mean we have visited every activity.</p>
    <p>Prices &amp; schedules change — always check the provider before booking.</p>
    <div class="footer-links"><a href="{directory}">Explore the Globee directory</a><a href="/{region_key}/">All {esc(region['city'])} guides</a>{other_regions}<a href="/privacy.html">Privacy &amp; analytics</a>{settings}</div></footer></body></html>'''


def guide(slug, items, as_of, production, *, region_key="exeter"):
    region = REGIONS[region_key]
    directory = directory_url(region_key)
    info = region["guides"][slug]
    this_weekend = choose(items, slug, as_of, region_key=region_key)
    next_weekend = choose(items, slug, as_of, week_offset=1, region_key=region_key) if slug == "this-weekend" else []
    # Count actual distinct choices, even if a longer event spans both weekends.
    selected = list({item["id"]: item for item in next_weekend + this_weekend}.values())
    entries = [(item, item["id"]) for item in this_weekend]
    entries += [(item, item["id"] + "-next-weekend") for item in next_weekend]
    # An editorial starting threshold, not a Google ranking rule.
    indexable = production and len(selected) >= 2
    route = f"/{region_key}/{slug}/"
    schema = {"@context": "https://schema.org", "@type": "CollectionPage", "name": info["title"],
              "url": PUBLIC_BASE + route, "inLanguage": "en-GB",
              "mainEntity": {"@type": "ItemList", "itemListElement": [
                  {"@type": "ListItem", "position": n, "name": item["name"],
                   "url": PUBLIC_BASE + route + "#" + anchor} for n, (item, anchor) in enumerate(entries, 1)]}}
    if slug == "this-weekend":
        sections = []
        for offset, title, section_id, choices in (
            (0, "This weekend", "current-weekend", this_weekend),
            (1, "Next weekend", "next-weekend", next_weekend),
        ):
            start, end = weekend(as_of)
            start += timedelta(weeks=offset)
            end += timedelta(weeks=offset)
            cards = "".join(card(item, anchor=item["id"] + ("-next-weekend" if offset else ""),
                                 heading_level=3) for item in choices)
            if not cards:
                message = ("No remaining confirmed events are listed for this weekend."
                           if not offset else "No confirmed choices are listed for next weekend yet.")
                cards = f'<p class="empty">{message} Explore the other guides or check the Globee directory.</p>'
            sections.append(f'''<section class="weekend-section" id="{section_id}" aria-labelledby="{section_id}-heading">
                <h2 id="{section_id}-heading">{title}</h2>
                <p class="date-range"><time datetime="{start.isoformat()}">Saturday {display_date(start)}</time> – <time datetime="{end.isoformat()}">Sunday {display_date(end)}</time></p>
                <div class="results"><p>{len(choices)} checked {'choice' if len(choices) == 1 else 'choices'}</p><span>Official links with every activity</span></div>
                <div class="activities">{cards}</div></section>''')
        contents = "".join(sections)
    else:
        cards = "".join(card(item) for item in selected)
        if not cards:
            cards = '<p class="empty">No current choices have been confirmed for this guide yet. You can explore the other guides or check the Globee directory.</p>'
        contents = f'''<div class="results"><p>{len(selected)} checked {'choice' if len(selected) == 1 else 'choices'}</p><span>Official links with every activity</span></div>
            <div class="activities">{cards}</div>'''
    page = head(info["title"], info["description"], route, indexable, schema, production,
                region_key=region_key) + navigation(slug, region_key=region_key)
    page += f'''<main id="main"><div class="intro"><a class="breadcrumb" href="/{region_key}/">{esc(region['city'])} family guides</a>
      <h1>{esc(info['title'])}</h1><p>{esc(info['intro'])}</p></div>
      {contents}
      <aside class="planning"><h2>{esc(info['help_title'])}</h2><p>{esc(info['help'])}</p></aside>
      <section class="continue"><h2>Keep planning with Globee</h2><p>Explore more places, holiday clubs and the calendar.</p>
      <a class="button" href="{directory}">Open Globee</a>{f'<a class="button secondary" href="/plans.html?region=Bristol&amp;edit=bristol">Open the Bristol edit and map</a>' if region_key == 'bristol' else ''}</section></main>''' + footer(production, region_key=region_key)
    return page, selected, indexable


def build(catalog_path, output, as_of, production=False):
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    items = validate(catalog, as_of)
    manifest = {"as_of": local_now(as_of).date().isoformat(), "evaluated_at": local_now(as_of).isoformat(),
                "mode": "production" if production else "preview",
                "input_sha256": hashlib.sha256(catalog_path.read_bytes()).hexdigest(), "pages": []}
    output.mkdir(parents=True, exist_ok=True)
    (output / "seo-assets").mkdir(exist_ok=True)
    shutil.copyfile(HERE / "guides.css", output / "seo-assets/guides.css")
    sitemap = ET.Element("urlset", xmlns="http://www.sitemaps.org/schemas/sitemap/0.9")
    for region_key, region in REGIONS.items():
        guide_links = []
        region_pages = []
        for slug, info in region["guides"].items():
            page, selected, indexable = guide(slug, items, as_of, production, region_key=region_key)
            route = f"/{region_key}/{slug}/"
            destination = output / route.strip("/") / "index.html"
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_text(page, encoding="utf-8")
            entry = {"path": route, "items": [x["id"] for x in selected], "indexable": indexable}
            manifest["pages"].append(entry)
            region_pages.append(entry)
            scope = " across this weekend and next" if slug == "this-weekend" else ""
            guide_links.append(f'<a class="guide-link" href="{route}"><h2>{esc(info["short"])}</h2><p>{esc(info["intro"])}</p><span>{len(selected)} checked choices{scope} <span aria-hidden="true">→</span></span></a>')
            if indexable:
                ET.SubElement(ET.SubElement(sitemap, "url"), "loc").text = PUBLIC_BASE + route
        # Do not fabricate lastmod by using the time a build happened to run.
        hub_route = f"/{region_key}/"
        hub_title = region["hub_title"]
        hub_description = region["hub_description"]
        hub_indexable = production and any(page["indexable"] for page in region_pages)
        hub = head(hub_title, hub_description, hub_route, hub_indexable,
                   {"@context": "https://schema.org", "@type": "CollectionPage", "name": hub_title,
                    "url": PUBLIC_BASE + hub_route, "inLanguage": "en-GB"}, production,
                   region_key=region_key)
        hub += f'<main id="main"><div class="intro"><p class="eyebrow">Plan your next day out</p><h1>{esc(hub_title)}</h1><p>Choose a guide, compare the practical details, and check the official provider before travelling.</p></div><div class="guide-links">{"".join(guide_links)}</div></main>' + footer(production, region_key=region_key)
        (output / region_key / "index.html").write_text(hub, encoding="utf-8")
        manifest["pages"].append({"path": hub_route, "items": [], "indexable": hub_indexable, "kind": "hub"})
        if hub_indexable:
            ET.SubElement(ET.SubElement(sitemap, "url"), "loc").text = PUBLIC_BASE + hub_route
    ET.ElementTree(sitemap).write(output / "seo-sitemap.xml", encoding="utf-8", xml_declaration=True)
    (output / "build-report.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=HERE / "catalog.json")
    parser.add_argument("--output", type=Path, default=HERE / "preview")
    parser.add_argument("--as-of", type=parse_date, help="Evaluate at London midnight on a fixed date (for reproducible previews/tests)")
    parser.add_argument("--production", action="store_true", help="Allow sufficiently populated guides to be indexed after deployment")
    args = parser.parse_args()
    as_of = args.as_of if args.as_of is not None else datetime.now(LONDON)
    print(json.dumps(build(args.catalog, args.output, as_of, args.production), indent=2))


if __name__ == "__main__":
    main()
