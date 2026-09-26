import unittest
from unittest.mock import patch

import requests

from _support import TEST_ROOT  # noqa: F401
from onthespot.playlist_automation import (  # noqa: E402
    PlaylistAutomation,
    PlaylistAutomationError,
)


class PlaylistAutomationSortScanTests(unittest.TestCase):
    def test_valid_empty_playlist_still_returns_a_scan_result(self):
        service = PlaylistAutomation()
        service.playlists = lambda: [{"id": "empty", "name": "Empty playlist"}]
        service.playlist_tracks = lambda _playlist_id: []

        results = service.sort_scan(
            {"playlist_ids": ["empty"], "sort_enabled": False}
        )

        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]["playlist_id"], "empty")
        self.assertEqual(results[0]["stats"]["original_count"], 0)
        self.assertEqual(results[0]["changes"], [])

    def test_stale_playlist_selection_returns_actionable_error(self):
        service = PlaylistAutomation()
        service.playlists = lambda: [{"id": "current", "name": "Current playlist"}]

        with self.assertRaisesRegex(
            PlaylistAutomationError,
            "Refresh the playlist list and select them again",
        ):
            service.sort_scan({"playlist_ids": ["stale"], "sort_enabled": False})

    def test_spotify_connection_failure_is_reported_as_playlist_error(self):
        service = PlaylistAutomation()
        service._access_token = lambda: "test-token"
        service._cache_ttl = lambda: 0

        with patch(
            "onthespot.playlist_automation.requests.request",
            side_effect=requests.Timeout("request timed out"),
        ):
            with self.assertRaisesRegex(
                PlaylistAutomationError,
                "Could not reach Spotify API during GET /me/playlists: request timed out",
            ):
                service._request("GET", "/me/playlists")


if __name__ == "__main__":
    unittest.main()
