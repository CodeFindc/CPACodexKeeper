import json
import mimetypes
import threading
from collections.abc import Callable
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    from .status_snapshot import SnapshotStore, render_status_html
except ImportError:
    from status_snapshot import SnapshotStore, render_status_html


class StatusServer:
    def __init__(
        self,
        host: str,
        port: int,
        snapshot_path: str | Path,
        static_dir: str | Path | None = None,
        account_details_provider: Callable[[], list[dict]] | None = None,
    ):
        self._store = SnapshotStore(snapshot_path)
        self._static_dir = Path(static_dir) if static_dir is not None else None
        self._account_details_provider = account_details_provider or (lambda: [])
        self._server = ThreadingHTTPServer((host, port), self._build_handler())
        self._thread = threading.Thread(target=self._server.serve_forever, name="status-server", daemon=True)
        self._stopped = threading.Event()

    @property
    def address(self) -> tuple[str, int]:
        host, port = self._server.server_address[:2]
        return str(host), int(port)

    def start(self) -> None:
        if not self._thread.is_alive():
            self._thread.start()

    def wait(self) -> None:
        self._stopped.wait()

    def close(self) -> None:
        self._server.shutdown()
        self._server.server_close()
        if self._thread.is_alive():
            self._thread.join(timeout=5)
        self._stopped.set()

    def _build_handler(self):
        store = self._store
        static_dir = self._static_dir
        account_details_provider = self._account_details_provider

        class StatusHandler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:
                resolved = store.resolve()
                if self.path == "/api/status.json":
                    body = json.dumps(resolved.to_dict(), ensure_ascii=True, indent=2).encode("utf-8")
                    self._write_response(resolved.http_status(), "application/json; charset=utf-8", body)
                    return
                if self.path == "/api/accounts.json":
                    body = json.dumps({"accounts": account_details_provider()}, ensure_ascii=True, indent=2).encode("utf-8")
                    self._write_response(200, "application/json; charset=utf-8", body)
                    return
                if self.path == "/status":
                    if static_dir is not None:
                        index_path = static_dir / "index.html"
                        if index_path.exists():
                            self._write_file_response(index_path, "text/html; charset=utf-8")
                            return
                    body = render_status_html(resolved).encode("utf-8")
                    self._write_response(resolved.http_status(), "text/html; charset=utf-8", body)
                    return
                if self.path.startswith("/status/") and static_dir is not None:
                    relative_path = self.path.removeprefix("/status/")
                    asset_path = (static_dir / relative_path).resolve()
                    static_root = static_dir.resolve()
                    if static_root == asset_path or static_root in asset_path.parents:
                        if asset_path.is_file():
                            self._write_file_response(asset_path, "application/octet-stream")
                            return
                        index_path = static_dir / "index.html"
                        if index_path.exists():
                            self._write_file_response(index_path, "text/html; charset=utf-8")
                            return
                self._write_response(404, "text/plain; charset=utf-8", b"Not Found\n")

            def log_message(self, format: str, *args) -> None:
                return

            def _write_file_response(self, path: Path, fallback_content_type: str) -> None:
                body = path.read_bytes()
                guessed_type = mimetypes.guess_type(path.name)[0]
                if path.suffix == ".js":
                    content_type = "text/javascript"
                elif path.suffix in {".html", ".htm"}:
                    content_type = fallback_content_type
                elif guessed_type is not None:
                    content_type = guessed_type
                else:
                    content_type = fallback_content_type
                self._write_response(200, content_type, body)

            def _write_response(self, status: int, content_type: str, body: bytes) -> None:
                self.send_response(status)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

        return StatusHandler
