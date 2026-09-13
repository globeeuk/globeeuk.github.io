import tempfile
import unittest
from datetime import datetime, timezone
from pathlib import Path
from xml.etree import ElementTree as ET

from stage import NAMESPACE, SEO_HTML, changed_html_urls, merged_sitemap

BASE = "https://globeeuk.github.io"


def sitemap(*entries):
    return f'<urlset xmlns="{NAMESPACE}">' + "".join(
        f"<url><loc>{url}</loc>{metadata}</url>" for url, metadata in entries
    ) + "</urlset>"


def by_url(payload):
    return {node.findtext(f"{{{NAMESPACE}}}loc"): node for node in ET.fromstring(payload)}


class SitemapMergeTests(unittest.TestCase):
    def test_unchanged_seo_page_keeps_existing_lastmod_and_metadata(self):
        url = BASE + "/exeter/"
        old = sitemap((url, '<lastmod>2026-09-10T14:15:00+01:00</lastmod><changefreq>weekly</changefreq><priority>0.7</priority>'))
        result = by_url(merged_sitemap(old, sitemap((url, ""))))[url]
        self.assertEqual(result.findtext(f"{{{NAMESPACE}}}lastmod"), "2026-09-10T14:15:00+01:00")
        self.assertEqual(result.findtext(f"{{{NAMESPACE}}}changefreq"), "weekly")
        self.assertEqual(result.findtext(f"{{{NAMESPACE}}}priority"), "0.7")

    def test_only_changed_html_gets_the_london_modification_date(self):
        changed, untouched = BASE + "/exeter/", BASE + "/exeter/rainy-day/"
        old = sitemap((changed, "<lastmod>2026-09-10</lastmod><priority>0.7</priority>"),
                      (untouched, "<lastmod>2026-09-11</lastmod>"))
        new = sitemap((changed, ""), (untouched, ""))
        # Late Sunday UTC is already Monday in London during British Summer Time.
        result = by_url(merged_sitemap(old, new, changed_urls={changed},
                                      moment=datetime(2026, 9, 13, 23, 30, tzinfo=timezone.utc)))
        self.assertEqual(result[changed].findtext(f"{{{NAMESPACE}}}lastmod"), "2026-09-14")
        self.assertEqual(result[changed].findtext(f"{{{NAMESPACE}}}priority"), "0.7")
        self.assertEqual(result[untouched].findtext(f"{{{NAMESPACE}}}lastmod"), "2026-09-11")

    def test_new_page_can_get_lastmod_but_unchanged_page_does_not_invent_one(self):
        changed, untouched = BASE + "/exeter/", BASE + "/exeter/free-things-to-do/"
        new = sitemap((changed, ""), (untouched, "<lastmod>2099-01-01</lastmod>"))
        result = by_url(merged_sitemap(sitemap(), new, changed_urls={changed},
                                      moment=datetime(2026, 9, 13, 18, tzinfo=timezone.utc)))
        self.assertEqual(result[changed].findtext(f"{{{NAMESPACE}}}lastmod"), "2026-09-13")
        self.assertIsNone(result[untouched].find(f"{{{NAMESPACE}}}lastmod"))

    def test_first_lastmod_is_inserted_without_displacing_existing_metadata(self):
        url = BASE + "/exeter/"
        old = sitemap((url, "<changefreq>weekly</changefreq><priority>0.7</priority>"))
        result = by_url(merged_sitemap(old, sitemap((url, "")), changed_urls={url},
                                      moment=datetime(2026, 9, 13, tzinfo=timezone.utc)))[url]
        self.assertEqual([node.tag.rsplit("}", 1)[-1] for node in result],
                         ["loc", "lastmod", "changefreq", "priority"])
        self.assertEqual(result.findtext(f"{{{NAMESPACE}}}priority"), "0.7")

    def test_preserves_non_seo_metadata_and_removes_unindexable_guide(self):
        old = f'''<urlset xmlns="{NAMESPACE}">
          <url><loc>https://globeeuk.github.io/</loc><lastmod>2026-09-10</lastmod></url>
          <url><loc>https://globeeuk.github.io/exeter/another-guide/</loc></url>
          <url><loc>https://globeeuk.github.io/exeter/this-weekend/</loc></url>
          <url><loc>https://globeeuk.github.io/exeter/</loc></url></urlset>'''
        new = f'''<urlset xmlns="{NAMESPACE}"><url><loc>https://globeeuk.github.io/exeter/</loc></url></urlset>'''
        result = ET.fromstring(merged_sitemap(old, new))
        locations = [n.findtext(f"{{{NAMESPACE}}}loc") for n in result]
        self.assertEqual(locations, ["https://globeeuk.github.io/", "https://globeeuk.github.io/exeter/another-guide/", "https://globeeuk.github.io/exeter/"])
        self.assertEqual(result[0].findtext(f"{{{NAMESPACE}}}lastmod"), "2026-09-10")

    def test_thin_guide_removal_preserves_other_tasks_url_metadata(self):
        halloween = BASE + "/halloween.html"
        thin = BASE + "/exeter/this-weekend/"
        old = sitemap((halloween, "<lastmod>2026-09-13</lastmod><changefreq>monthly</changefreq><priority>0.9</priority>"),
                      (thin, "<lastmod>2026-09-12</lastmod>"))
        result = by_url(merged_sitemap(old, sitemap(), changed_urls={thin},
                                      moment=datetime(2026, 9, 14, tzinfo=timezone.utc)))
        self.assertNotIn(thin, result)
        before = by_url(old)[halloween]
        self.assertEqual([(n.tag, n.text, n.attrib) for n in result[halloween]],
                         [(n.tag, n.text, n.attrib) for n in before])

    def test_only_html_bytes_count_and_comparison_happens_before_copy(self):
        with tempfile.TemporaryDirectory() as directory:
            old_root, new_root = Path(directory) / "old", Path(directory) / "new"
            for relative in SEO_HTML.values():
                for root in (old_root, new_root):
                    path = root / relative
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(b"<html>Unchanged activity</html>")
            (old_root / "build-report.json").write_text('{"evaluated_at":"yesterday"}')
            (new_root / "build-report.json").write_text('{"evaluated_at":"today"}')
            (new_root / "guides.css").write_text("body{color:black}")
            self.assertEqual(changed_html_urls(old_root, new_root), set())
            changed = BASE + "/exeter/this-weekend/"
            path = new_root / SEO_HTML[changed]
            path.write_bytes(b"<html>Ended activity removed</html>")
            self.assertEqual(changed_html_urls(old_root, new_root), {changed})
            self.assertEqual((old_root / SEO_HTML[changed]).read_bytes(), b"<html>Unchanged activity</html>")
            (old_root / SEO_HTML[changed]).unlink()
            self.assertEqual(changed_html_urls(old_root, new_root), {changed})

    def test_rejects_unexpected_generated_url(self):
        old = f'<urlset xmlns="{NAMESPACE}"/>'
        new = f'<urlset xmlns="{NAMESPACE}"><url><loc>https://example.com/</loc></url></urlset>'
        with self.assertRaises(ValueError):
            merged_sitemap(old, new)


if __name__ == "__main__":
    unittest.main()
