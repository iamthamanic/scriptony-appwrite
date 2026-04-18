"""Blender operators for the Scriptony addon.

Each operator: read prefs → validate → call api → update status.
Never touches HTTP directly — all cloud calls go through api.py (DIP).
"""

import json
from datetime import datetime, timezone

import bpy
from bpy.types import Operator
from bpy.props import StringProperty

from . import api


# ---------------------------------------------------------------------------
# Helpers (DRY)
# ---------------------------------------------------------------------------

def _get_prefs(context):
    return context.preferences.addons[__package__].preferences


def _get_shot_id(context):
    return context.scene.scriptony_shot_id.strip()


def _get_auth(context):
    prefs = _get_prefs(context)
    base_url = prefs.cloud_base_url.strip()
    token = prefs.integration_token.strip()
    if not base_url:
        raise api.ValidationError("Cloud Base URL not set in preferences")
    if not token:
        raise api.ValidationError("Integration Token not set in preferences")
    return base_url, token


def _update_status(context, error_msg=""):
    status = context.window_manager.scriptony_status
    if error_msg:
        status.last_error = error_msg
    else:
        status.last_error = ""
        status.last_sync_at = datetime.now(timezone.utc).isoformat()[:19]


def _update_freshness(context, result: dict):
    status = context.window_manager.scriptony_status
    f = result.get("freshness", {})
    for prop, key in [
        ("freshness_guides", "guidesStale"),
        ("freshness_render", "renderStale"),
        ("freshness_preview", "previewStale"),
        ("freshness_overall", "overall"),
    ]:
        val = f.get(key, "unknown")
        if val in ("fresh", "stale", "unknown"):
            setattr(status, prop, val)


# ---------------------------------------------------------------------------
# Operators
# ---------------------------------------------------------------------------

class SCRIPTONY_OT_bind_shot(Operator):
    bl_idname = "scriptony.bind_shot"
    bl_label = "Bind Shot"
    bl_options = {"REGISTER", "UNDO"}

    shot_id: StringProperty(name="Shot ID", description="Scriptony shot ID")

    def execute(self, context):
        shot_id = self.shot_id.strip()
        if not shot_id:
            self.report({"ERROR"}, "Shot ID must not be empty")
            return {"CANCELLED"}
        if any(c in shot_id for c in "/\\"):
            self.report({"ERROR"}, "Shot ID must not contain path separators")
            return {"CANCELLED"}
        context.scene.scriptony_shot_id = shot_id
        self.report({"INFO"}, f"Bound to shot {shot_id}")
        return {"FINISHED"}

    def invoke(self, context, event):
        return context.window_manager.invoke_props_dialog(self)


class SCRIPTONY_OT_sync_shot_state(Operator):
    bl_idname = "scriptony.sync_shot_state"
    bl_label = "Sync Shot State"
    bl_options = {"REGISTER"}

    @classmethod
    def poll(cls, context):
        return bool(_get_shot_id(context))

    def execute(self, context):
        shot_id = _get_shot_id(context)
        try:
            base_url, token = _get_auth(context)
        except api.ValidationError as e:
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}

        try:
            api.sync_shot_state(
                base_url, token, shot_id,
                blender_source_version=bpy.app.version_string,
            )
            _update_status(context)
            self.report({"INFO"}, "Shot state synced")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as e:
            _update_status(context, str(e))
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}


class SCRIPTONY_OT_publish_preview(Operator):
    bl_idname = "scriptony.publish_preview"
    bl_label = "Publish Preview"
    bl_options = {"REGISTER"}

    @classmethod
    def poll(cls, context):
        return bool(_get_shot_id(context))

    def execute(self, context):
        shot_id = _get_shot_id(context)
        try:
            base_url, token = _get_auth(context)
        except api.ValidationError as e:
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}

        try:
            api.sync_preview(base_url, token, shot_id)
            _update_status(context)
            self.report({"INFO"}, "Preview timestamp published")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as e:
            _update_status(context, str(e))
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}


class SCRIPTONY_OT_publish_guides(Operator):
    bl_idname = "scriptony.publish_guides"
    bl_label = "Publish Guides"
    bl_options = {"REGISTER"}

    guide_files: StringProperty(name="Guide Files", default="{}")
    guide_metadata: StringProperty(name="Guide Metadata", default="{}")

    @classmethod
    def poll(cls, context):
        return bool(_get_shot_id(context))

    def execute(self, context):
        shot_id = _get_shot_id(context)
        try:
            base_url, token = _get_auth(context)
        except api.ValidationError as e:
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}

        try:
            api.sync_guides(
                base_url, token, shot_id,
                files=self.guide_files,
                metadata=self.guide_metadata,
            )
            _update_status(context)
            self.report({"INFO"}, "Guides published")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as e:
            _update_status(context, str(e))
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}


class SCRIPTONY_OT_publish_glb_preview(Operator):
    bl_idname = "scriptony.publish_glb_preview"
    bl_label = "Publish GLB Preview"
    bl_options = {"REGISTER"}

    glb_file_id: StringProperty(name="GLB File ID")

    @classmethod
    def poll(cls, context):
        return bool(_get_shot_id(context))

    def execute(self, context):
        shot_id = _get_shot_id(context)
        try:
            base_url, token = _get_auth(context)
        except api.ValidationError as e:
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}

        if not self.glb_file_id.strip():
            self.report({"ERROR"}, "GLB File ID must not be empty")
            return {"CANCELLED"}

        try:
            api.sync_glb_preview(base_url, token, shot_id, self.glb_file_id.strip())
            _update_status(context)
            self.report({"INFO"}, "GLB preview published")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as e:
            _update_status(context, str(e))
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}


class SCRIPTONY_OT_put_view_state(Operator):
    bl_idname = "scriptony.put_view_state"
    bl_label = "Push View State"
    bl_options = {"REGISTER"}

    @classmethod
    def poll(cls, context):
        return bool(_get_shot_id(context)) and context.space_data is not None

    def execute(self, context):
        shot_id = _get_shot_id(context)
        try:
            base_url, token = _get_auth(context)
        except api.ValidationError as e:
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}

        view_state = _serialize_viewport_state(context)
        if not view_state:
            self.report({"ERROR"}, "Could not serialize viewport state")
            return {"CANCELLED"}

        try:
            api.put_view_state(base_url, token, shot_id, view_state)
            _update_status(context)
            self.report({"INFO"}, "View state pushed")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as e:
            _update_status(context, str(e))
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}


class SCRIPTONY_OT_refresh_freshness(Operator):
    bl_idname = "scriptony.refresh_freshness"
    bl_label = "Refresh Freshness"
    bl_options = {"REGISTER"}

    @classmethod
    def poll(cls, context):
        return bool(_get_shot_id(context))

    def execute(self, context):
        shot_id = _get_shot_id(context)
        try:
            base_url, token = _get_auth(context)
        except api.ValidationError as e:
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}

        try:
            result = api.get_freshness(base_url, token, shot_id)
            _update_freshness(context, result)
            self.report({"INFO"}, "Freshness updated")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as e:
            _update_status(context, str(e))
            self.report({"ERROR"}, str(e))
            return {"CANCELLED"}


# ---------------------------------------------------------------------------
# Viewport serialization
# ---------------------------------------------------------------------------

def _serialize_viewport_state(context) -> str:
    space = context.space_data
    if space is None or space.type != "VIEW_3D":
        return ""

    region_data = space.region_3d
    if region_data is None:
        return ""

    state = {
        "isPerspective": region_data.is_perspective,
        "distance": region_data.view_distance,
    }

    cam = context.scene.camera
    if cam:
        state["cameraName"] = cam.name
        loc = cam.location
        rot = cam.rotation_euler
        state["cameraLocation"] = [loc.x, loc.y, loc.z]
        state["cameraRotation"] = [rot.x, rot.y, rot.z]

    return json.dumps(state, separators=(",", ":"))