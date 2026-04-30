import pathlib
import sys
import unittest
from concurrent.futures import Future
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, call, patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from src.deletion_log import DeletionLog
from src.maintainer import CPACodexKeeper
from src.openai_client import parse_usage_info
from src.settings import Settings
from src.status_snapshot import RESULT_FAILURE, RESULT_PARTIAL, RESULT_SUCCESS


class MaintainerTests(unittest.TestCase):
    def setUp(self):
        self.settings = Settings(
            cpa_endpoint="https://example.com",
            cpa_token="secret",
            quota_threshold=100,
            expiry_threshold_days=3,
        )
        self.maintainer = CPACodexKeeper(settings=self.settings, dry_run=True)

    def test_filter_tokens_keeps_only_codex_type(self):
        tokens = [
            {"name": "a", "type": "codex"},
            {"name": "b", "type": "oauth"},
            {"name": "c", "type": "codex"},
            {"name": "d"},
        ]
        filtered = self.maintainer.filter_tokens(tokens)
        self.assertEqual([token["name"] for token in filtered], ["a", "c"])

    def test_parse_usage_info_reads_team_primary_and_secondary_windows(self):
        usage = parse_usage_info({
            "plan_type": "team",
            "rate_limit": {
                "primary_window": {
                    "used_percent": 15,
                    "limit_window_seconds": 18000,
                    "reset_at": 1,
                },
                "secondary_window": {
                    "used_percent": 80,
                    "limit_window_seconds": 604800,
                    "reset_at": 2,
                },
            },
            "credits": {"has_credits": False, "balance": None},
        })
        self.assertEqual(usage.plan_type, "team")
        self.assertEqual(usage.primary_used_percent, 15)
        self.assertEqual(usage.secondary_used_percent, 80)
        self.assertEqual(usage.quota_check_percent, 80)
        self.assertEqual(usage.quota_check_label, "week")

    def test_parse_usage_info_falls_back_to_primary_when_secondary_missing(self):
        usage = parse_usage_info({
            "plan_type": "free",
            "rate_limit": {
                "primary_window": {
                    "used_percent": 30,
                    "limit_window_seconds": 604800,
                },
                "secondary_window": None,
            },
        })
        self.assertEqual(usage.secondary_used_percent, None)
        self.assertEqual(usage.quota_check_percent, 30)
        self.assertEqual(usage.quota_check_label, "5h")

    def test_build_account_detail_pins_contract_shape_and_nullability(self):
        account_detail = self.maintainer.build_account_detail(
            "t1",
            {
                "name": "t1",
                "disabled": False,
                "expired": "2099-01-01T00:00:00Z",
            },
            {
                "primary_used_percent": 15,
                "primary_window_seconds": 18000,
                "secondary_used_percent": 80,
                "secondary_window_seconds": 604800,
            },
        )

        self.assertEqual(
            account_detail,
            {
                "id": "t1",
                "name": "t1",
                "disabled": False,
                "expires_at": "2099-01-01T00:00:00Z",
                "quota": {
                    "primary_used_percent": 15,
                    "secondary_used_percent": 80,
                    "active_window_label": "week",
                    "primary_window": {"used_percent": 15, "limit_window_seconds": 18000},
                    "secondary_window": {"used_percent": 80, "limit_window_seconds": 604800},
                },
            },
        )

    def test_build_account_detail_keeps_optional_fields_nullable(self):
        account_detail = self.maintainer.build_account_detail(
            "t2",
            {
                "disabled": True,
                "expired": None,
            },
            {
                "primary_used_percent": 44,
                "primary_window_seconds": 18000,
                "secondary_used_percent": None,
                "secondary_window_seconds": None,
            },
        )

        self.assertEqual(account_detail["id"], "t2")
        self.assertEqual(account_detail["name"], "t2")
        self.assertTrue(account_detail["disabled"])
        self.assertIsNone(account_detail["expires_at"])
        self.assertEqual(account_detail["quota"]["primary_used_percent"], 44)
        self.assertIsNone(account_detail["quota"]["secondary_used_percent"])
        self.assertEqual(account_detail["quota"]["active_window_label"], "5h")
        self.assertEqual(account_detail["quota"]["primary_window"], {"used_percent": 44, "limit_window_seconds": 18000})
        self.assertIsNone(account_detail["quota"]["secondary_window"])

    def test_list_account_details_sorts_by_name(self):
        self.maintainer._store_account_detail({"id": "b", "name": "Zulu"})
        self.maintainer._store_account_detail({"id": "a", "name": "Alpha"})

        self.assertEqual(self.maintainer.list_account_details(), [{"id": "a", "name": "Alpha"}, {"id": "b", "name": "Zulu"}])

    def test_process_token_deletes_invalid_token_on_401(self):
        self.maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": False,
            "access_token": "token",
            "refresh_token": "rt",
            "account_id": "acc",
            "expired": "2099-01-01T00:00:00Z",
        })
        self.maintainer.check_token_live = Mock(return_value=(401, {"brief": "unauthorized"}))
        result = self.maintainer.process_token({"name": "t1"}, 1, 1)
        self.assertEqual(result, "dead")
        self.assertEqual(self.maintainer.stats.dead, 1)

    def test_process_token_deletes_invalid_token_on_402(self):
        self.maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": False,
            "access_token": "token",
            "account_id": "acc",
            "expired": "2099-01-01T00:00:00Z",
        })
        self.maintainer.check_token_live = Mock(return_value=(402, {"brief": "deactivated_workspace"}))
        result = self.maintainer.process_token({"name": "t402"}, 1, 1)
        self.assertEqual(result, "dead")
        self.assertEqual(self.maintainer.stats.dead, 1)

    def test_process_token_disables_when_weekly_quota_reaches_threshold(self):
        self.maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": False,
            "access_token": "token",
            "refresh_token": "rt",
            "account_id": "acc",
            "expired": "2099-01-01T00:00:00Z",
        })
        self.maintainer.check_token_live = Mock(return_value=(200, {
            "json": {
                "plan_type": "team",
                "rate_limit": {
                    "primary_window": {"used_percent": 10, "limit_window_seconds": 18000},
                    "secondary_window": {"used_percent": 100, "limit_window_seconds": 604800},
                },
                "credits": {"has_credits": False},
            }
        }))
        self.maintainer.set_disabled_status = Mock(return_value=True)
        result = self.maintainer.process_token({"name": "t2"}, 1, 1)
        self.assertEqual(result, "alive")
        self.maintainer.set_disabled_status.assert_called_once()
        args, kwargs = self.maintainer.set_disabled_status.call_args
        self.assertEqual(args, ("t2",))
        self.assertEqual(kwargs["disabled"], True)
        self.assertEqual(self.maintainer.stats.disabled, 1)
        self.assertEqual(self.maintainer.stats.enabled, 1)

    def test_process_token_disables_when_primary_quota_reaches_threshold_even_if_weekly_is_below(self):
        self.maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": False,
            "access_token": "token",
            "refresh_token": "rt",
            "account_id": "acc",
            "expired": "2099-01-01T00:00:00Z",
        })
        self.maintainer.check_token_live = Mock(return_value=(200, {
            "json": {
                "plan_type": "team",
                "rate_limit": {
                    "primary_window": {"used_percent": 100, "limit_window_seconds": 18000},
                    "secondary_window": {"used_percent": 28, "limit_window_seconds": 604800},
                },
                "credits": {"has_credits": False},
            }
        }))
        self.maintainer.set_disabled_status = Mock(return_value=True)

        result = self.maintainer.process_token({"name": "t2-primary"}, 1, 1)

        self.assertEqual(result, "alive")
        self.maintainer.set_disabled_status.assert_called_once()
        args, kwargs = self.maintainer.set_disabled_status.call_args
        self.assertEqual(args, ("t2-primary",))
        self.assertEqual(kwargs["disabled"], True)
        self.assertEqual(self.maintainer.stats.disabled, 1)
        self.assertEqual(self.maintainer.stats.enabled, 1)

    def test_process_token_enables_when_disabled_and_weekly_quota_below_threshold(self):
        self.maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": True,
            "access_token": "token",
            "account_id": "acc",
            "expired": "2099-01-01T00:00:00Z",
        })
        self.maintainer.check_token_live = Mock(return_value=(200, {
            "json": {
                "plan_type": "team",
                "rate_limit": {
                    "primary_window": {"used_percent": 90, "limit_window_seconds": 18000},
                    "secondary_window": {"used_percent": 0, "limit_window_seconds": 604800},
                },
                "credits": {"has_credits": False},
            }
        }))
        self.maintainer.set_disabled_status = Mock(return_value=True)
        result = self.maintainer.process_token({"name": "t3"}, 1, 1)
        self.assertEqual(result, "alive")
        self.maintainer.set_disabled_status.assert_called_once()
        args, kwargs = self.maintainer.set_disabled_status.call_args
        self.assertEqual(args, ("t3",))
        self.assertEqual(kwargs["disabled"], False)
        self.assertEqual(self.maintainer.stats.disabled, 1)
        self.assertEqual(self.maintainer.stats.enabled, 1)

    def test_process_token_keeps_disabled_when_primary_quota_still_reaches_threshold(self):
        self.maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": True,
            "access_token": "token",
            "refresh_token": "rt",
            "account_id": "acc",
            "expired": "2099-01-01T00:00:00Z",
        })
        self.maintainer.check_token_live = Mock(return_value=(200, {
            "json": {
                "plan_type": "team",
                "rate_limit": {
                    "primary_window": {"used_percent": 100, "limit_window_seconds": 18000},
                    "secondary_window": {"used_percent": 95, "limit_window_seconds": 604800},
                },
                "credits": {"has_credits": False},
            }
        }))
        self.maintainer.set_disabled_status = Mock(return_value=True)

        result = self.maintainer.process_token({"name": "t3-still-disabled"}, 1, 1)

        self.assertEqual(result, "alive")
        self.maintainer.set_disabled_status.assert_not_called()
        self.assertEqual(self.maintainer.stats.disabled, 1)
        self.assertEqual(self.maintainer.stats.enabled, 0)

    def test_process_token_refreshes_when_near_expiry(self):
        self.maintainer.settings.enable_refresh = True
        near_expiry = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        self.maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": False,
            "access_token": "token",
            "refresh_token": "rt",
            "account_id": "acc",
            "expired": near_expiry,
        })
        self.maintainer.check_token_live = Mock(return_value=(200, {
            "json": {
                "plan_type": "team",
                "rate_limit": {
                    "primary_window": {"used_percent": 0, "limit_window_seconds": 18000},
                    "secondary_window": {"used_percent": 0, "limit_window_seconds": 604800},
                },
                "credits": {"has_credits": False},
            }
        }))
        self.maintainer.try_refresh = Mock(return_value=(True, {
            "access_token": "new-token",
            "refresh_token": "new-rt",
            "expired": "2099-03-01T00:00:00Z",
        }, "刷新成功"))
        self.maintainer.upload_updated_token = Mock(return_value=True)
        result = self.maintainer.process_token({"name": "t4"}, 1, 1)
        self.assertEqual(result, "alive")
        self.maintainer.upload_updated_token.assert_called_once()
        self.assertEqual(self.maintainer.stats.refreshed, 1)

    def test_process_token_does_not_refresh_when_refresh_disabled(self):
        settings = Settings(
            cpa_endpoint="https://example.com",
            cpa_token="secret",
            quota_threshold=100,
            expiry_threshold_days=3,
            enable_refresh=False,
        )
        maintainer = CPACodexKeeper(settings=settings, dry_run=True)
        near_expiry = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": False,
            "access_token": "token",
            "refresh_token": "rt",
            "account_id": "acc",
            "expired": near_expiry,
        })
        maintainer.check_token_live = Mock(return_value=(200, {
            "json": {
                "plan_type": "team",
                "rate_limit": {
                    "primary_window": {"used_percent": 0, "limit_window_seconds": 18000},
                    "secondary_window": {"used_percent": 0, "limit_window_seconds": 604800},
                },
                "credits": {"has_credits": False},
            }
        }))
        maintainer.try_refresh = Mock(return_value=(True, {
            "access_token": "new-token",
            "refresh_token": "new-rt",
            "expired": "2099-03-01T00:00:00Z",
        }, "刷新成功"))
        maintainer.upload_updated_token = Mock(return_value=True)

        result = maintainer.process_token({"name": "t4-disabled"}, 1, 1)

        self.assertEqual(result, "alive")
        maintainer.try_refresh.assert_not_called()
        maintainer.upload_updated_token.assert_not_called()
        self.assertEqual(maintainer.stats.refreshed, 0)

    def test_process_token_refreshes_when_refresh_enabled(self):
        settings = Settings(
            cpa_endpoint="https://example.com",
            cpa_token="secret",
            quota_threshold=100,
            expiry_threshold_days=3,
            enable_refresh=True,
        )
        maintainer = CPACodexKeeper(settings=settings, dry_run=True)
        near_expiry = (datetime.now(timezone.utc) + timedelta(days=1)).strftime("%Y-%m-%dT%H:%M:%SZ")
        maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": False,
            "access_token": "token",
            "refresh_token": "rt",
            "account_id": "acc",
            "expired": near_expiry,
        })
        maintainer.check_token_live = Mock(return_value=(200, {
            "json": {
                "plan_type": "team",
                "rate_limit": {
                    "primary_window": {"used_percent": 0, "limit_window_seconds": 18000},
                    "secondary_window": {"used_percent": 0, "limit_window_seconds": 604800},
                },
                "credits": {"has_credits": False},
            }
        }))
        maintainer.try_refresh = Mock(return_value=(True, {
            "access_token": "new-token",
            "refresh_token": "new-rt",
            "expired": "2099-03-01T00:00:00Z",
        }, "刷新成功"))
        maintainer.upload_updated_token = Mock(return_value=True)

        result = maintainer.process_token({"name": "t4-enabled"}, 1, 1)

        self.assertEqual(result, "alive")
        maintainer.try_refresh.assert_called_once()
        maintainer.upload_updated_token.assert_called_once()
        self.assertEqual(maintainer.stats.refreshed, 1)

    def test_process_token_deletes_expired_token_without_refresh_token(self):
        self.maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": False,
            "access_token": "token",
            "refresh_token": "",
            "account_id": "acc",
            "expired": "2000-01-01T00:00:00Z",
        })
        self.maintainer.delete_token = Mock(return_value=True)
        self.maintainer.check_token_live = Mock(return_value=(200, {
            "json": {
                "plan_type": "free",
                "rate_limit": {
                    "primary_window": {"used_percent": 0, "limit_window_seconds": 604800},
                    "secondary_window": None,
                },
                "credits": {"has_credits": False},
            }
        }))

        result = self.maintainer.process_token({"name": "t-expired"}, 1, 1)

        self.assertEqual(result, "dead")
        self.assertEqual(self.maintainer.stats.dead, 1)
        self.maintainer.check_token_live.assert_not_called()
        args, kwargs = self.maintainer.delete_token.call_args
        self.assertEqual(args, ("t-expired",))
        self.assertIn("logger", kwargs)

    def test_process_token_deletes_quota_exhausted_token_without_refresh_token(self):
        self.maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": False,
            "access_token": "token",
            "refresh_token": "",
            "account_id": "acc",
            "expired": "2099-01-01T00:00:00Z",
        })
        self.maintainer.check_token_live = Mock(return_value=(200, {
            "json": {
                "plan_type": "free",
                "rate_limit": {
                    "primary_window": {"used_percent": 100, "limit_window_seconds": 604800},
                    "secondary_window": None,
                },
                "credits": {"has_credits": False},
            }
        }))
        self.maintainer.delete_token = Mock(return_value=True)
        self.maintainer.set_disabled_status = Mock(return_value=True)

        result = self.maintainer.process_token({"name": "t-no-rt"}, 1, 1)

        self.assertEqual(result, "dead")
        self.assertEqual(self.maintainer.stats.dead, 1)
        self.maintainer.set_disabled_status.assert_not_called()
        args, kwargs = self.maintainer.delete_token.call_args
        self.assertEqual(args, ("t-no-rt",))
        self.assertIn("logger", kwargs)

    def test_process_token_keeps_non_refreshable_token_when_expiry_is_unknown(self):
        self.maintainer.get_token_detail = Mock(return_value={
            "email": "a@example.com",
            "disabled": False,
            "access_token": "not-a-jwt",
            "refresh_token": "",
            "account_id": "acc",
            "expired": "",
        })
        self.maintainer.check_token_live = Mock(return_value=(200, {
            "json": {
                "plan_type": "free",
                "rate_limit": {
                    "primary_window": {"used_percent": 0, "limit_window_seconds": 604800},
                    "secondary_window": None,
                },
                "credits": {"has_credits": False},
            }
        }))
        self.maintainer.delete_token = Mock(return_value=True)

        result = self.maintainer.process_token({"name": "t-unknown-expiry"}, 1, 1)

        self.assertEqual(result, "alive")
        self.assertEqual(self.maintainer.stats.alive, 1)
        self.maintainer.delete_token.assert_not_called()
        self.maintainer.check_token_live.assert_called_once()

    @patch("src.maintainer.random.shuffle", side_effect=lambda seq: None)
    @patch("src.maintainer.as_completed")
    @patch("src.maintainer.ThreadPoolExecutor")
    def test_run_writes_started_and_finished_snapshots_for_once_mode(self, executor_cls, as_completed_mock, _shuffle_mock):
        tokens = [{"name": "t1"}]
        self.maintainer.get_token_list = Mock(return_value=tokens)
        self.maintainer.log_startup = Mock()
        self.maintainer.snapshot_writer = Mock()
        self.maintainer.snapshot_writer.write_started.return_value = "2026-04-14T12:00:00Z"

        def submit_side_effect(fn, token_info, idx, total):
            future = Future()
            future.set_result(fn(token_info, idx, total))
            return future

        executor = executor_cls.return_value.__enter__.return_value
        executor.submit.side_effect = submit_side_effect
        as_completed_mock.side_effect = lambda items: list(items)

        def process_side_effect(token_info, idx, total):
            self.maintainer.stats.alive += 1
            return "alive"

        self.maintainer.process_token = Mock(side_effect=process_side_effect)

        self.maintainer.run(mode="once")

        self.assertEqual(self.maintainer.snapshot_writer.write_started.call_count, 1)
        self.assertEqual(self.maintainer.snapshot_writer.write_finished.call_count, 1)
        started_args = self.maintainer.snapshot_writer.write_started.call_args.args
        self.assertEqual(started_args[0], "once")
        self.assertEqual(started_args[1], self.settings.interval_seconds)
        finished_args = self.maintainer.snapshot_writer.write_finished.call_args.args
        self.assertEqual(finished_args[0], "once")
        self.assertEqual(finished_args[1], self.settings.interval_seconds)
        self.assertEqual(finished_args[2], RESULT_SUCCESS)
        self.assertIsInstance(finished_args[3], dict)
        self.assertEqual(finished_args[3]["alive"], 1)
        self.assertEqual(finished_args[4], "2026-04-14T12:00:00Z")

    def test_run_writes_finished_snapshot_when_no_tokens_are_found(self):
        self.maintainer.log_startup = Mock()
        self.maintainer.snapshot_writer = Mock()
        self.maintainer.snapshot_writer.write_started.return_value = "2026-04-14T12:00:00Z"
        self.maintainer.get_token_list = Mock(return_value=[])

        self.maintainer.run(mode="once")

        self.maintainer.snapshot_writer.write_started.assert_called_once_with("once", self.settings.interval_seconds)
        self.maintainer.snapshot_writer.write_finished.assert_called_once_with(
            "once",
            self.settings.interval_seconds,
            RESULT_SUCCESS,
            self.maintainer.stats.as_dict(),
            "2026-04-14T12:00:00Z",
        )

    @patch("src.maintainer.random.shuffle", side_effect=lambda seq: None)
    @patch("src.maintainer.as_completed")
    @patch("src.maintainer.ThreadPoolExecutor")
    def test_run_writes_partial_snapshot_when_network_errors_exist(self, executor_cls, as_completed_mock, _shuffle_mock):
        tokens = [{"name": "t1"}]
        self.maintainer.get_token_list = Mock(return_value=tokens)
        self.maintainer.log_startup = Mock()
        self.maintainer.snapshot_writer = Mock()

        def submit_side_effect(fn, token_info, idx, total):
            future = Future()
            future.set_result(fn(token_info, idx, total))
            return future

        executor = executor_cls.return_value.__enter__.return_value
        executor.submit.side_effect = submit_side_effect
        as_completed_mock.side_effect = lambda items: list(items)

        def process_side_effect(token_info, idx, total):
            self.maintainer.stats.network_error += 1
            return "network_error"

        self.maintainer.process_token = Mock(side_effect=process_side_effect)

        self.maintainer.run(mode="daemon")

        finished_args = self.maintainer.snapshot_writer.write_finished.call_args.args
        self.assertEqual(finished_args[0], "daemon")
        self.assertEqual(finished_args[2], RESULT_PARTIAL)
        self.assertEqual(finished_args[3]["network_error"], 1)

    @patch("src.maintainer.random.shuffle", side_effect=lambda seq: None)
    @patch("src.maintainer.as_completed")
    @patch("src.maintainer.ThreadPoolExecutor")
    def test_run_writes_partial_snapshot_when_worker_future_raises(self, executor_cls, as_completed_mock, _shuffle_mock):
        tokens = [{"name": "ok"}, {"name": "boom"}]
        self.maintainer.get_token_list = Mock(return_value=tokens)
        self.maintainer.log_startup = Mock()
        self.maintainer.snapshot_writer = Mock()
        self.maintainer.snapshot_writer.write_started.return_value = "2026-04-14T12:00:00Z"

        def submit_side_effect(fn, token_info, idx, total):
            future = Future()
            try:
                future.set_result(fn(token_info, idx, total))
            except Exception as exc:
                future.set_exception(exc)
            return future

        executor = executor_cls.return_value.__enter__.return_value
        executor.submit.side_effect = submit_side_effect
        as_completed_mock.side_effect = lambda items: list(items)

        def process_side_effect(token_info, idx, total):
            if token_info["name"] == "boom":
                raise RuntimeError("unexpected boom")
            self.maintainer.stats.alive += 1
            return "alive"

        self.maintainer.process_token = Mock(side_effect=process_side_effect)

        self.maintainer.run(mode="once")

        finished_args = self.maintainer.snapshot_writer.write_finished.call_args.args
        self.assertEqual(finished_args[0], "once")
        self.assertEqual(finished_args[2], RESULT_PARTIAL)
        self.assertEqual(finished_args[3]["alive"], 1)

    def test_run_writes_failure_snapshot_when_listing_tokens_raises(self):
        self.maintainer.log_startup = Mock()
        self.maintainer.snapshot_writer = Mock()
        self.maintainer.get_token_list = Mock(side_effect=RuntimeError("list failed"))

        with self.assertRaisesRegex(RuntimeError, "list failed"):
            self.maintainer.run(mode="once")

        self.maintainer.snapshot_writer.write_started.assert_called_once_with("once", self.settings.interval_seconds)
        self.maintainer.snapshot_writer.write_finished.assert_called_once()
        finished_args = self.maintainer.snapshot_writer.write_finished.call_args.args
        self.assertEqual(finished_args[0], "once")
        self.assertEqual(finished_args[2], RESULT_FAILURE)
        self.assertEqual(finished_args[3], self.maintainer.stats.as_dict())
        self.assertIsNotNone(finished_args[4])

    @patch.object(CPACodexKeeper, "run")
    def test_run_forever_uses_daemon_mode(self, run_mock):
        run_mock.side_effect = KeyboardInterrupt()

        with self.assertRaises(KeyboardInterrupt):
            self.maintainer.run_forever(interval_seconds=123)

        run_mock.assert_called_once_with(mode="daemon")

    @patch("src.maintainer.random.shuffle", side_effect=lambda seq: None)
    @patch("src.maintainer.as_completed")
    @patch("src.maintainer.ThreadPoolExecutor")
    def test_run_uses_configured_worker_threads_and_processes_all_tokens(self, executor_cls, as_completed_mock, _shuffle_mock):
        tokens = [{"name": "t1"}, {"name": "t2"}, {"name": "t3"}]
        self.maintainer.settings.worker_threads = 6
        self.maintainer.get_token_list = Mock(return_value=tokens)
        self.maintainer.log_startup = Mock()

        futures = []

        def submit_side_effect(fn, token_info, idx, total):
            future = Future()
            future.set_result(fn(token_info, idx, total))
            futures.append(future)
            return future

        executor = executor_cls.return_value.__enter__.return_value
        executor.submit.side_effect = submit_side_effect
        as_completed_mock.side_effect = lambda items: list(items)
        self.maintainer.process_token = Mock(side_effect=["alive", "alive", "alive"])

        self.maintainer.run()

        executor_cls.assert_called_once_with(max_workers=6)
        self.assertEqual(executor.submit.call_count, 3)
        self.maintainer.process_token.assert_any_call({"name": "t1"}, 1, 3)
        self.maintainer.process_token.assert_any_call({"name": "t2"}, 2, 3)
        self.maintainer.process_token.assert_any_call({"name": "t3"}, 3, 3)

    @patch("src.maintainer.random.shuffle", side_effect=lambda seq: None)
    @patch("src.maintainer.as_completed")
    @patch("src.maintainer.ThreadPoolExecutor")
    def test_run_logs_task_exception_and_continues(self, executor_cls, as_completed_mock, _shuffle_mock):
        tokens = [{"name": "ok-1"}, {"name": "boom"}, {"name": "ok-2"}]
        self.maintainer.get_token_list = Mock(return_value=tokens)
        self.maintainer.log_startup = Mock()
        self.maintainer.log = Mock()

        futures = []

        def submit_side_effect(fn, token_info, idx, total):
            future = Future()
            try:
                future.set_result(fn(token_info, idx, total))
            except Exception as exc:
                future.set_exception(exc)
            futures.append(future)
            return future

        executor = executor_cls.return_value.__enter__.return_value
        executor.submit.side_effect = submit_side_effect
        as_completed_mock.side_effect = lambda items: list(items)

        def process_side_effect(token_info, idx, total):
            if token_info["name"] == "boom":
                raise RuntimeError("unexpected boom")
            self.maintainer.stats.alive += 1
            return "alive"

        self.maintainer.process_token = Mock(side_effect=process_side_effect)

        self.maintainer.run()

        self.assertEqual(self.maintainer.process_token.call_count, 3)
        self.assertEqual(self.maintainer.stats.alive, 2)
        self.maintainer.log.assert_any_call("ERROR", "Token 任务异常 (boom): unexpected boom", indent=1)

    @patch("src.maintainer.random.shuffle", side_effect=lambda seq: None)
    @patch("src.maintainer.as_completed")
    @patch("src.maintainer.ThreadPoolExecutor")
    def test_run_preserves_total_stat_with_threaded_execution(self, executor_cls, as_completed_mock, _shuffle_mock):
        tokens = [{"name": "t1"}, {"name": "t2"}]
        self.maintainer.get_token_list = Mock(return_value=tokens)
        self.maintainer.log_startup = Mock()

        def submit_side_effect(fn, token_info, idx, total):
            future = Future()
            future.set_result(fn(token_info, idx, total))
            return future

        executor = executor_cls.return_value.__enter__.return_value
        executor.submit.side_effect = submit_side_effect
        as_completed_mock.side_effect = lambda items: list(items)

        def process_side_effect(token_info, idx, total):
            if token_info["name"] == "t1":
                self.maintainer.stats.alive += 1
            else:
                self.maintainer.stats.skipped += 1
            return token_info["name"]

        self.maintainer.process_token = Mock(side_effect=process_side_effect)

        self.maintainer.run()

        self.assertEqual(self.maintainer.stats.total, 2)
        self.assertEqual(self.maintainer.stats.alive, 1)
        self.assertEqual(self.maintainer.stats.skipped, 1)

    @patch("src.maintainer.random.shuffle", side_effect=lambda seq: None)
    @patch("src.maintainer.as_completed")
    @patch("src.maintainer.ThreadPoolExecutor")
    def test_run_logs_configured_worker_threads(self, executor_cls, as_completed_mock, _shuffle_mock):
        tokens = [{"name": "t1"}]
        self.maintainer.settings.worker_threads = 5
        self.maintainer.get_token_list = Mock(return_value=tokens)
        self.maintainer.log_startup = Mock()
        self.maintainer.log = Mock()

        def submit_side_effect(fn, token_info, idx, total):
            future = Future()
            future.set_result(fn(token_info, idx, total))
            return future

        executor = executor_cls.return_value.__enter__.return_value
        executor.submit.side_effect = submit_side_effect
        as_completed_mock.side_effect = lambda items: list(items)
        self.maintainer.process_token = Mock(return_value="alive")

        self.maintainer.run()

        self.maintainer.log.assert_any_call("INFO", "线程数: 5")


class DeletionLoggingTests(unittest.TestCase):
    def setUp(self):
        import tempfile

        self.settings = Settings(
            cpa_endpoint="https://example.com",
            cpa_token="secret",
            quota_threshold=100,
            expiry_threshold_days=3,
        )
        self.tempdir = tempfile.TemporaryDirectory()
        self.log_path = pathlib.Path(self.tempdir.name) / "deleted.jsonl"
        self.deletion_log = DeletionLog(self.log_path)
        self.maintainer = CPACodexKeeper(
            settings=self.settings,
            dry_run=False,
            deletion_log=self.deletion_log,
        )
        self.maintainer.delete_token = Mock(return_value=True)

    def tearDown(self):
        self.tempdir.cleanup()

    def _logger(self):
        return Mock()

    def test_successful_delete_appends_record(self):
        token_detail = {
            "email": "a@example.com",
            "account_id": "acc-1",
            "expired": "2099-01-01T00:00:00Z",
            "disabled": True,
        }
        result = self.maintainer._delete_token_with_reason(
            "t1",
            "无效",
            self._logger(),
            token_detail=token_detail,
        )

        self.assertEqual(result, "dead")
        records = self.deletion_log.list()
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["name"], "t1")
        self.assertEqual(records[0]["email"], "a@example.com")
        self.assertEqual(records[0]["account_id"], "acc-1")
        self.assertEqual(records[0]["expires_at"], "2099-01-01T00:00:00Z")
        self.assertTrue(records[0]["disabled"])
        self.assertEqual(records[0]["reason"], "无效")

    def test_failed_delete_does_not_append_record(self):
        self.maintainer.delete_token = Mock(return_value=False)
        result = self.maintainer._delete_token_with_reason("t1", "无效", self._logger(), token_detail={})

        self.assertEqual(result, "skipped")
        self.assertEqual(self.deletion_log.list(), [])

    def test_dry_run_skips_persistence(self):
        keeper = CPACodexKeeper(
            settings=self.settings,
            dry_run=True,
            deletion_log=self.deletion_log,
        )
        result = keeper._delete_token_with_reason(
            "t1",
            "无效",
            self._logger(),
            token_detail={"email": "a@example.com"},
        )
        self.assertEqual(result, "dead")
        self.assertEqual(self.deletion_log.list(), [])

    def test_list_deleted_accounts_returns_log_entries(self):
        self.deletion_log.record(name="t1", reason="r1", deleted_at="2025-01-01T00:00:00Z")
        self.deletion_log.record(name="t2", reason="r2", deleted_at="2024-01-01T00:00:00Z")

        records = self.maintainer.list_deleted_accounts()

        self.assertEqual([r["name"] for r in records], ["t1", "t2"])
