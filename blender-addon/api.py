"""Cloud HTTP client for the Scriptony Blender addon.

All cloud API calls go through _request() — retry, timeout, auth,
and validation in one place (DRY). No third-party dependencies.
"""

import json
import re
import time
import urllib.error
import urllib.request
from . import constants as C


class ApiError(Exception):
    """HTTP error or network failure after retries exhausted."""

    def __init__(self, message: str, status_code: int = 0):
        super().__init__(message)
        self.status_code = status_code


class ValidationError(Exception):
    """Input validation failure (empty shotId, forbidden fields, etc)."""
    pass


# ---------------------------------------------------------------------------
# Validation helpers
# ---------------------------------------------------------------------------

def _validate_shot_id(shot_id: str) -> None:
    if not shot_id or not shot_id.strip():
        raise ValidationError("shotId must not be empty")
    if re.search(r"[/\\]", shot_id):
        raise ValidationError(f"shotId contains path separators: {shot_id!r}")


def _assert_no_forbidden_fields(data: dict) -> None:
    for key in data:
        if key in C.FORBIDDEN_FIELDS:
            raise ValidationError(
                f"Addon must not write forbidden field '{key}'. "
                "Product decisions belong to the backend."
            )


# ---------------------------------------------------------------------------
# Core HTTP request with retry + timeout
# ---------------------------------------------------------------------------

def _build_url(base_url: str, path: str) -> str:
    return f"{base_url.rstrip('/')}/{path.lstrip('/')}"


_RETRIABLE_PATTERNS = [
    "econnrefused", "econnreset", "etimedout",
    "timed out", "connection refused", "connection reset",
    "502", "503", "429", "rate limit", "server error",
]


def _is_retriable(error: Exception) -> bool:
    msg = str(error).lower()
    return any(p in msg for p in _RETRIABLE_PATTERNS)


def _backoff_delay(attempt: int) -> float:
    delay = C.RETRY_BASE_DELAY_SEC * (2 ** attempt)
    return min(delay, C.RETRY_MAX_DELAY_SEC)


def _request(
    base_url: str,
    token: str,
    method: str,
    path: str,
    body: dict | None = None,
) -> dict:
    url = _build_url(base_url, path)
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {token}",
    }

    data = None
    if body is not None:
        encoded = json.dumps(body).encode("utf-8")
        if len(encoded) > C.MAX_PAYLOAD_BYTES:
            raise ValidationError(f"Payload exceeds {C.MAX_PAYLOAD_BYTES} bytes")
        data = encoded

    req = urllib.request.Request(url, data=data, headers=headers, method=method)

    last_error: Exception | None = None
    for attempt in range(C.MAX_RETRIES + 1):
        try:
            with urllib.request.urlopen(req, timeout=C.REQUEST_TIMEOUT_SEC) as resp:
                raw = resp.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except urllib.error.HTTPError as e:
            if 400 <= e.code < 500:
                detail = e.read().decode("utf-8", errors="replace")[:500]
                raise ApiError(f"HTTP {e.code}: {detail}", status_code=e.code)
            detail = e.read().decode("utf-8", errors="replace")[:500]
            last_error = ApiError(f"HTTP {e.code}: {detail}", status_code=e.code)
        except (urllib.error.URLError, OSError) as e:
            last_error = ApiError(str(e))

        if attempt < C.MAX_RETRIES and _is_retriable(last_error):
            time.sleep(_backoff_delay(attempt))
            continue
        break

    raise last_error or ApiError("Request failed after retries")


# ---------------------------------------------------------------------------
# Public API — one function per endpoint
# ---------------------------------------------------------------------------

def sync_shot_state(
    base_url: str, token: str, shot_id: str,
    blender_source_version: str | None = None,
    blender_sync_revision: int | None = None,
) -> dict:
    _validate_shot_id(shot_id)
    body: dict = {"shotId": shot_id}
    if blender_source_version is not None:
        body["blenderSourceVersion"] = blender_source_version
    if blender_sync_revision is not None:
        body["blenderSyncRevision"] = blender_sync_revision
    _assert_no_forbidden_fields(body)
    return _request(base_url, token, "POST", C.EP_SHOT_STATE, body)


def sync_guides(
    base_url: str, token: str, shot_id: str,
    guide_bundle_revision: int | None = None,
    files: str | None = None,
    metadata: str | None = None,
) -> dict:
    _validate_shot_id(shot_id)
    body: dict = {"shotId": shot_id}
    if guide_bundle_revision is not None:
        body["guideBundleRevision"] = guide_bundle_revision
    if files is not None:
        body["files"] = files
    if metadata is not None:
        body["metadata"] = metadata
    _assert_no_forbidden_fields(body)
    return _request(base_url, token, "POST", C.EP_GUIDES, body)


def sync_preview(
    base_url: str, token: str, shot_id: str,
    last_preview_at: str | None = None,
) -> dict:
    _validate_shot_id(shot_id)
    body: dict = {"shotId": shot_id}
    if last_preview_at is not None:
        body["lastPreviewAt"] = last_preview_at
    _assert_no_forbidden_fields(body)
    return _request(base_url, token, "POST", C.EP_PREVIEW, body)


def sync_glb_preview(
    base_url: str, token: str, shot_id: str,
    glb_preview_file_id: str,
) -> dict:
    _validate_shot_id(shot_id)
    body = {"shotId": shot_id, "glbPreviewFileId": glb_preview_file_id}
    _assert_no_forbidden_fields(body)
    return _request(base_url, token, "POST", C.EP_GLB_PREVIEW, body)


def get_freshness(
    base_url: str, token: str, shot_id: str,
) -> dict:
    _validate_shot_id(shot_id)
    return _request(base_url, token, "GET", f"{C.EP_FRESHNESS}/{shot_id}")


def put_view_state(
    base_url: str, token: str, shot_id: str,
    view_state: str,
) -> dict:
    _validate_shot_id(shot_id)
    if len(view_state.encode("utf-8")) > C.MAX_VIEW_STATE_BYTES:
        raise ValidationError(f"viewState exceeds {C.MAX_VIEW_STATE_BYTES} bytes")
    try:
        json.loads(view_state)
    except json.JSONDecodeError:
        raise ValidationError("viewState must be valid JSON")
    body = {"viewState": view_state}
    _assert_no_forbidden_fields(body)
    return _request(base_url, token, "PUT", f"{C.EP_VIEW_STATE}/{shot_id}/view-state", body)


def health_check(base_url: str, token: str) -> bool:
    try:
        _request(base_url, token, "GET", "/health")
        return True
    except Exception:
        return False


def discover_bridge_config() -> dict | None:
    """Query the local bridge for Appwrite endpoint + project ID.

    Returns None if the bridge is unreachable (e.g. not running yet).
    """
    url = f"http://{C.BRIDGE_HEALTH_HOST}:{C.BRIDGE_HEALTH_PORT}/bridge/config"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            raw = resp.read().decode("utf-8")
            data = json.loads(raw)
            if "appwriteEndpoint" in data and "appwriteProjectId" in data:
                return data
    except Exception:
        pass
    return None