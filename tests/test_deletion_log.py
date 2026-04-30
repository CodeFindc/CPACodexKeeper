import json
import pathlib
import sys
import tempfile
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))

from src.deletion_log import DeletionLog


class DeletionLogTests(unittest.TestCase):
    def setUp(self):
        self.tempdir = tempfile.TemporaryDirectory()
        self.path = pathlib.Path(self.tempdir.name) / "nested" / "deleted.jsonl"
        self.log = DeletionLog(self.path)

    def tearDown(self):
        self.tempdir.cleanup()

    def test_record_creates_parent_dirs_and_appends_jsonl(self):
        entry = self.log.record(
            name="t1",
            reason="invalid",
            token_detail={
                "email": "a@example.com",
                "account_id": "acc-1",
                "expired": "2099-01-01T00:00:00Z",
                "disabled": True,
            },
        )

        self.assertTrue(self.path.exists())
        self.assertEqual(entry["name"], "t1")
        self.assertEqual(entry["email"], "a@example.com")
        self.assertEqual(entry["account_id"], "acc-1")
        self.assertEqual(entry["expires_at"], "2099-01-01T00:00:00Z")
        self.assertTrue(entry["disabled"])
        self.assertEqual(entry["reason"], "invalid")
        self.assertTrue(entry["deleted_at"].endswith("Z"))

        lines = self.path.read_text(encoding="utf-8").splitlines()
        self.assertEqual(len(lines), 1)
        self.assertEqual(json.loads(lines[0]), entry)

    def test_record_handles_missing_token_detail_fields(self):
        entry = self.log.record(name="t2", reason="expired")
        self.assertIsNone(entry["email"])
        self.assertIsNone(entry["account_id"])
        self.assertIsNone(entry["expires_at"])
        self.assertFalse(entry["disabled"])

    def test_list_returns_records_newest_first(self):
        self.log.record(name="old", reason="r1", deleted_at="2024-01-01T00:00:00Z")
        self.log.record(name="new", reason="r2", deleted_at="2025-01-01T00:00:00Z")
        self.log.record(name="mid", reason="r3", deleted_at="2024-06-01T00:00:00Z")

        records = self.log.list()
        self.assertEqual([r["name"] for r in records], ["new", "mid", "old"])

    def test_list_respects_limit(self):
        for i in range(5):
            self.log.record(name=f"t{i}", reason="r", deleted_at=f"2024-01-0{i + 1}T00:00:00Z")

        self.assertEqual(len(self.log.list(limit=2)), 2)
        self.assertEqual(self.log.list(limit=0), [])

    def test_list_returns_empty_when_file_missing(self):
        self.assertEqual(self.log.list(), [])

    def test_list_skips_blank_and_invalid_lines(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(
            "\n".join(
                [
                    "",
                    "not-json",
                    json.dumps({"name": "ok", "deleted_at": "2024-01-01T00:00:00Z", "reason": "x"}),
                    "[]",
                ]
            )
            + "\n",
            encoding="utf-8",
        )
        records = self.log.list()
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["name"], "ok")


if __name__ == "__main__":
    unittest.main()
