import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { getAuthToken } from '../../lib/auth/getAuthToken';
import { Badge } from '../ui/badge';
import { isBackendConfigured } from '../../lib/env';
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from '../../lib/api-gateway';

/**
 * ProjectRecoveryPage
 *
 * Lists active projects from the Scriptony API and supports org fixes via PUT /projects/:id.
 */

export function ProjectRecoveryPage({ onBack }: { onBack: () => void }) {
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userOrgs, setUserOrgs] = useState<Array<{ id: string; name: string }>>([]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (!isBackendConfigured()) {
        throw new Error('VITE_APPWRITE_FUNCTIONS_BASE_URL oder VITE_BACKEND_API_BASE_URL fehlt.');
      }

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Nicht angemeldet.');
      }

      const projectsResponse = await fetch(
        buildFunctionRouteUrl(EDGE_FUNCTIONS.PROJECTS, '/projects'),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!projectsResponse.ok) {
        const text = await projectsResponse.text();
        throw new Error(`Projekte: HTTP ${projectsResponse.status}: ${text}`);
      }

      const projectsJson = await projectsResponse.json();
      const projects = Array.isArray(projectsJson.projects) ? projectsJson.projects : [];

      const orgsResponse = await fetch(
        buildFunctionRouteUrl(EDGE_FUNCTIONS.AUTH, '/organizations'),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      let orgs: Array<{ id: string; name: string }> = [];
      if (orgsResponse.ok) {
        const orgJson = await orgsResponse.json();
        const raw = Array.isArray(orgJson.organizations) ? orgJson.organizations : [];
        orgs = raw
          .map((row: { organizations?: { id: string; name: string } }) => row.organizations)
          .filter(Boolean) as Array<{ id: string; name: string }>;
      }

      setAllProjects(projects);
      setUserOrgs(orgs);
      toast.success(`${projects.length} Projekt(e), ${orgs.length} Organisation(en)`);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Fetch error:', error);
      toast.error(`Error: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  const restoreProject = async (projectId: string) => {
    try {
      if (!isBackendConfigured()) {
        throw new Error('Backend-URL nicht konfiguriert.');
      }

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Nicht angemeldet.');
      }

      const response = await fetch(
        buildFunctionRouteUrl(EDGE_FUNCTIONS.PROJECTS, `/projects/${projectId}`),
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ is_deleted: false }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      toast.success('Projekt aktualisiert');
      fetchAllData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Restore error:', error);
      toast.error(`Error: ${message}`);
    }
  };

  const fixOrganization = async (projectId: string) => {
    if (userOrgs.length === 0) {
      toast.error('Keine Organisation gefunden.');
      return;
    }

    try {
      if (!isBackendConfigured()) {
        throw new Error('Backend-URL nicht konfiguriert.');
      }

      const token = await getAuthToken();
      if (!token) {
        throw new Error('Nicht angemeldet.');
      }

      const first = userOrgs[0];
      const response = await fetch(
        buildFunctionRouteUrl(EDGE_FUNCTIONS.PROJECTS, `/projects/${projectId}`),
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            organization_id: first.id,
            is_deleted: false,
          }),
        }
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      toast.success(`Projekt der Organisation „${first.name}“ zugeordnet`);
      fetchAllData();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Fix error:', error);
      toast.error(`Error: ${message}`);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 py-6 bg-gradient-to-b from-red-500/10 to-transparent border-b border-red-200">
        <div className="flex items-center gap-3 mb-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Projekt-Wiederherstellung</h1>
            <p className="text-sm text-muted-foreground">
              Aktive Projekte und Organisations-Zuordnung prüfen
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 max-w-4xl mx-auto">
        <Card className="p-6 mb-6 border-2 border-yellow-500/50 bg-yellow-50/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Hinweis</h3>
              <p className="text-sm text-yellow-800">
                Die API-Liste enthält nur nicht gelöschte Projekte. Gelöschte Datensätze siehst du in
                der Appwrite-Datenbank bzw. Konsole.
              </p>
            </div>
          </div>
        </Card>

        <Button onClick={fetchAllData} disabled={loading} size="lg" className="w-full mb-6">
          {loading ? 'Laden…' : 'Daten von der API laden'}
        </Button>

        {userOrgs.length > 0 && (
          <Card className="p-4 mb-6 bg-green-50/50 border-green-200">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <CheckCircle className="size-4 text-green-600" />
              Deine Organisationen
            </h3>
            <div className="space-y-1">
              {userOrgs.map((org) => (
                <div key={org.id} className="text-xs text-muted-foreground">
                  • {org.name} ({org.id})
                </div>
              ))}
            </div>
          </Card>
        )}

        {allProjects.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold mb-3">{allProjects.length} Projekt(e)</h3>

            {allProjects.map((project) => {
              const isDeleted = Boolean(project.is_deleted);
              const hasOrg = !!project.organization_id;
              const hasIssue = isDeleted || !hasOrg;
              const ptype = project.type ?? project.project_type;

              return (
                <Card
                  key={project.id}
                  className={`p-4 ${
                    hasIssue ? 'border-2 border-red-300 bg-red-50/30' : 'border-green-300 bg-green-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium truncate">{project.title}</h4>
                        <Badge variant={hasIssue ? 'destructive' : 'default'} className="shrink-0 text-xs">
                          {ptype}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">ID:</span> {project.id.slice(0, 8)}...
                        </div>
                        <div>
                          <span className="font-medium">Erstellt:</span>{' '}
                          {project.created_at
                            ? new Date(project.created_at).toLocaleDateString('de-DE')
                            : '—'}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Gelöscht:</span>
                          <Badge variant={isDeleted ? 'destructive' : 'outline'} className="text-xs px-1 py-0">
                            {isDeleted ? 'JA' : 'NEIN'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Org:</span>
                          <Badge variant={hasOrg ? 'outline' : 'destructive'} className="text-xs px-1 py-0">
                            {hasOrg ? 'OK' : 'NONE'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      {isDeleted && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restoreProject(project.id)}
                          className="whitespace-nowrap text-xs"
                        >
                          Restore
                        </Button>
                      )}
                      {!hasOrg && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => fixOrganization(project.id)}
                          className="whitespace-nowrap text-xs"
                        >
                          Org zuweisen
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {!loading && allProjects.length === 0 && (
          <Card className="p-12 text-center text-muted-foreground">
            <p>„Daten von der API laden“ antippen, um zu starten</p>
          </Card>
        )}
      </div>
    </div>
  );
}
