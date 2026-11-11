"""Offline regression checks for publication history across snapshot refreshes."""
import importlib.util
import json
import pathlib
import tempfile
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('refresh', pathlib.Path(__file__).with_name('refresh-db-snapshot.py'))
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)

class PublicationHistoryTests(unittest.TestCase):
    def test_refresh_retains_removed_unknown_and_original_dates(self):
        previous = {'master': [{'name': n, 'region': 'Devon', 'date_added': d} for n, d in [('Old', '2026-10-10'), ('Unknown', ''), ('Removed', '2026-09-01')]], 'events': []}
        fresh = [{'name': n, 'region': 'Devon', 'date_added': '2026-11-11'} for n in ['Old', 'Unknown', 'New']]
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            target = root / 'db-snapshot.js'
            target.write_text('window.GLOBEE_SNAPSHOT=' + json.dumps(previous) + ';\n')
            with patch.object(refresh, 'ROOT', root), patch.object(refresh, 'fetch', side_effect=[fresh, []]):
                refresh.main()
            history = refresh.read_snapshot(target)['publicationHistory']
            self.assertEqual(history, {'Exeter|old': '2026-10-10', 'Exeter|unknown': None, 'Exeter|removed': '2026-09-01', 'Exeter|new': '2026-11-11'})

    def test_invalid_and_earliest_dates(self):
        snapshot = {'master': [{'name': 'Workshop', 'region': ' Devon ', 'date_added': '2026-11-11'}], 'events': [{'name': 'Workshop', 'region': 'Devon', 'added': '2026-10-01'}, {'name': 'Bad date', 'region': 'Bristol', 'added': '2026-02-30'}]}
        self.assertEqual(refresh.publication_history(snapshot, {}), {'Exeter|workshop': '2026-10-01', 'Bristol|bad date': None})

    def test_unreadable_history_stops_refresh_without_overwriting(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            target = root / 'db-snapshot.js'
            target.write_text('not a snapshot')
            with patch.object(refresh, 'ROOT', root), patch.object(refresh, 'fetch') as fetch:
                with self.assertRaises(ValueError):
                    refresh.main()
                fetch.assert_not_called()
            self.assertEqual(target.read_text(), 'not a snapshot')

if __name__ == '__main__':
    unittest.main()
