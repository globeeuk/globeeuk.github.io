#!/usr/bin/env python3
"""Check live Sheet bindings, render guides and stage only their public files.

This command does not verify provider claims, renew verification dates or publish
to GitHub. Sitemap lastmod changes only when the corresponding HTML changes.
Run from a clean checkout of globeeuk/globeeuk.github.io after verified research
has been reconciled with the operational Sheet and exported to catalog.json.
"""
import copy
import json
import shutil
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

from build import HERE, LONDON, PUBLIC_BASE, build, published_routes
from check_sheet_bindings import check_bindings, fetch_queue

NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"
SEO_HTML = {PUBLIC_BASE + route: route.strip("/") + "/index.html" for route in published_routes()}
SEO_URLS = set(SEO_HTML)


def changed_html_urls(existing_root, generated_root):
    """Compare page bytes before copying; reports and assets are not page edits."""
    changed = set()
    for url, relative in SEO_HTML.items():
        generated = (generated_root / relative).read_bytes()
        previous = existing_root / relative
        if not previous.exists() or previous.read_bytes() != generated:
            changed.add(url)
    return changed


def merged_sitemap(existing, generated, *, changed_urls=(), moment=None):
    """Keep eligible SEO metadata; update lastmod only for changed HTML pages."""
    ET.register_namespace("", NAMESPACE)
    root = ET.fromstring(existing)
    additions = ET.fromstring(generated)
    if root.tag != f"{{{NAMESPACE}}}urlset" or additions.tag != root.tag:
        raise ValueError("Expected existing and generated sitemap urlsets")
    changed = set(changed_urls)
    if not changed <= SEO_URLS:
        raise ValueError("Changed HTML contains an unexpected SEO URL")
    modified_on = None
    if changed:
        if not isinstance(moment, datetime) or moment.tzinfo is None or moment.utcoffset() is None:
            raise ValueError("Changed HTML requires a timezone-aware evaluation time")
        modified_on = moment.astimezone(LONDON).date().isoformat()
    eligible = {}
    for node in additions:
        url = node.findtext(f"{{{NAMESPACE}}}loc")
        if url not in SEO_URLS:
            raise ValueError("Generated sitemap contains an unexpected URL")
        if url in eligible:
            raise ValueError("Generated sitemap contains a duplicate SEO URL")
        eligible[url] = node

    def update_lastmod(node, url):
        if url in changed:
            lastmod = node.find(f"{{{NAMESPACE}}}lastmod")
            if lastmod is None:
                lastmod = ET.Element(f"{{{NAMESPACE}}}lastmod")
                # Sitemap order is loc, lastmod, changefreq, priority.
                location = node.find(f"{{{NAMESPACE}}}loc")
                node.insert(list(node).index(location) + 1, lastmod)
            lastmod.text = modified_on

    retained = set()
    for node in list(root):
        url = node.findtext(f"{{{NAMESPACE}}}loc")
        if url not in SEO_URLS:
            continue
        if url not in eligible:
            root.remove(node)  # A guide which is now noindex must leave the sitemap.
        else:
            update_lastmod(node, url)
            retained.add(url)
    for url, node in eligible.items():
        if url in retained:
            continue
        added = copy.deepcopy(node)
        # A generated date alone is not evidence of a changed public page.
        for lastmod in list(added.findall(f"{{{NAMESPACE}}}lastmod")):
            added.remove(lastmod)
        update_lastmod(added, url)
        root.append(added)
    ET.indent(root, space="  ")
    return ET.tostring(root, encoding="utf-8", xml_declaration=True) + b"\n"


def main():
    root = HERE.parent
    catalogue_path = HERE / "catalog.json"
    catalogue = json.loads(catalogue_path.read_text(encoding="utf-8"))
    queue = fetch_queue()
    moment = datetime.now(LONDON)
    report = check_bindings(catalogue, queue, as_of=moment, now=moment)
    output = HERE / "production"
    manifest = build(catalogue_path, output, moment, production=True)
    changed_urls = changed_html_urls(root, output)
    sitemap = merged_sitemap((root / "sitemap.xml").read_bytes(),
                             (output / "seo-sitemap.xml").read_bytes(),
                             changed_urls=changed_urls, moment=moment)
    files = sorted(set(SEO_HTML.values())) + ["seo-assets/guides.css", "seo-sitemap.xml"]
    for relative in files:
        destination = root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(output / relative, destination)
    (root / "sitemap.xml").write_bytes(sitemap)
    print(json.dumps({"sheet_check": report, "build": manifest,
                      "staged_files": files + ["sitemap.xml"],
                      "changed_html_urls": sorted(changed_urls),
                      "published": False}, indent=2))


if __name__ == "__main__":
    main()
