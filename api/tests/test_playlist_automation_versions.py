import unittest

from _support import TEST_ROOT  # noqa: F401
from onthespot.playlist_automation import PlaylistAutomation  # noqa: E402


class PlaylistVersionScopeTests(unittest.TestCase):
    def setUp(self):
        self.service = PlaylistAutomation()
        self.track = {
            "id": "target",
            "uri": "spotify:track:target",
            "name": "Signal (2020 Remastered)",
            "artist": "Target Artist",
            "release_date": "2020-01-01",
        }
        self.search_results = [
            {
                "id": "same-artist",
                "uri": "spotify:track:same-artist",
                "name": "Signal",
                "artists": [{"name": "Target Artist"}],
                "album": {"name": "Signal", "release_date": "2010-01-01"},
            },
            {
                "id": "other-artist",
                "uri": "spotify:track:other-artist",
                "name": "Signal",
                "artists": [{"name": "Different Artist"}],
                "album": {"name": "Signal", "release_date": "2000-01-01"},
            },
        ]

    def test_artist_only_search_excludes_other_artists(self):
        requests = []

        def request(method, path, **kwargs):
            requests.append((method, path, kwargs["params"]["q"]))
            return {"tracks": {"items": self.search_results}}

        self.service._request = request

        candidates = self.service._version_candidates(
            self.track, "Artist Only: Oldest Version"
        )

        self.assertEqual([item["id"] for item in candidates], ["same-artist"])
        self.assertIn("artist:target artist", requests[0][2])

    def test_global_search_can_include_other_artists_with_matching_title(self):
        requests = []

        def request(method, path, **kwargs):
            requests.append((method, path, kwargs["params"]["q"]))
            return {"tracks": {"items": self.search_results}}

        self.service._request = request

        candidates = self.service._version_candidates(
            self.track, "Global: Oldest Version"
        )

        self.assertEqual(
            [item["id"] for item in candidates], ["same-artist", "other-artist"]
        )
        self.assertNotIn("artist:", requests[0][2])

    def test_dynamic_version_scope_changes_grouping(self):
        tracks = [
            {
                "id": "target-2020",
                "uri": "spotify:track:target-2020",
                "name": "Signal",
                "artist": "Target Artist",
                "release_date": "2020-01-01",
            },
            {
                "id": "target-2024",
                "uri": "spotify:track:target-2024",
                "name": "Signal (2024 Remastered)",
                "artist": "Target Artist",
                "release_date": "2024-01-01",
            },
            {
                "id": "different-artist",
                "uri": "spotify:track:different-artist",
                "name": "Signal",
                "artist": "Different Artist",
                "release_date": "2000-01-01",
            },
        ]
        self.service.playlists = lambda: [{"id": "source", "name": "Source"}]
        self.service.playlist_tracks = lambda _playlist_id: tracks

        artist_only = self.service.scan(
            {
                "playlist_ids": ["source"],
                "sort_enabled": False,
                "version_replacer": True,
                "version_preference": "Artist Only: Oldest Version",
            }
        )
        global_scope = self.service.scan(
            {
                "playlist_ids": ["source"],
                "sort_enabled": False,
                "version_replacer": True,
                "version_preference": "Global: Oldest Version",
            }
        )

        self.assertEqual(
            {track["id"] for track in artist_only["tracks"]},
            {"target-2020", "different-artist"},
        )
        self.assertEqual(
            [track["id"] for track in global_scope["tracks"]], ["different-artist"]
        )


if __name__ == "__main__":
    unittest.main()
