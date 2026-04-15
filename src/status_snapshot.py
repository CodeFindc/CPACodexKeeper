import json
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path

MODE_UNKNOWN = "unknown"
MODE_ONCE = "once"
MODE_DAEMON = "daemon"

RESULT_SUCCESS = "success"
RESULT_PARTIAL = "partial"
RESULT_FAILURE = "failure"

STATE_NEVER_RUN = "never-run"
STATE_ONCE_COMPLETE = "once-complete"
STATE_DAEMON_ACTIVE = "daemon-active"
STATE_STALE = "stale"
STATE_SNAPSHOT_ERROR = "snapshot-error"

ERROR_INVALID_SNAPSHOT = "invalid_snapshot"

SUMMARY_FIELDS = (
    "total",
    "alive",
    "dead",
    "disabled",
    "enabled",
    "refreshed",
    "skipped",
    "network_error",
)


@dataclass(slots=True)
class SnapshotPayload:
    mode: str
    started_at: str
    finished_at: str | None
    updated_at: str
    interval_seconds: int
    result: str
    summary: dict[str, int]


@dataclass(slots=True)
class ResolvedStatus:
    state: str
    mode: str
    result: str
    summary: dict[str, int] | None
    started_at: str | None = None
    finished_at: str | None = None
    updated_at: str | None = None
    interval_seconds: int | None = None
    code: str | None = None
    message: str | None = None


class SnapshotValidationError(ValueError):
    pass


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def to_iso8601(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    else:
        value = value.astimezone(timezone.utc)
    return value.isoformat().replace("+00:00", "Z")


def parse_iso8601(value: str, field_name: str = "timestamp") -> datetime:
    if not isinstance(value, str) or not value:
        raise SnapshotValidationError(f"field {field_name} must be a non-empty ISO8601 string")
    normalized = value[:-1] + "+00:00" if value.endswith("Z") else value
    try:
        parsed = datetime.fromisoformat(normalized)
    except ValueError as exc:
        raise SnapshotValidationError(f"field {field_name} must be a valid ISO8601 timestamp") from exc
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


class SnapshotWriter:
    def __init__(self, path: str | Path):
        self.store = SnapshotStore(path)

    def write_started(self, mode: str, interval_seconds: int, started_at: datetime | None = None) -> str:
        started_time = utc_now() if started_at is None else self._normalize_time(started_at)
        timestamp = to_iso8601(started_time)
        self.store.write_raw_json(
            {
                "mode": mode,
                "started_at": timestamp,
                "finished_at": None,
                "updated_at": timestamp,
                "interval_seconds": interval_seconds,
                "result": RESULT_FAILURE,
                "summary": self._blank_summary(),
            }
        )
        return timestamp

    def write_finished(
        self,
        mode: str,
        interval_seconds: int,
        result: str,
        summary: dict[str, int],
        started_at: str | datetime | None = None,
        finished_at: datetime | None = None,
    ) -> None:
        finished_time = utc_now() if finished_at is None else self._normalize_time(finished_at)
        finished_timestamp = to_iso8601(finished_time)
        started_timestamp = self._resolve_started_at(started_at, finished_timestamp)
        self.store.write_snapshot(
            SnapshotPayload(
                mode=mode,
                started_at=started_timestamp,
                finished_at=finished_timestamp,
                updated_at=finished_timestamp,
                interval_seconds=interval_seconds,
                result=result,
                summary=self._coerce_summary(summary),
            )
        )

    def _resolve_started_at(self, started_at: str | datetime | None, fallback: str) -> str:
        if started_at is None:
            return fallback
        if isinstance(started_at, datetime):
            return to_iso8601(self._normalize_time(started_at))
        parse_iso8601(started_at, "started_at")
        return started_at

    def _coerce_summary(self, summary: dict[str, int]) -> dict[str, int]:
        return {field_name: int(summary.get(field_name, 0)) for field_name in SUMMARY_FIELDS}

    def _blank_summary(self) -> dict[str, int]:
        return {field_name: 0 for field_name in SUMMARY_FIELDS}

    def _normalize_time(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)


class SnapshotStore:
    def __init__(self, path: str | Path):
        self.path = Path(path)

    def write_raw_json(self, payload: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(payload, ensure_ascii=True, indent=2), encoding="utf-8")

    def write_snapshot(self, snapshot: SnapshotPayload) -> None:
        self.write_raw_json(asdict(snapshot))

    def resolve(self, now: datetime | None = None) -> ResolvedStatus:
        if not self.path.exists():
            return ResolvedStatus(
                state=STATE_NEVER_RUN,
                mode=MODE_UNKNOWN,
                result=RESULT_FAILURE,
                summary=None,
            )

        try:
            payload = json.loads(self.path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            return ResolvedStatus(
                state=STATE_SNAPSHOT_ERROR,
                mode=MODE_UNKNOWN,
                result=RESULT_FAILURE,
                summary=None,
                code=ERROR_INVALID_SNAPSHOT,
                message=f"invalid JSON: {exc.msg}",
            )

        try:
            snapshot = self._validate_payload(payload)
        except SnapshotValidationError as exc:
            return ResolvedStatus(
                state=STATE_SNAPSHOT_ERROR,
                mode=MODE_UNKNOWN,
                result=RESULT_FAILURE,
                summary=None,
                code=ERROR_INVALID_SNAPSHOT,
                message=str(exc),
            )

        current_time = utc_now() if now is None else self._normalize_now(now)
        updated_at = parse_iso8601(snapshot.updated_at, "updated_at")
        state = self._derive_state(snapshot, current_time, updated_at)
        return ResolvedStatus(
            state=state,
            mode=snapshot.mode,
            result=snapshot.result,
            summary=dict(snapshot.summary),
            started_at=snapshot.started_at,
            finished_at=snapshot.finished_at,
            updated_at=snapshot.updated_at,
            interval_seconds=snapshot.interval_seconds,
        )

    def _derive_state(
        self,
        snapshot: SnapshotPayload,
        now: datetime,
        updated_at: datetime,
    ) -> str:
        if snapshot.mode == MODE_ONCE and snapshot.finished_at is not None:
            return STATE_ONCE_COMPLETE
        if snapshot.mode == MODE_ONCE and snapshot.finished_at is None:
            return STATE_DAEMON_ACTIVE
        if (now - updated_at).total_seconds() > snapshot.interval_seconds * 2:
            return STATE_STALE
        return STATE_DAEMON_ACTIVE

    def _validate_payload(self, payload: object) -> SnapshotPayload:
        if not isinstance(payload, dict):
            raise SnapshotValidationError("snapshot payload must be a JSON object")

        mode = self._require_enum(payload, "mode", {MODE_ONCE, MODE_DAEMON, MODE_UNKNOWN})
        result = self._require_enum(payload, "result", {RESULT_SUCCESS, RESULT_PARTIAL, RESULT_FAILURE})
        started_at = self._require_timestamp(payload, "started_at")
        finished_at = self._require_optional_timestamp(payload, "finished_at")
        updated_at = self._require_timestamp(payload, "updated_at")
        interval_seconds = self._require_int(payload, "interval_seconds")
        if interval_seconds <= 0:
            raise SnapshotValidationError("field interval_seconds must be greater than 0")
        summary = self._require_summary(payload)
        return SnapshotPayload(
            mode=mode,
            started_at=started_at,
            finished_at=finished_at,
            updated_at=updated_at,
            interval_seconds=interval_seconds,
            result=result,
            summary=summary,
        )

    def _require_timestamp(self, payload: dict, field_name: str) -> str:
        value = self._require_string(payload, field_name)
        parse_iso8601(value, field_name)
        return value

    def _require_optional_timestamp(self, payload: dict, field_name: str) -> str | None:
        if field_name not in payload:
            raise SnapshotValidationError(f"missing required field: {field_name}")
        value = payload[field_name]
        if value is None:
            return None
        if not isinstance(value, str) or not value:
            raise SnapshotValidationError(f"field {field_name} must be null or a non-empty string")
        parse_iso8601(value, field_name)
        return value

    def _require_summary(self, payload: dict) -> dict[str, int]:
        summary = payload.get("summary")
        if summary is None:
            raise SnapshotValidationError("missing required field: summary")
        if not isinstance(summary, dict):
            raise SnapshotValidationError("field summary must be an object")

        validated: dict[str, int] = {}
        for field_name in SUMMARY_FIELDS:
            key = f"summary.{field_name}"
            if field_name not in summary:
                raise SnapshotValidationError(f"missing required field: {key}")
            value = summary[field_name]
            if not isinstance(value, int) or isinstance(value, bool):
                raise SnapshotValidationError(f"field {key} must be an integer")
            validated[field_name] = value
        return validated

    def _require_enum(self, payload: dict, field_name: str, allowed: set[str]) -> str:
        value = self._require_string(payload, field_name)
        if value not in allowed:
            allowed_values = ", ".join(sorted(allowed))
            raise SnapshotValidationError(
                f"field {field_name} must be one of: {allowed_values}"
            )
        return value

    def _require_string(self, payload: dict, field_name: str) -> str:
        if field_name not in payload:
            raise SnapshotValidationError(f"missing required field: {field_name}")
        value = payload[field_name]
        if not isinstance(value, str) or not value:
            raise SnapshotValidationError(f"field {field_name} must be a non-empty string")
        return value

    def _require_int(self, payload: dict, field_name: str) -> int:
        if field_name not in payload:
            raise SnapshotValidationError(f"missing required field: {field_name}")
        value = payload[field_name]
        if not isinstance(value, int) or isinstance(value, bool):
            raise SnapshotValidationError(f"field {field_name} must be an integer")
        return value

    def _normalize_now(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc)
