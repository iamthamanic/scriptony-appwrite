"""Shared constants for the Scriptony Blender add-on."""

EP_SHOT_STATE = "/sync/shot-state"
EP_GUIDES = "/sync/guides"
EP_PREVIEW = "/sync/preview"
EP_GLB_PREVIEW = "/sync/glb-preview"
EP_FRESHNESS = "/sync/freshness"
EP_VIEW_STATE = "/stage3d/documents"

BRIDGE_HOST = "127.0.0.1"
BRIDGE_PORT = 9876

BRIDGE_HEALTH_HOST = "127.0.0.1"
BRIDGE_HEALTH_PORT = 9877

REQUEST_TIMEOUT_SEC = 10
MAX_RETRIES = 3
RETRY_BASE_DELAY_SEC = 1.0
RETRY_MAX_DELAY_SEC = 30.0

MAX_PAYLOAD_BYTES = 1_048_576
MAX_VIEW_STATE_BYTES = 65_536

FORBIDDEN_FIELDS = frozenset(
    {
        "acceptedRenderJobId",
        "renderRevision",
        "reviewStatus",
        "styleProfileRevision",
        "latestRenderJobId",
    }
)

HEALTH_CHECK_INTERVAL_SEC = 60
