"""Birthday article discovery must survive normal guide rebuilds."""
import unittest
from build import footer


class ParentNoteLinks(unittest.TestCase):
    def test_exeter_footer_has_static_descriptive_birthday_link(self):
        markup = footer(production=True, region_key="exeter")
        self.assertIn('href="/parent-notes/exeter-birthday-parties/"', markup)
        self.assertIn('Exeter birthday parties &amp; hall hire', markup)
        self.assertIn('data-analytics-toggle', markup)

    def test_bristol_does_not_present_exeter_parties_as_local(self):
        self.assertNotIn('/parent-notes/exeter-birthday-parties/', footer(production=True, region_key="bristol"))


if __name__ == '__main__':
    unittest.main()
