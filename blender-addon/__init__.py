"""Scriptony Blender Addon — connect Blender to the Scriptony render pipeline.

Publishes shot metadata, previews, and guides to the Scriptony cloud.
Receives render-accepted/rejected notifications from the Local Bridge.
Makes NO product decisions — all accept/reject stays in the backend.
"""

bl_info = {
    "name": "Scriptony",
    "author": "Scriptony",
    "version": (1, 0, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > Scriptony",
    "description": "Connect Blender to Scriptony cloud — sync shots, publish previews",
    "category": "System",
}

import bpy
from bpy.types import AddonPreferences, PropertyGroup
from bpy.props import StringProperty, BoolProperty, EnumProperty
from bpy.app.handlers import persistent

from . import api
from . import server
from . import constants as C


# ---------------------------------------------------------------------------
# Preferences — API key + endpoint, stored in user prefs (NOT in .blend)
# ---------------------------------------------------------------------------

class ScriptonyPreferences(AddonPreferences):
    bl_idname = __package__

    cloud_base_url: StringProperty(
        name="Cloud Base URL",
        description="Appwrite endpoint URL (auto-detected from bridge if left empty)",
        default="",
    )

    integration_token: StringProperty(
        name="Integration Token",
        description="Scriptony integration token (Bearer token for API auth)",
        default="",
        subtype="PASSWORD",
    )

    def draw(self, context):
        layout = self.layout
        layout.prop(self, "cloud_base_url")
        layout.prop(self, "integration_token")
        layout.separator()
        layout.label(text="Cloud Base URL is auto-detected from the Local Bridge.")
        layout.label(text="Shot binding is set per-scene in the 3D viewport sidebar.")


# ---------------------------------------------------------------------------
# Runtime status — on WindowManager, not persisted
# ---------------------------------------------------------------------------

class ScriptonyStatus(PropertyGroup):
    bl_idname = "scriptony.status"

    connected: BoolProperty(name="Connected", default=False)
    last_error: StringProperty(name="Last Error", default="")
    last_sync_at: StringProperty(name="Last Sync At", default="")

    freshness_guides: EnumProperty(
        name="Guides",
        items=[("fresh", "Fresh", ""), ("stale", "Stale", ""), ("unknown", "Unknown", "")],
        default="unknown",
    )
    freshness_render: EnumProperty(
        name="Render",
        items=[("fresh", "Fresh", ""), ("stale", "Stale", ""), ("unknown", "Unknown", "")],
        default="unknown",
    )
    freshness_preview: EnumProperty(
        name="Preview",
        items=[("fresh", "Fresh", ""), ("stale", "Stale", ""), ("unknown", "Unknown", "")],
        default="unknown",
    )
    freshness_overall: EnumProperty(
        name="Overall",
        items=[("fresh", "Fresh", ""), ("stale", "Stale", ""), ("unknown", "Unknown", "")],
        default="unknown",
    )


# ---------------------------------------------------------------------------
# Health check timer
# ---------------------------------------------------------------------------

_health_timer = None


def _health_check_callback():
    prefs = bpy.context.preferences.addons[__package__].preferences
    wm = bpy.context.window_manager
    status = wm.scriptony_status

    base_url = prefs.cloud_base_url.strip()
    token = prefs.integration_token.strip()

    # Auto-discover Appwrite config from bridge if base URL not set
    if not base_url:
        bridge_config = api.discover_bridge_config()
        if bridge_config:
            prefs.cloud_base_url = bridge_config["appwriteEndpoint"]
            base_url = prefs.cloud_base_url.strip()

    if not base_url or not token:
        status.connected = False
        status.last_error = "API key or base URL not set"
        return C.HEALTH_CHECK_INTERVAL_SEC

    is_ok = api.health_check(base_url, token)
    status.connected = is_ok
    status.last_error = "" if is_ok else "Cloud unreachable"

    # Process any bridge events
    events = server.pop_bridge_events()
    for event in events:
        t = event.get("type", "")
        job = event.get("jobId", "")
        if t == "render-accepted":
            status.last_error = f"Render accepted: {job}"
        elif t == "render-rejected":
            status.last_error = f"Render rejected: {job}"

    return C.HEALTH_CHECK_INTERVAL_SEC


def _start_health_check():
    global _health_timer
    if _health_timer is not None:
        return
    _health_timer = bpy.app.timers.register(
        _health_check_callback,
        first_interval=2.0,
        persistent=True,
    )


def _stop_health_check():
    global _health_timer
    if _health_timer is not None:
        bpy.app.timers.unregister(_health_timer)
        _health_timer = None


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------

from . import operators as ops
from . import ui


_classes = [
    ScriptonyPreferences,
    ScriptonyStatus,
    ops.SCRIPTONY_OT_bind_shot,
    ops.SCRIPTONY_OT_sync_shot_state,
    ops.SCRIPTONY_OT_publish_preview,
    ops.SCRIPTONY_OT_publish_guides,
    ops.SCRIPTONY_OT_publish_glb_preview,
    ops.SCRIPTONY_OT_put_view_state,
    ops.SCRIPTONY_OT_refresh_freshness,
    ui.SCRIPTONY_PT_main,
    ui.SCRIPTONY_PT_freshness,
]


def register():
    for cls in _classes:
        bpy.utils.register_class(cls)

    bpy.types.WindowManager.scriptony_status = bpy.props.PointerProperty(
        type=ScriptonyStatus,
    )
    bpy.types.Scene.scriptony_shot_id = StringProperty(
        name="Shot ID",
        description="The Scriptony shot this Blender scene is bound to",
        default="",
    )

    server.start_server()
    _start_health_check()


def unregister():
    _stop_health_check()
    server.stop_server()

    del bpy.types.WindowManager.scriptony_status
    del bpy.types.Scene.scriptony_shot_id

    for cls in reversed(_classes):
        bpy.utils.unregister_class(cls)