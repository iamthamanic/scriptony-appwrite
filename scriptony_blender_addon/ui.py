"""Blender UI panels for the Scriptony add-on."""

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

        connection_box = layout.box()
        connection_box.label(
            text="Connection",
            icon="LINKED" if status.connected else "UNLINKED",
        )
        if status.last_error:
            connection_box.label(text=status.last_error, icon="ERROR")
        if status.last_sync_at:
            connection_box.label(text=f"Last sync: {status.last_sync_at}", icon="TIME")

        binding_box = layout.box()
        binding_box.label(text="Shot Binding", icon="SCENE_DATA")
        binding_box.prop(scene, "scriptony_shot_id", text="Shot ID")
        binding_box.operator("scriptony.bind_shot", text="Bind Shot", icon="LINK_BLEND")

        actions_box = layout.box()
        actions_box.label(text="Sync", icon="FILE_REFRESH")
        column = actions_box.column(align=True)
        column.operator("scriptony.sync_shot_state", text="Sync Shot State", icon="BLENDER")
        column.operator("scriptony.publish_preview", text="Publish Preview", icon="RENDER_STILL")
        column.operator("scriptony.publish_guides", text="Publish Guides", icon="IMAGE_RGB")
        column.operator(
            "scriptony.publish_glb_preview",
            text="Publish GLB Preview",
            icon="FILE_3D",
        )
        column.operator("scriptony.put_view_state", text="Push View State", icon="VIEW3D")

        preferences_operator = layout.operator(
            "preferences.addon_show",
            text="Preferences...",
            icon="PREFERENCES",
        )
        preferences_operator.module = __package__


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

        for label, property_name in (
            ("Guides:", "freshness_guides"),
            ("Render:", "freshness_render"),
            ("Preview:", "freshness_preview"),
        ):
            row = layout.row()
            row.label(text=label)
            value = getattr(status, property_name)
            row.label(text=value.upper(), icon=_freshness_icon(value))

        layout.separator()
        overall_row = layout.row()
        overall_row.label(text="Overall:")
        overall_row.label(
            text=status.freshness_overall.upper(),
            icon=_freshness_icon(status.freshness_overall),
        )

        layout.separator()
        layout.operator("scriptony.refresh_freshness", text="Refresh", icon="FILE_REFRESH")
