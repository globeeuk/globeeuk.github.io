import unittest
from xml.etree import ElementTree as ET

from stage import NAMESPACE, merged_sitemap


class SitemapMergeTests(unittest.TestCase):
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

    def test_rejects_unexpected_generated_url(self):
        old = f'<urlset xmlns="{NAMESPACE}"/>'
        new = f'<urlset xmlns="{NAMESPACE}"><url><loc>https://example.com/</loc></url></urlset>'
        with self.assertRaises(ValueError):
            merged_sitemap(old, new)


if __name__ == "__main__":
    unittest.main()
