"""Local HTTP server for bridge notifications.

The Local Bridge (Node.js daemon) calls this server at
http://127.0.0.1:9876 to notify the addon about render events.

Thread-safe event queue bridges the server thread and Blender's main thread.
"""

import json
import threading
from datetime import datetime, timezone
from http.server import HTTPServer, BaseHTTPRequestHandler
from . import constants as C

# ---------------------------------------------------------------------------
# Thread-safe event queue
# ---------------------------------------------------------------------------

_event_queue: list[dict] = []
_event_lock = threading.Lock()


def pop_bridge_events() -> list[dict]:
    """Return and clear all pending bridge events. Call from main thread."""
    with _event_lock:
        events = list(_event_queue)
        _event_queue.clear()
        return events


def _enqueue(event: dict) -> None:
    with _event_lock:
        _event_queue.append(event)


# ---------------------------------------------------------------------------
# Request handler
# ---------------------------------------------------------------------------

class _BridgeHandler(BaseHTTPRequestHandler):

    def do_GET(self):
        if self.path == "/health":
            self._send_json(200, {
                "status": "ok",
                "service": "scriptony-blender-addon",
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        else:
            self._send_json(404, {"error": "Not found"})

    def do_POST(self):
        if self.path == "/bridge/render-accepted":
            self._handle_bridge_event("render-accepted")
        elif self.path == "/bridge/render-rejected":
            self._handle_bridge_event("render-rejected")
        else:
            self._send_json(404, {"error": "Not found"})

    def _handle_bridge_event(self, event_type: str):
        try:
            length = int(self.headers.get("Content-Length", 0))
            if length > C.MAX_PAYLOAD_BYTES:
                self._send_json(413, {"error": "Payload too large"})
                return
            raw = self.rfile.read(length) if length > 0 else b"{}"
            body = json.loads(raw.decode("utf-8")) if raw else {}
        except (json.JSONDecodeError, ValueError):
            self._send_json(400, {"error": "Invalid JSON"})
            return

        shot_id = body.get("shotId", "")
        job_id = body.get("jobId", "")
        if not shot_id or not job_id:
            self._send_json(400, {"error": "shotId and jobId required"})
            return

        _enqueue({"type": event_type, "shotId": shot_id, "jobId": job_id})
        self._send_json(200, {"ok": True, "event": event_type})

    def _send_json(self, status: int, body: dict):
        payload = json.dumps(body).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, format, *args):
        pass  # Suppress default stderr logging


# ---------------------------------------------------------------------------
# Server lifecycle
# ---------------------------------------------------------------------------

_server: HTTPServer | None = None
_server_thread: threading.Thread | None = None


def start_server() -> None:
    global _server, _server_thread
    if _server is not None:
        return

    _server = HTTPServer((C.BRIDGE_HOST, C.BRIDGE_PORT), _BridgeHandler)
    _server_thread = threading.Thread(target=_server.serve_forever, daemon=True)
    _server_thread.start()


def stop_server() -> None:
    global _server, _server_thread
    if _server is not None:
        _server.shutdown()
        _server.server_close()
        _server = None
    if _server_thread is not None:
        _server_thread.join(timeout=5)
        _server_thread = None