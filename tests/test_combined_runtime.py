import pathlib
import sys
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from src.combined_runtime import run_combined
from src.settings import Settings
from src.status_snapshot import MODE_DAEMON


class RecordingServer:
    instances = []
    should_fail_init = False
    should_fail_start = False

    def __init__(self, host, port, snapshot_path, static_dir=None):
        if self.__class__.should_fail_init:
            raise RuntimeError("server init failed")
        self.host = host
        self.port = port
        self.snapshot_path = snapshot_path
        self.static_dir = static_dir
        self.started = False
        self.closed = False
        self.__class__.instances.append(self)

    def start(self):
        if self.__class__.should_fail_start:
            raise RuntimeError("server start failed")
        self.started = True

    def close(self):
        self.closed = True


class RecordingKeeper:
    instances = []
    should_fail_run = False

    def __init__(self, settings, dry_run=False):
        self.settings = settings
        self.dry_run = dry_run
        self.run_modes = []
        self.__class__.instances.append(self)

    def run(self, mode):
        self.run_modes.append(mode)
        if self.__class__.should_fail_run:
            raise RuntimeError("keeper run failed")


class CombinedRuntimeTests(unittest.TestCase):
    def setUp(self):
        RecordingServer.instances = []
        RecordingServer.should_fail_init = False
        RecordingServer.should_fail_start = False
        RecordingKeeper.instances = []
        RecordingKeeper.should_fail_run = False
        self.settings = Settings(
            cpa_endpoint="https://example.com",
            cpa_token="secret",
            status_host="127.0.0.1",
            status_port=8080,
            status_snapshot_path=pathlib.Path("/tmp/status.json"),
            status_static_dir=pathlib.Path("/tmp/frontend-dist"),
        )

    def test_run_combined_starts_server_before_keeper_daemon_round(self):
        run_combined(
            self.settings,
            dry_run=True,
            keeper_cls=RecordingKeeper,
            server_cls=RecordingServer,
        )

        self.assertEqual(len(RecordingServer.instances), 1)
        self.assertEqual(len(RecordingKeeper.instances), 1)
        server = RecordingServer.instances[0]
        keeper = RecordingKeeper.instances[0]
        self.assertTrue(server.started)
        self.assertTrue(server.closed)
        self.assertEqual(server.host, "127.0.0.1")
        self.assertEqual(server.port, 8080)
        self.assertEqual(server.snapshot_path, pathlib.Path("/tmp/status.json"))
        self.assertEqual(server.static_dir, pathlib.Path("/tmp/frontend-dist"))
        self.assertTrue(keeper.dry_run)
        self.assertEqual(keeper.run_modes, [MODE_DAEMON])

    def test_run_combined_does_not_call_keeper_when_server_startup_fails(self):
        RecordingServer.should_fail_start = True

        with self.assertRaisesRegex(RuntimeError, "server start failed"):
            run_combined(
                self.settings,
                keeper_cls=RecordingKeeper,
                server_cls=RecordingServer,
            )

        self.assertEqual(len(RecordingServer.instances), 1)
        self.assertEqual(len(RecordingKeeper.instances), 0)
        self.assertTrue(RecordingServer.instances[0].closed)

    def test_run_combined_closes_server_when_keeper_startup_fails(self):
        RecordingKeeper.should_fail_run = True

        with self.assertRaisesRegex(RuntimeError, "keeper run failed"):
            run_combined(
                self.settings,
                keeper_cls=RecordingKeeper,
                server_cls=RecordingServer,
            )

        self.assertEqual(len(RecordingServer.instances), 1)
        self.assertEqual(len(RecordingKeeper.instances), 1)
        self.assertTrue(RecordingServer.instances[0].started)
        self.assertTrue(RecordingServer.instances[0].closed)


if __name__ == "__main__":
    unittest.main()
