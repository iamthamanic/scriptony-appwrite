import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { ArrowLeft, AlertTriangle, CheckCircle } from 'lucide-react';
import { projectId as supabaseProjectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { getAuthToken } from '../../lib/auth/getAuthToken';
import { Badge } from '../ui/badge';
import { backendConfig } from '../../lib/env';

/**
 * 🔧 PROJECT RECOVERY PAGE
 * Shows ALL projects in database (including deleted/orphaned ones)
 * Allows restoring deleted projects or fixing organization issues
 */

export function ProjectRecoveryPage({ onBack }: { onBack: () => void }) {
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [userOrgs, setUserOrgs] = useState<any[]>([]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      if (backendConfig.provider !== 'supabase') {
        throw new Error('Project Recovery ist aktuell nur im Legacy-Supabase-Modus verfügbar.');
      }

      const token = await getAuthToken();
      
      // Fetch ALL projects (including deleted)
      const projectsResponse = await fetch(
        `https://${supabaseProjectId}.supabase.co/rest/v1/projects?select=*&order=created_at.desc`,
        {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!projectsResponse.ok) {
        throw new Error(`HTTP error! status: ${projectsResponse.status}`);
      }

      const projects = await projectsResponse.json();
      
      // Fetch user's organizations
      const orgsResponse = await fetch(
        `https://${supabaseProjectId}.supabase.co/rest/v1/organizations?select=*`,
        {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const orgs = orgsResponse.ok ? await orgsResponse.json() : [];
      
      setAllProjects(projects);
      setUserOrgs(orgs);
      toast.success(`Found ${projects.length} projects and ${orgs.length} organizations`);
    } catch (error: any) {
      console.error('Fetch error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const restoreProject = async (projectId: string) => {
    try {
      if (backendConfig.provider !== 'supabase') {
        throw new Error('Project Recovery ist aktuell nur im Legacy-Supabase-Modus verfügbar.');
      }

      const token = await getAuthToken();
      
      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/rest/v1/projects?id=eq.${projectId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            is_deleted: false,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.success('Project restored!');
      fetchAllData(); // Refresh list
    } catch (error: any) {
      console.error('Restore error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  const fixOrganization = async (projectId: string) => {
    if (userOrgs.length === 0) {
      toast.error('No organizations found. Cannot fix.');
      return;
    }

    try {
      if (backendConfig.provider !== 'supabase') {
        throw new Error('Project Recovery ist aktuell nur im Legacy-Supabase-Modus verfügbar.');
      }

      const token = await getAuthToken();
      
      // Assign to first user org
      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/rest/v1/projects?id=eq.${projectId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation',
          },
          body: JSON.stringify({
            organization_id: userOrgs[0].id,
            is_deleted: false, // Also undelete
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      toast.success(`Project assigned to organization "${userOrgs[0].name}"!`);
      fetchAllData(); // Refresh list
    } catch (error: any) {
      console.error('Fix error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 py-6 bg-gradient-to-b from-red-500/10 to-transparent border-b border-red-200">
        <div className="flex items-center gap-3 mb-2">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onBack}
            className="shrink-0"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">🔧 Project Recovery</h1>
            <p className="text-sm text-muted-foreground">Wiederherstellen gelöschter oder verlorener Projekte</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 max-w-4xl mx-auto">
        <Card className="p-6 mb-6 border-2 border-yellow-500/50 bg-yellow-50/50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="size-5 text-yellow-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">Debug-Modus</h3>
              <p className="text-sm text-yellow-800">
                Diese Seite zeigt ALLE Projekte in der Datenbank an, inklusive gelöschter und Projekte ohne Organization.
                Nutze diese Funktion um verlorene Projekte wiederherzustellen.
              </p>
            </div>
          </div>
        </Card>

        <Button 
          onClick={fetchAllData} 
          disabled={loading}
          size="lg"
          className="w-full mb-6"
        >
          {loading ? 'Loading...' : '🔍 Scan Database for ALL Projects'}
        </Button>

        {userOrgs.length > 0 && (
          <Card className="p-4 mb-6 bg-green-50/50 border-green-200">
            <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
              <CheckCircle className="size-4 text-green-600" />
              Your Organizations
            </h3>
            <div className="space-y-1">
              {userOrgs.map(org => (
                <div key={org.id} className="text-xs text-muted-foreground">
                  • {org.name} ({org.id})
                </div>
              ))}
            </div>
          </Card>
        )}

        {allProjects.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold mb-3">
              Found {allProjects.length} Projects in Database
            </h3>
            
            {allProjects.map(project => {
              const isDeleted = project.is_deleted;
              const hasOrg = !!project.organization_id;
              const hasIssue = isDeleted || !hasOrg;
              
              return (
                <Card 
                  key={project.id} 
                  className={`p-4 ${hasIssue ? 'border-2 border-red-300 bg-red-50/30' : 'border-green-300 bg-green-50/30'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium truncate">{project.title}</h4>
                        <Badge variant={hasIssue ? "destructive" : "default"} className="shrink-0 text-xs">
                          {project.project_type}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div>
                          <span className="font-medium">ID:</span> {project.id.slice(0, 8)}...
                        </div>
                        <div>
                          <span className="font-medium">Created:</span> {new Date(project.created_at).toLocaleDateString('de-DE')}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Deleted:</span> 
                          <Badge variant={isDeleted ? "destructive" : "outline"} className="text-xs px-1 py-0">
                            {isDeleted ? 'YES' : 'NO'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Org:</span>
                          <Badge variant={hasOrg ? "outline" : "destructive"} className="text-xs px-1 py-0">
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
                          Fix Org
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
            <p>Klicke auf "Scan Database" um zu starten</p>
          </Card>
        )}
      </div>
    </div>
  );
}
