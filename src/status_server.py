import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

try:
    from .status_snapshot import SnapshotStore, render_status_html
except ImportError:
    from status_snapshot import SnapshotStore, render_status_html


class StatusServer:
    def __init__(self, host: str, port: int, snapshot_path: str | Path):
        self._store = SnapshotStore(snapshot_path)
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

        class StatusHandler(BaseHTTPRequestHandler):
            def do_GET(self) -> None:
                resolved = store.resolve()
                if self.path == "/api/status.json":
                    body = json.dumps(resolved.to_dict(), ensure_ascii=True, indent=2).encode("utf-8")
                    self._write_response(resolved.http_status(), "application/json; charset=utf-8", body)
                    return
                if self.path == "/status":
                    body = render_status_html(resolved).encode("utf-8")
                    self._write_response(resolved.http_status(), "text/html; charset=utf-8", body)
                    return
                self._write_response(404, "text/plain; charset=utf-8", b"Not Found\n")

            def log_message(self, format: str, *args) -> None:
                return

            def _write_response(self, status: int, content_type: str, body: bytes) -> None:
                self.send_response(status)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(len(body)))
                self.end_headers()
                self.wfile.write(body)

        return StatusHandler
