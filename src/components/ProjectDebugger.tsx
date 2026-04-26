import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { toast } from "sonner";
import { getAuthToken } from "../lib/auth/getAuthToken";
import { isBackendConfigured } from "../lib/env";
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../lib/api-gateway";

/**
 * ProjectDebugger
 *
 * Lists projects returned by the Scriptony projects API (non-deleted, scoped to the user).
 */

export function ProjectDebugger() {
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllProjects = async () => {
    setLoading(true);
    try {
      if (!isBackendConfigured()) {
        throw new Error(
          "VITE_APPWRITE_FUNCTIONS_BASE_URL oder VITE_BACKEND_API_BASE_URL fehlt.",
        );
      }

      const token = await getAuthToken();
      if (!token) {
        throw new Error("Nicht angemeldet.");
      }

      const response = await fetch(
        buildFunctionRouteUrl(EDGE_FUNCTIONS.PROJECTS, "/projects"),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const data = await response.json();
      const list = Array.isArray(data.projects) ? data.projects : [];
      setAllProjects(list);
      toast.success(`${list.length} Projekt(e) von der API geladen`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Debug fetch error:", error);
      toast.error(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const restoreProject = async (projectId: string) => {
    try {
      if (!isBackendConfigured()) {
        throw new Error("Backend-URL nicht konfiguriert.");
      }

      const token = await getAuthToken();
      if (!token) {
        throw new Error("Nicht angemeldet.");
      }

      const response = await fetch(
        buildFunctionRouteUrl(
          EDGE_FUNCTIONS.PROJECTS,
          `/projects/${projectId}`,
        ),
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_deleted: false }),
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      toast.success("Projekt aktualisiert");
      fetchAllProjects();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("Restore error:", error);
      toast.error(`Error: ${message}`);
    }
  };

  return (
    <Card className="p-6 mb-6 border-2 border-red-500">
      <h3 className="font-semibold mb-4 text-red-600">Projekt-Debugger</h3>
      <p className="text-sm text-muted-foreground mb-4">
        Zeigt Projekte aus GET /projects (aktive, nicht gelöschte). Zum
        Wiederherstellen gelöschter Einträge die Appwrite-Konsole oder einen
        direkten API-Pfad mit Projekt-ID nutzen.
      </p>

      <Button onClick={fetchAllProjects} disabled={loading} className="mb-4">
        {loading ? "Laden…" : "Projekte von der API laden"}
      </Button>

      {allProjects.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {allProjects.map((project) => {
            const deleted = Boolean(project.is_deleted);
            const ptype = project.type ?? project.project_type;
            return (
              <div
                key={project.id}
                className={`p-3 rounded border ${
                  deleted
                    ? "bg-red-50 border-red-300"
                    : "bg-green-50 border-green-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{project.title}</div>
                    <div className="text-xs text-muted-foreground space-x-2">
                      <span>ID: {project.id}</span>
                      <span>Org: {project.organization_id || "NONE"}</span>
                      <span>Gelöscht: {deleted ? "JA" : "NEIN"}</span>
                      <span>Typ: {ptype}</span>
                    </div>
                  </div>

                  {deleted && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => restoreProject(project.id)}
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
