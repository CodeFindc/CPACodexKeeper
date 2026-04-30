import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from src.combined_runtime import run_combined
from src.status_snapshot import MODE_ONCE


class SettingsStub:
    def __init__(self):
        self.cpa_endpoint = "https://example.com"
        self.cpa_token = "secret"
        self.status_host = "127.0.0.1"
        self.status_port = 8080
        self.status_snapshot_path = pathlib.Path("/tmp/status.json")
        self.status_static_dir = pathlib.Path("/tmp/frontend-dist")
        self.interval_seconds = 42


class RecordingServer:
    instances = []
    should_fail_init = False
    should_fail_start = False

    def __init__(self, host, port, snapshot_path, static_dir=None, account_details_provider=None, deleted_accounts_provider=None):
        if self.__class__.should_fail_init:
            raise RuntimeError("server init failed")
        self.host = host
        self.port = port
        self.snapshot_path = snapshot_path
        self.static_dir = static_dir
        self.account_details_provider = account_details_provider
        self.deleted_accounts_provider = deleted_accounts_provider
        self.started = False
        self.closed = False
        self.close_calls = 0
        self.__class__.instances.append(self)

    def start(self):
        if self.__class__.should_fail_start:
            raise RuntimeError("server start failed")
        self.started = True

    def close(self):
        self.close_calls += 1
        self.closed = True


class RecordingKeeper:
    instances = []
    should_fail_run = False
    should_fail_run_forever = False

    def __init__(self, settings, dry_run=False):
        self.settings = settings
        self.dry_run = dry_run
        self.run_modes = []
        self.run_forever_intervals = []
        self.__class__.instances.append(self)

    def list_account_details(self):
        return [{"id": "acct-1", "name": "Account 1"}]

    def list_deleted_accounts(self, *, limit=None):
        return []

    def run(self, mode):
        self.run_modes.append(mode)
        if self.__class__.should_fail_run:
            raise RuntimeError("keeper run failed")

    def run_forever(self, interval_seconds):
        self.run_forever_intervals.append(interval_seconds)
        if self.__class__.should_fail_run_forever:
            raise RuntimeError("keeper run_forever failed")


class CombinedRuntimeTests(unittest.TestCase):
    def setUp(self):
        RecordingServer.instances = []
        RecordingServer.should_fail_init = False
        RecordingServer.should_fail_start = False
        RecordingKeeper.instances = []
        RecordingKeeper.should_fail_run = False
        RecordingKeeper.should_fail_run_forever = False
        self.settings = SettingsStub()

    def test_run_combined_starts_server_before_keeper_daemon_loop(self):
        run_combined(
            self.settings,
            dry_run=True,
            daemon=True,
            keeper_cls=RecordingKeeper,
            server_cls=RecordingServer,
        )

        self.assertEqual(len(RecordingServer.instances), 1)
        self.assertEqual(len(RecordingKeeper.instances), 1)
        server = RecordingServer.instances[0]
        keeper = RecordingKeeper.instances[0]
        self.assertTrue(server.started)
        self.assertTrue(server.closed)
        self.assertEqual(server.close_calls, 1)
        self.assertEqual(server.host, "127.0.0.1")
        self.assertEqual(server.port, 8080)
        self.assertEqual(server.snapshot_path, pathlib.Path("/tmp/status.json"))
        self.assertEqual(server.static_dir, pathlib.Path("/tmp/frontend-dist"))
        self.assertTrue(keeper.dry_run)
        self.assertEqual(keeper.run_modes, [])
        self.assertEqual(keeper.run_forever_intervals, [42])

    def test_run_combined_runs_once_mode_when_daemon_disabled(self):
        run_combined(
            self.settings,
            daemon=False,
            keeper_cls=RecordingKeeper,
            server_cls=RecordingServer,
        )

        self.assertEqual(len(RecordingServer.instances), 1)
        self.assertEqual(len(RecordingKeeper.instances), 1)
        server = RecordingServer.instances[0]
        keeper = RecordingKeeper.instances[0]
        self.assertTrue(server.started)
        self.assertTrue(server.closed)
        self.assertEqual(server.close_calls, 1)
        self.assertEqual(keeper.run_modes, [MODE_ONCE])
        self.assertEqual(keeper.run_forever_intervals, [])

    def test_run_combined_does_not_call_keeper_when_server_startup_fails(self):
        RecordingServer.should_fail_start = True

        with self.assertRaisesRegex(RuntimeError, "server start failed"):
            run_combined(
                self.settings,
                keeper_cls=RecordingKeeper,
                server_cls=RecordingServer,
            )

        self.assertEqual(len(RecordingServer.instances), 1)
        self.assertEqual(len(RecordingKeeper.instances), 1)
        keeper = RecordingKeeper.instances[0]
        self.assertEqual(keeper.run_modes, [])
        self.assertEqual(keeper.run_forever_intervals, [])
        self.assertTrue(RecordingServer.instances[0].closed)
        self.assertEqual(RecordingServer.instances[0].close_calls, 1)

    def test_run_combined_closes_server_when_keeper_daemon_startup_fails(self):
        RecordingKeeper.should_fail_run_forever = True

        with self.assertRaisesRegex(RuntimeError, "keeper run_forever failed"):
            run_combined(
                self.settings,
                keeper_cls=RecordingKeeper,
                server_cls=RecordingServer,
            )

        self.assertEqual(len(RecordingServer.instances), 1)
        self.assertEqual(len(RecordingKeeper.instances), 1)
        self.assertTrue(RecordingServer.instances[0].started)
        self.assertTrue(RecordingServer.instances[0].closed)
        self.assertEqual(RecordingServer.instances[0].close_calls, 1)

    def test_run_combined_closes_server_when_keeper_once_startup_fails(self):
        RecordingKeeper.should_fail_run = True

        with self.assertRaisesRegex(RuntimeError, "keeper run failed"):
            run_combined(
                self.settings,
                daemon=False,
                keeper_cls=RecordingKeeper,
                server_cls=RecordingServer,
            )

        self.assertEqual(len(RecordingServer.instances), 1)
        self.assertEqual(len(RecordingKeeper.instances), 1)
        self.assertTrue(RecordingServer.instances[0].started)
        self.assertTrue(RecordingServer.instances[0].closed)
        self.assertEqual(RecordingServer.instances[0].close_calls, 1)


if __name__ == "__main__":
    unittest.main()
