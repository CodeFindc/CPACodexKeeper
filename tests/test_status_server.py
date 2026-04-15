import json
import pathlib
import sys
import tempfile
import unittest
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from status_server import StatusServer
from status_snapshot import MODE_DAEMON, RESULT_PARTIAL, SnapshotPayload, SnapshotStore, to_iso8601, utc_now


class StatusServerTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.snapshot_path = pathlib.Path(self.temp_dir.name) / "status-snapshot.json"
        self.store = SnapshotStore(self.snapshot_path)
        self.now = datetime(2026, 4, 14, 12, 0, tzinfo=timezone.utc)
        self.server = None

    def tearDown(self):
        if self.server is not None:
            self.server.close()
        self.temp_dir.cleanup()

    def test_status_json_returns_resolved_snapshot_payload(self):
        now = utc_now()
        self.store.write_snapshot(
            SnapshotPayload(
                mode=MODE_DAEMON,
                result=RESULT_PARTIAL,
                started_at=to_iso8601(now - timedelta(seconds=20)),
                finished_at=to_iso8601(now - timedelta(seconds=10)),
                updated_at=to_iso8601(now),
                interval_seconds=300,
                summary={
                    "total": 2,
                    "alive": 1,
                    "dead": 1,
                    "disabled": 0,
                    "enabled": 0,
                    "refreshed": 0,
                    "skipped": 0,
                    "network_error": 1,
                },
            )
        )
        self.server = StatusServer("127.0.0.1", 0, self.snapshot_path)
        self.server.start()

        response = self._get("/api/status.json")
        payload = json.loads(response.read().decode("utf-8"))

        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers["Content-Type"], "application/json; charset=utf-8")
        self.assertEqual(payload["state"], "daemon-active")
        self.assertEqual(payload["result"], "partial")
        self.assertEqual(payload["summary"]["network_error"], 1)

    def test_status_html_returns_resolved_snapshot_html(self):
        now = utc_now()
        self.store.write_snapshot(
            SnapshotPayload(
                mode=MODE_DAEMON,
                result=RESULT_PARTIAL,
                started_at=to_iso8601(now - timedelta(seconds=20)),
                finished_at=to_iso8601(now - timedelta(seconds=10)),
                updated_at=to_iso8601(now),
                interval_seconds=300,
                summary={
                    "total": 2,
                    "alive": 1,
                    "dead": 1,
                    "disabled": 0,
                    "enabled": 0,
                    "refreshed": 0,
                    "skipped": 0,
                    "network_error": 1,
                },
            )
        )
        self.server = StatusServer("127.0.0.1", 0, self.snapshot_path)
        self.server.start()

        response = self._get("/status")
        body = response.read().decode("utf-8")

        self.assertEqual(response.status, 200)
        self.assertEqual(response.headers["Content-Type"], "text/html; charset=utf-8")
        self.assertIn("daemon-active", body)
        self.assertIn("network_error", body)

    def test_status_surfaces_snapshot_error_as_http_503_for_json_and_html(self):
        self.snapshot_path.write_text("{not-json", encoding="utf-8")
        self.server = StatusServer("127.0.0.1", 0, self.snapshot_path)
        self.server.start()

        json_error = self._get_error("/api/status.json")
        html_error = self._get_error("/status")

        self.assertEqual(json_error.code, 503)
        self.assertEqual(json.loads(json_error.read().decode("utf-8"))["state"], "snapshot-error")
        self.assertEqual(html_error.code, 503)
        self.assertIn("snapshot-error", html_error.read().decode("utf-8"))

    def test_unknown_path_returns_404(self):
        self.server = StatusServer("127.0.0.1", 0, self.snapshot_path)
        self.server.start()

        error = self._get_error("/missing")

        self.assertEqual(error.code, 404)

    def _get(self, path: str):
        return urllib.request.urlopen(self._url(path), timeout=5)

    def _get_error(self, path: str) -> urllib.error.HTTPError:
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            self._get(path)
        return ctx.exception

    def _url(self, path: str) -> str:
        host, port = self.server.address
        return f"http://{host}:{port}{path}"


if __name__ == "__main__":
    unittest.main()
