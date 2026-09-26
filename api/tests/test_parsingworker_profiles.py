import unittest
from unittest.mock import patch

from _support import TEST_ROOT  # noqa: F401
from onthespot.basemodels import DownloadProfile  # noqa: E402
from onthespot.parsingworker import ParsingWorker  # noqa: E402


class ParsingWorkerProfileTests(unittest.TestCase):
    def test_missing_configured_profiles_falls_back_to_default(self):
        values = {
            "download_profiles": [],
            "active_download_profile": "mp3-320",
        }
        with patch(
            "onthespot.parsingworker.config.get",
            side_effect=lambda key, default=None: values.get(key, default),
        ):
            profile = ParsingWorker()._get_active_profile()

        self.assertEqual(
            profile,
            DownloadProfile(
                id="mp3-320",
                name="MP3 · 320 kbps",
                format="mp3",
                bitrate=320,
            ),
        )

    def test_active_profile_is_used_when_configured(self):
        values = {
            "download_profiles": [
                {"id": "mp3-320", "name": "MP3", "format": "mp3", "bitrate": 320},
                {"id": "flac", "name": "FLAC", "format": "flac", "bitrate": 1411},
            ],
            "active_download_profile": "flac",
        }
        with patch(
            "onthespot.parsingworker.config.get",
            side_effect=lambda key, default=None: values.get(key, default),
        ):
            profile = ParsingWorker()._get_active_profile()

        self.assertEqual(profile.id, "flac")
        self.assertEqual(profile.format, "flac")
        self.assertEqual(profile.bitrate, 1411)


if __name__ == "__main__":
    unittest.main()
