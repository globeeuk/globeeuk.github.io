#!/usr/bin/env python3
"""Check live Sheet bindings, render guides and stage only their public files.

This command does not verify provider claims, update dates or publish to GitHub.
Run from a clean checkout of globeeuk/globeeuk.github.io after verified research
has been reconciled with the operational Sheet and exported to catalog.json.
"""
import copy
import json
import shutil
from datetime import datetime
from pathlib import Path
from xml.etree import ElementTree as ET

from build import GUIDES, HERE, LONDON, PUBLIC_BASE, build
from check_sheet_bindings import check_bindings, fetch_queue

NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9"
SEO_URLS = {PUBLIC_BASE + "/exeter/"} | {
    PUBLIC_BASE + f"/exeter/{slug}/" for slug in GUIDES
}


def merged_sitemap(existing, generated):
    """Replace only these four SEO entries; retain every other URL and field."""
    ET.register_namespace("", NAMESPACE)
    root = ET.fromstring(existing)
    additions = ET.fromstring(generated)
    if root.tag != f"{{{NAMESPACE}}}urlset" or additions.tag != root.tag:
        raise ValueError("Expected existing and generated sitemap urlsets")
    for node in list(root):
        if node.findtext(f"{{{NAMESPACE}}}loc") in SEO_URLS:
            root.remove(node)
    for node in additions:
        if node.findtext(f"{{{NAMESPACE}}}loc") not in SEO_URLS:
            raise ValueError("Generated sitemap contains an unexpected URL")
        root.append(copy.deepcopy(node))
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
    sitemap = merged_sitemap((root / "sitemap.xml").read_bytes(),
                             (output / "seo-sitemap.xml").read_bytes())
    files = ["exeter/index.html", "seo-assets/guides.css", "seo-sitemap.xml"]
    files += [f"exeter/{slug}/index.html" for slug in GUIDES]
    for relative in files:
        destination = root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(output / relative, destination)
    (root / "sitemap.xml").write_bytes(sitemap)
    print(json.dumps({"sheet_check": report, "build": manifest,
                      "staged_files": files + ["sitemap.xml"],
                      "published": False}, indent=2))


if __name__ == "__main__":
    main()
