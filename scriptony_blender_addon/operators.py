"""Blender operators for the Scriptony add-on."""

import json
from datetime import datetime, timezone

import bpy
from bpy.props import StringProperty
from bpy.types import Operator

from . import api


def _get_prefs(context):
    return context.preferences.addons[__package__].preferences


def _get_shot_id(context):
    return context.scene.scriptony_shot_id.strip()


def _ensure_online_access():
    if not bool(getattr(bpy.app, "online_access", True)):
        raise api.ValidationError("Enable Blender Online Access to sync with Scriptony")


def _get_auth(context):
    _ensure_online_access()
    prefs = _get_prefs(context)
    base_url = prefs.cloud_base_url.strip()
    token = prefs.integration_token.strip()
    if not base_url:
        raise api.ValidationError("Cloud Base URL not set in preferences")
    if not token:
        raise api.ValidationError("Integration Token not set in preferences")
    return base_url, token


def _update_status(context, error_message: str = ""):
    status = context.window_manager.scriptony_status
    if error_message:
        status.last_error = error_message
        return
    status.last_error = ""
    status.last_sync_at = datetime.now(timezone.utc).isoformat(timespec="seconds")


def _update_freshness(context, result: dict):
    status = context.window_manager.scriptony_status
    freshness = result.get("freshness", {})
    for prop_name, key in (
        ("freshness_guides", "guidesStale"),
        ("freshness_render", "renderStale"),
        ("freshness_preview", "previewStale"),
        ("freshness_overall", "overall"),
    ):
        value = freshness.get(key, "unknown")
        if value in {"fresh", "stale", "unknown"}:
            setattr(status, prop_name, value)


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
        if any(char in shot_id for char in "/\\"):
            self.report({"ERROR"}, "Shot ID must not contain path separators")
            return {"CANCELLED"}

        context.scene.scriptony_shot_id = shot_id
        self.report({"INFO"}, f"Bound to shot {shot_id}")
        return {"FINISHED"}

    def invoke(self, context, _event):
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
            api.sync_shot_state(
                base_url,
                token,
                shot_id,
                blender_source_version=bpy.app.version_string,
            )
            _update_status(context)
            self.report({"INFO"}, "Shot state synced")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as error:
            _update_status(context, str(error))
            self.report({"ERROR"}, str(error))
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
            api.sync_preview(base_url, token, shot_id)
            _update_status(context)
            self.report({"INFO"}, "Preview timestamp published")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as error:
            _update_status(context, str(error))
            self.report({"ERROR"}, str(error))
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
            api.sync_guides(
                base_url,
                token,
                shot_id,
                files=self.guide_files,
                metadata=self.guide_metadata,
            )
            _update_status(context)
            self.report({"INFO"}, "Guides published")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as error:
            _update_status(context, str(error))
            self.report({"ERROR"}, str(error))
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
        glb_file_id = self.glb_file_id.strip()
        if not glb_file_id:
            self.report({"ERROR"}, "GLB File ID must not be empty")
            return {"CANCELLED"}

        try:
            base_url, token = _get_auth(context)
            api.sync_glb_preview(base_url, token, shot_id, glb_file_id)
            _update_status(context)
            self.report({"INFO"}, "GLB preview published")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as error:
            _update_status(context, str(error))
            self.report({"ERROR"}, str(error))
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
        view_state = _serialize_viewport_state(context)
        if not view_state:
            self.report({"ERROR"}, "Could not serialize viewport state")
            return {"CANCELLED"}

        try:
            base_url, token = _get_auth(context)
            api.put_view_state(base_url, token, shot_id, view_state)
            _update_status(context)
            self.report({"INFO"}, "View state pushed")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as error:
            _update_status(context, str(error))
            self.report({"ERROR"}, str(error))
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
            result = api.get_freshness(base_url, token, shot_id)
            _update_freshness(context, result)
            self.report({"INFO"}, "Freshness updated")
            return {"FINISHED"}
        except (api.ApiError, api.ValidationError) as error:
            _update_status(context, str(error))
            self.report({"ERROR"}, str(error))
            return {"CANCELLED"}


def _serialize_viewport_state(context) -> str:
    space = context.space_data
    if space is None or space.type != "VIEW_3D":
        return ""

    region_data = space.region_3d
    if region_data is None:
        return ""

    state: dict[str, object] = {
        "isPerspective": region_data.is_perspective,
        "distance": region_data.view_distance,
    }

    camera = context.scene.camera
    if camera is not None:
        state["cameraName"] = camera.name
        location = camera.location
        rotation = camera.rotation_euler
        state["cameraLocation"] = [location.x, location.y, location.z]
        state["cameraRotation"] = [rotation.x, rotation.y, rotation.z]

    return json.dumps(state, separators=(",", ":"))
