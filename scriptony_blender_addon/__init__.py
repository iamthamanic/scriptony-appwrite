"""Scriptony Blender Add-on.

Connects Blender to the Scriptony render pipeline, publishes shot metadata,
and listens for bridge notifications on localhost.
"""

# BEGIN_LEGACY_BL_INFO
bl_info = {
    "name": "Scriptony",
    "author": "Scriptony",
    "version": (1, 0, 0),
    "blender": (4, 0, 0),
    "location": "View3D > Sidebar > Scriptony",
    "description": "Connect Blender to Scriptony cloud and sync shot state",
    "category": "System",
}
# END_LEGACY_BL_INFO

import bpy
from bpy.props import BoolProperty, EnumProperty, PointerProperty, StringProperty
from bpy.types import AddonPreferences, PropertyGroup

from . import api
from . import constants as C
from . import operators as ops
from . import server
from . import ui


_startup_error = ""


class ScriptonyPreferences(AddonPreferences):
    bl_idname = __package__

    cloud_base_url: StringProperty(
        name="Cloud Base URL",
        description="Appwrite endpoint URL (auto-detected from bridge if left empty)",
        default="",
    )

    integration_token: StringProperty(
        name="Integration Token",
        description="Scriptony integration token used for API authentication",
        default="",
        subtype="PASSWORD",
    )

    def draw(self, _context):
        layout = self.layout
        layout.prop(self, "cloud_base_url")
        layout.prop(self, "integration_token")
        layout.separator()
        layout.label(text="Cloud Base URL is auto-detected from the Local Bridge.")
        layout.label(text="Shot binding is configured per scene in the sidebar.")


class ScriptonyStatus(PropertyGroup):
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


def _addon_preferences():
    try:
        addon = bpy.context.preferences.addons[__package__]
    except KeyError:
        return None
    return addon.preferences


def _network_enabled() -> bool:
    return bool(getattr(bpy.app, "online_access", True))


def _health_check_callback():
    prefs = _addon_preferences()
    window_manager = getattr(bpy.context, "window_manager", None)
    status = getattr(window_manager, "scriptony_status", None)

    if prefs is None or status is None:
        return None

    if _startup_error:
        status.connected = False
        status.last_error = _startup_error
        return C.HEALTH_CHECK_INTERVAL_SEC

    if not _network_enabled():
        status.connected = False
        status.last_error = "Enable Blender Online Access to sync with Scriptony"
        return C.HEALTH_CHECK_INTERVAL_SEC

    base_url = prefs.cloud_base_url.strip()
    token = prefs.integration_token.strip()

    if not base_url:
        bridge_config = api.discover_bridge_config()
        if bridge_config is not None:
            prefs.cloud_base_url = bridge_config["appwriteEndpoint"]
            base_url = prefs.cloud_base_url.strip()

    if not base_url or not token:
        status.connected = False
        status.last_error = "Integration token or base URL not set"
        return C.HEALTH_CHECK_INTERVAL_SEC

    is_ok = api.health_check(base_url, token)
    status.connected = is_ok
    status.last_error = "" if is_ok else "Cloud unreachable"

    for event in server.pop_bridge_events():
        event_type = event.get("type", "")
        job_id = event.get("jobId", "")
        if event_type == "render-accepted":
            status.last_error = f"Render accepted: {job_id}"
        elif event_type == "render-rejected":
            status.last_error = f"Render rejected: {job_id}"

    return C.HEALTH_CHECK_INTERVAL_SEC


def _start_health_check():
    if not bpy.app.timers.is_registered(_health_check_callback):
        bpy.app.timers.register(
            _health_check_callback,
            first_interval=2.0,
            persistent=True,
        )


def _stop_health_check():
    if bpy.app.timers.is_registered(_health_check_callback):
        bpy.app.timers.unregister(_health_check_callback)


_classes = (
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
)


def register():
    global _startup_error

    for cls in _classes:
        bpy.utils.register_class(cls)

    bpy.types.WindowManager.scriptony_status = PointerProperty(type=ScriptonyStatus)
    bpy.types.Scene.scriptony_shot_id = StringProperty(
        name="Shot ID",
        description="The Scriptony shot this Blender scene is bound to",
        default="",
    )

    _startup_error = server.start_server() or ""
    _start_health_check()


def unregister():
    global _startup_error

    _stop_health_check()
    server.stop_server()
    _startup_error = ""

    if hasattr(bpy.types.WindowManager, "scriptony_status"):
        del bpy.types.WindowManager.scriptony_status
    if hasattr(bpy.types.Scene, "scriptony_shot_id"):
        del bpy.types.Scene.scriptony_shot_id

    for cls in reversed(_classes):
        try:
            bpy.utils.unregister_class(cls)
        except RuntimeError:
            pass
