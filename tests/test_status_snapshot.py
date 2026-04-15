import json
import pathlib
import sys
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))

from status_snapshot import (
    ERROR_INVALID_SNAPSHOT,
    MODE_DAEMON,
    MODE_ONCE,
    MODE_UNKNOWN,
    RESULT_FAILURE,
    RESULT_PARTIAL,
    RESULT_SUCCESS,
    STATE_DAEMON_ACTIVE,
    STATE_NEVER_RUN,
    STATE_ONCE_COMPLETE,
    STATE_SNAPSHOT_ERROR,
    STATE_STALE,
    SnapshotPayload,
    SnapshotStore,
    SnapshotWriter,
    to_iso8601,
)


class StatusSnapshotTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.snapshot_path = pathlib.Path(self.temp_dir.name) / "status-snapshot.json"
        self.store = SnapshotStore(self.snapshot_path)
        self.now = datetime(2026, 4, 14, 12, 0, tzinfo=timezone.utc)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_resolve_missing_file_returns_never_run(self):
        resolved = self.store.resolve(now=self.now)

        self.assertEqual(resolved.state, STATE_NEVER_RUN)
        self.assertEqual(resolved.mode, MODE_UNKNOWN)
        self.assertEqual(resolved.result, RESULT_FAILURE)
        self.assertIsNone(resolved.summary)
        self.assertIsNone(resolved.code)

    def test_resolve_valid_once_snapshot_returns_once_complete(self):
        self.store.write_snapshot(
            SnapshotPayload(
                mode=MODE_ONCE,
                result=RESULT_SUCCESS,
                started_at=to_iso8601(self.now - timedelta(seconds=10)),
                finished_at=to_iso8601(self.now - timedelta(seconds=5)),
                updated_at=to_iso8601(self.now),
                interval_seconds=300,
                summary={
                    "total": 1,
                    "alive": 1,
                    "dead": 0,
                    "disabled": 0,
                    "enabled": 0,
                    "refreshed": 0,
                    "skipped": 0,
                    "network_error": 0,
                },
            )
        )

        resolved = self.store.resolve(now=self.now)

        self.assertEqual(resolved.state, STATE_ONCE_COMPLETE)
        self.assertEqual(resolved.mode, MODE_ONCE)
        self.assertEqual(resolved.result, RESULT_SUCCESS)
        self.assertEqual(resolved.started_at, to_iso8601(self.now - timedelta(seconds=10)))
        self.assertEqual(resolved.finished_at, to_iso8601(self.now - timedelta(seconds=5)))
        self.assertEqual(resolved.updated_at, to_iso8601(self.now))

    def test_resolve_valid_daemon_snapshot_before_stale_deadline_returns_active(self):
        self.store.write_snapshot(
            SnapshotPayload(
                mode=MODE_DAEMON,
                result=RESULT_PARTIAL,
                started_at=to_iso8601(self.now - timedelta(seconds=620)),
                finished_at=to_iso8601(self.now - timedelta(seconds=600)),
                updated_at=to_iso8601(self.now - timedelta(seconds=590)),
                interval_seconds=300,
                summary={
                    "total": 2,
                    "alive": 2,
                    "dead": 0,
                    "disabled": 0,
                    "enabled": 0,
                    "refreshed": 0,
                    "skipped": 0,
                    "network_error": 0,
                },
            )
        )

        resolved = self.store.resolve(now=self.now)

        self.assertEqual(resolved.state, STATE_DAEMON_ACTIVE)
        self.assertEqual(resolved.result, RESULT_PARTIAL)

    def test_resolve_valid_daemon_snapshot_after_two_intervals_returns_stale(self):
        self.store.write_snapshot(
            SnapshotPayload(
                mode=MODE_DAEMON,
                result=RESULT_SUCCESS,
                started_at=to_iso8601(self.now - timedelta(seconds=630)),
                finished_at=to_iso8601(self.now - timedelta(seconds=610)),
                updated_at=to_iso8601(self.now - timedelta(seconds=601)),
                interval_seconds=300,
                summary={
                    "total": 2,
                    "alive": 1,
                    "dead": 1,
                    "disabled": 0,
                    "enabled": 0,
                    "refreshed": 0,
                    "skipped": 0,
                    "network_error": 0,
                },
            )
        )

        resolved = self.store.resolve(now=self.now)

        self.assertEqual(resolved.state, STATE_STALE)

    def test_resolve_invalid_json_returns_snapshot_error(self):
        self.snapshot_path.write_text("{not-json", encoding="utf-8")

        resolved = self.store.resolve(now=self.now)

        self.assertEqual(resolved.state, STATE_SNAPSHOT_ERROR)
        self.assertEqual(resolved.code, ERROR_INVALID_SNAPSHOT)
        self.assertIn("invalid JSON", resolved.message)

    def test_resolve_missing_summary_network_error_returns_snapshot_error(self):
        payload = {
            "mode": MODE_DAEMON,
            "result": RESULT_SUCCESS,
            "started_at": to_iso8601(self.now - timedelta(seconds=20)),
            "finished_at": to_iso8601(self.now - timedelta(seconds=10)),
            "updated_at": to_iso8601(self.now),
            "interval_seconds": 300,
            "summary": {
                "total": 1,
                "alive": 1,
                "dead": 0,
                "disabled": 0,
                "enabled": 0,
                "refreshed": 0,
                "skipped": 0,
            },
        }
        self.store.write_raw_json(payload)

        resolved = self.store.resolve(now=self.now)

        self.assertEqual(resolved.state, STATE_SNAPSHOT_ERROR)
        self.assertEqual(resolved.code, ERROR_INVALID_SNAPSHOT)
        self.assertIn("missing required field: summary.network_error", resolved.message)

    def test_write_snapshot_persists_raw_json(self):
        snapshot = SnapshotPayload(
            mode=MODE_ONCE,
            result=RESULT_FAILURE,
            started_at=to_iso8601(self.now - timedelta(seconds=30)),
            finished_at=to_iso8601(self.now - timedelta(seconds=15)),
            updated_at=to_iso8601(self.now),
            interval_seconds=60,
            summary={
                "total": 3,
                "alive": 2,
                "dead": 1,
                "disabled": 0,
                "enabled": 0,
                "refreshed": 0,
                "skipped": 0,
                "network_error": 1,
            },
        )

        self.store.write_snapshot(snapshot)

        raw_payload = json.loads(self.snapshot_path.read_text(encoding="utf-8"))
        self.assertEqual(
            sorted(raw_payload.keys()),
            [
                "finished_at",
                "interval_seconds",
                "mode",
                "result",
                "started_at",
                "summary",
                "updated_at",
            ],
        )
        self.assertEqual(raw_payload["mode"], MODE_ONCE)
        self.assertEqual(raw_payload["result"], RESULT_FAILURE)
        self.assertEqual(raw_payload["summary"]["network_error"], 1)

    def test_snapshot_writer_writes_started_snapshot_with_null_finished_at(self):
        writer = SnapshotWriter(self.snapshot_path)

        started_at = writer.write_started(MODE_DAEMON, 300, started_at=self.now - timedelta(seconds=20))

        raw_payload = json.loads(self.snapshot_path.read_text(encoding="utf-8"))
        self.assertEqual(started_at, to_iso8601(self.now - timedelta(seconds=20)))
        self.assertEqual(raw_payload["started_at"], to_iso8601(self.now - timedelta(seconds=20)))
        self.assertIsNone(raw_payload["finished_at"])
        self.assertEqual(raw_payload["updated_at"], to_iso8601(self.now - timedelta(seconds=20)))
        self.assertEqual(raw_payload["result"], RESULT_FAILURE)

    def test_resolve_started_snapshot_accepts_null_finished_at(self):
        self.store.write_raw_json(
            {
                "mode": MODE_DAEMON,
                "result": RESULT_FAILURE,
                "started_at": to_iso8601(self.now - timedelta(seconds=20)),
                "finished_at": None,
                "updated_at": to_iso8601(self.now - timedelta(seconds=20)),
                "interval_seconds": 300,
                "summary": {
                    "total": 0,
                    "alive": 0,
                    "dead": 0,
                    "disabled": 0,
                    "enabled": 0,
                    "refreshed": 0,
                    "skipped": 0,
                    "network_error": 0,
                },
            }
        )

        resolved = self.store.resolve(now=self.now)

        self.assertEqual(resolved.state, STATE_DAEMON_ACTIVE)
        self.assertEqual(resolved.finished_at, None)
        self.assertEqual(resolved.started_at, to_iso8601(self.now - timedelta(seconds=20)))

    def test_snapshot_writer_writes_started_and_finished_snapshots(self):
        writer = SnapshotWriter(self.snapshot_path)
        started_at = writer.write_started(MODE_DAEMON, 300, started_at=self.now - timedelta(seconds=20))
        writer.write_finished(
            MODE_DAEMON,
            300,
            RESULT_PARTIAL,
            {
                "total": 4,
                "alive": 3,
                "dead": 0,
                "disabled": 1,
                "enabled": 0,
                "refreshed": 0,
                "skipped": 0,
                "network_error": 1,
            },
            started_at=started_at,
            finished_at=self.now,
        )

        resolved = self.store.resolve(now=self.now + timedelta(seconds=10))

        self.assertEqual(resolved.mode, MODE_DAEMON)
        self.assertEqual(resolved.result, RESULT_PARTIAL)
        self.assertEqual(resolved.started_at, to_iso8601(self.now - timedelta(seconds=20)))
        self.assertEqual(resolved.finished_at, to_iso8601(self.now))
        self.assertEqual(resolved.updated_at, to_iso8601(self.now))
        self.assertEqual(resolved.summary["network_error"], 1)


if __name__ == "__main__":
    unittest.main()
