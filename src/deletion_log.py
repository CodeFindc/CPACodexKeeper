import json
import threading
from pathlib import Path
from typing import Any

from .status_snapshot import to_iso8601, utc_now


class DeletionLog:
    """Append-only JSONL store for accounts that have been deleted by the keeper.

    Each line is a JSON object with at least the following keys:
        deleted_at, name, email, account_id, expires_at, disabled, reason
    """

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self._lock = threading.Lock()

    def record(
        self,
        *,
        name: str,
        reason: str,
        token_detail: dict[str, Any] | None = None,
        deleted_at: str | None = None,
    ) -> dict[str, Any]:
        detail = token_detail or {}
        entry: dict[str, Any] = {
            "deleted_at": deleted_at or to_iso8601(utc_now()),
            "name": name,
            "email": detail.get("email"),
            "account_id": detail.get("account_id"),
            "expires_at": detail.get("expired"),
            "disabled": bool(detail.get("disabled", False)),
            "reason": reason,
        }
        line = json.dumps(entry, ensure_ascii=False)
        with self._lock:
            self.path.parent.mkdir(parents=True, exist_ok=True)
            with self.path.open("a", encoding="utf-8") as handle:
                handle.write(line + "\n")
        return entry

    def list(self, *, limit: int | None = None) -> list[dict[str, Any]]:
        """Return deletion records sorted by deleted_at descending (newest first)."""
        with self._lock:
            if not self.path.exists():
                return []
            raw_lines = self.path.read_text(encoding="utf-8").splitlines()

        records: list[dict[str, Any]] = []
        for raw in raw_lines:
            line = raw.strip()
            if not line:
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError:
                continue
            if isinstance(value, dict):
                records.append(value)

        records.sort(key=lambda item: item.get("deleted_at") or "", reverse=True)
        if limit is not None and limit >= 0:
            records = records[:limit]
        return records
