import pathlib
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from src.cli import build_arg_parser, main
from src.settings import Settings, SettingsError


class CLITests(unittest.TestCase):
    def test_defaults_to_daemon_mode(self):
        parser = build_arg_parser()
        args = parser.parse_args([])

        self.assertTrue(args.daemon)
        self.assertEqual(args.command, "run")

    def test_parser_accepts_status_server_command(self):
        parser = build_arg_parser()
        args = parser.parse_args(["status-server"])

        self.assertEqual(args.command, "status-server")

    def test_parser_accepts_combined_command(self):
        parser = build_arg_parser()
        args = parser.parse_args(["combined"])

        self.assertEqual(args.command, "combined")
        self.assertTrue(args.daemon)

    def test_parser_combined_respects_once_flag(self):
        parser = build_arg_parser()
        args = parser.parse_args(["--once", "combined"])

        self.assertEqual(args.command, "combined")
        self.assertFalse(args.daemon)

    def test_once_disables_daemon_mode(self):
        parser = build_arg_parser()
        args = parser.parse_args(["--once"])

        self.assertFalse(args.daemon)
        self.assertEqual(args.command, "run")

    @patch("src.cli.load_settings")
    @patch("src.cli.CPACodexKeeper")
    @patch("src.cli.run_combined")
    @patch("sys.argv", ["prog", "--once"])
    def test_main_runs_once(self, run_combined_mock, keeper_cls, load_settings_mock):
        load_settings_mock.return_value = Settings(
            cpa_endpoint="https://example.com",
            cpa_token="secret",
        )
        keeper = keeper_cls.return_value

        exit_code = main()

        self.assertEqual(exit_code, 0)
        load_settings_mock.assert_called_once()
        run_combined_mock.assert_not_called()
        keeper.run.assert_called_once()
        keeper.run_forever.assert_not_called()

    @patch("src.cli.load_settings")
    @patch("src.cli.CPACodexKeeper")
    @patch("src.cli.run_combined")
    @patch("sys.argv", ["prog"])
    def test_main_runs_daemon_by_default(self, run_combined_mock, keeper_cls, load_settings_mock):
        load_settings_mock.return_value = Settings(
            cpa_endpoint="https://example.com",
            cpa_token="secret",
            interval_seconds=321,
        )
        keeper = keeper_cls.return_value

        exit_code = main()

        self.assertEqual(exit_code, 0)
        load_settings_mock.assert_called_once()
        run_combined_mock.assert_not_called()
        keeper.run.assert_not_called()
        keeper.run_forever.assert_called_once_with(interval_seconds=321)

    @patch("src.cli.StatusServer")
    def test_serve_status_passes_static_dir_to_status_server(self, server_cls):
        settings = Settings(
            status_host="127.0.0.1",
            status_port=8080,
            status_snapshot_path=pathlib.Path("/tmp/status.json"),
            status_static_dir=pathlib.Path("/tmp/frontend-dist"),
        )
        server = server_cls.return_value
        server.address = ("127.0.0.1", 8080)

        from src.cli import serve_status

        serve_status(settings)

        server_cls.assert_called_once_with(
            "127.0.0.1",
            8080,
            pathlib.Path("/tmp/status.json"),
            pathlib.Path("/tmp/frontend-dist"),
        )
        server.start.assert_called_once()
        server.wait.assert_called_once()
        server.close.assert_called_once()

    @patch("src.cli.load_status_settings")
    @patch("src.cli.load_settings")
    @patch("src.cli.serve_status")
    @patch("src.cli.run_combined")
    @patch("sys.argv", ["prog", "status-server"])
    def test_main_dispatches_status_server(self, run_combined_mock, serve_status_mock, load_settings_mock, load_status_settings_mock):
        settings = Settings(status_host="127.0.0.1", status_port=8080)
        load_status_settings_mock.return_value = settings

        exit_code = main()

        self.assertEqual(exit_code, 0)
        load_status_settings_mock.assert_called_once()
        load_settings_mock.assert_not_called()
        run_combined_mock.assert_not_called()
        serve_status_mock.assert_called_once_with(settings)

    @patch("src.cli.load_settings")
    @patch("src.cli.CPACodexKeeper")
    @patch("src.cli.run_combined")
    @patch("sys.argv", ["prog", "--dry-run", "combined"])
    def test_main_dispatches_combined_command_in_daemon_mode(self, run_combined_mock, keeper_cls, load_settings_mock):
        settings = Settings(
            cpa_endpoint="https://example.com",
            cpa_token="secret",
        )
        load_settings_mock.return_value = settings

        exit_code = main()

        self.assertEqual(exit_code, 0)
        load_settings_mock.assert_called_once()
        run_combined_mock.assert_called_once_with(settings, dry_run=True, daemon=True)
        keeper_cls.assert_not_called()

    @patch("src.cli.load_settings")
    @patch("src.cli.CPACodexKeeper")
    @patch("src.cli.run_combined")
    @patch("sys.argv", ["prog", "--once", "combined"])
    def test_main_dispatches_combined_command_in_once_mode(self, run_combined_mock, keeper_cls, load_settings_mock):
        settings = Settings(
            cpa_endpoint="https://example.com",
            cpa_token="secret",
        )
        load_settings_mock.return_value = settings

        exit_code = main()

        self.assertEqual(exit_code, 0)
        load_settings_mock.assert_called_once()
        run_combined_mock.assert_called_once_with(settings, dry_run=False, daemon=False)
        keeper_cls.assert_not_called()

    @patch("src.cli.load_settings", side_effect=SettingsError("bad config"))
    @patch("sys.argv", ["prog", "combined"])
    def test_main_exits_with_status_2_for_combined_settings_error(self, load_settings_mock):
        with self.assertRaises(SystemExit) as ctx:
            main()

        self.assertEqual(ctx.exception.code, 2)
        load_settings_mock.assert_called_once()

    @patch("src.cli.load_status_settings", side_effect=SettingsError("bad config"))
    @patch("sys.argv", ["prog", "status-server"])
    def test_main_exits_with_status_2_for_status_server_settings_error(self, load_status_settings_mock):
        with self.assertRaises(SystemExit) as ctx:
            main()

        self.assertEqual(ctx.exception.code, 2)
        load_status_settings_mock.assert_called_once()

    @patch("src.cli.load_settings", side_effect=SettingsError("bad config"))
    @patch("sys.argv", ["prog"])
    def test_main_exits_with_status_2_for_default_run_settings_error(self, load_settings_mock):
        with self.assertRaises(SystemExit) as ctx:
            main()

        self.assertEqual(ctx.exception.code, 2)
        load_settings_mock.assert_called_once()

    @patch("src.cli.load_settings")
    @patch("src.cli.run_combined", side_effect=RuntimeError("startup failed"))
    @patch("sys.argv", ["prog", "combined"])
    def test_main_propagates_combined_runtime_startup_failure(self, run_combined_mock, load_settings_mock):
        settings = Settings(
            cpa_endpoint="https://example.com",
            cpa_token="secret",
        )
        load_settings_mock.return_value = settings

        with self.assertRaisesRegex(RuntimeError, "startup failed"):
            main()

        run_combined_mock.assert_called_once_with(settings, dry_run=False, daemon=True)


if __name__ == "__main__":
    unittest.main()
