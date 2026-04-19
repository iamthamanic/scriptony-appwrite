import importlib
import pathlib
import sys

import bpy


def _repo_root() -> pathlib.Path:
    if "--" not in sys.argv:
        raise SystemExit("Expected repo root after --")
    argv = sys.argv[sys.argv.index("--") + 1 :]
    if not argv:
        raise SystemExit("Expected repo root after --")
    return pathlib.Path(argv[0]).resolve()


root_dir = _repo_root()
sys.path.insert(0, str(root_dir))

addon = importlib.import_module("scriptony_blender_addon")

# Keep the smoke test deterministic and independent from local ports or timers.
addon.server.start_server = lambda: None
addon.server.stop_server = lambda: None
addon._start_health_check = lambda: None
addon._stop_health_check = lambda: None

addon.register()

try:
    if not hasattr(bpy.types.WindowManager, "scriptony_status"):
        raise AssertionError("WindowManager.scriptony_status not registered")
    if not hasattr(bpy.types.Scene, "scriptony_shot_id"):
        raise AssertionError("Scene.scriptony_shot_id not registered")
    if addon.ScriptonyPreferences.bl_idname != "scriptony_blender_addon":
        raise AssertionError("Unexpected AddonPreferences bl_idname")
    print("Scriptony Blender add-on register() smoke test passed")
finally:
    addon.unregister()

if hasattr(bpy.types.WindowManager, "scriptony_status"):
    raise AssertionError("WindowManager.scriptony_status still registered after unregister()")
if hasattr(bpy.types.Scene, "scriptony_shot_id"):
    raise AssertionError("Scene.scriptony_shot_id still registered after unregister()")

print("Scriptony Blender add-on unregister() smoke test passed")
