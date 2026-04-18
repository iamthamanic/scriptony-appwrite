"""Blender UI panels for the Scriptony addon.

Two panels in the 3D viewport sidebar:
  - Main: connection status, shot binding, sync actions
  - Freshness: guides/render/preview staleness indicators

No product decisions in the UI — no accept/reject buttons.
"""

import bpy
from bpy.types import Panel


def _freshness_icon(value: str) -> str:
    if value == "fresh":
        return "CHECKMARK"
    if value == "stale":
        return "ERROR"
    return "QUESTION"


class SCRIPTONY_PT_main(Panel):
    bl_label = "Scriptony"
    bl_idname = "SCRIPTONY_PT_main"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Scriptony"

    def draw(self, context):
        layout = self.layout
        scene = context.scene
        status = context.window_manager.scriptony_status

        # Connection status
        box = layout.box()
        box.label(
            text="Connection",
            icon="LINKED" if status.connected else "UNLINKED",
        )
        if status.last_error:
            box.label(text=status.last_error, icon="ERROR")
        if status.last_sync_at:
            box.label(text=f"Last sync: {status.last_sync_at}", icon="TIME")

        # Shot binding
        box = layout.box()
        box.label(text="Shot Binding", icon="SCENE_DATA")
        box.prop(scene, "scriptony_shot_id", text="Shot ID")
        box.operator("scriptony.bind_shot", text="Bind Shot", icon="LINK_BLEND")

        # Actions
        box = layout.box()
        box.label(text="Sync", icon="FILE_REFRESH")
        col = box.column(align=True)
        col.operator("scriptony.sync_shot_state", text="Sync Shot State", icon="BLENDER")
        col.operator("scriptony.publish_preview", text="Publish Preview", icon="RENDER_STILL")
        col.operator("scriptony.publish_guides", text="Publish Guides", icon="IMAGE_RGB")
        col.operator("scriptony.publish_glb_preview", text="Publish GLB Preview", icon="FILE_3D")
        col.operator("scriptony.put_view_state", text="Push View State", icon="VIEW3D")

        # Preferences link
        layout.operator("preferences.addon_show", text="Preferences...", icon="PREFERENCES")


class SCRIPTONY_PT_freshness(Panel):
    bl_label = "Freshness Status"
    bl_idname = "SCRIPTONY_PT_freshness"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Scriptony"
    bl_parent_id = "SCRIPTONY_PT_main"
    bl_options = {"DEFAULT_CLOSED"}

    def draw(self, context):
        layout = self.layout
        status = context.window_manager.scriptony_status

        for label, prop in [
            ("Guides:", "freshness_guides"),
            ("Render:", "freshness_render"),
            ("Preview:", "freshness_preview"),
        ]:
            row = layout.row()
            row.label(text=label)
            val = getattr(status, prop)
            row.label(text=val.upper(), icon=_freshness_icon(val))

        layout.separator()
        row = layout.row()
        row.label(text="Overall:")
        row.label(
            text=status.freshness_overall.upper(),
            icon=_freshness_icon(status.freshness_overall),
        )

        layout.separator()
        layout.operator("scriptony.refresh_freshness", text="Refresh", icon="FILE_REFRESH")