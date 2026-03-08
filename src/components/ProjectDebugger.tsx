import { useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { projectId as supabaseProjectId, publicAnonKey } from '../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { getAuthToken } from '../lib/auth/getAuthToken';
import { backendConfig } from '../lib/env';

/**
 * 🔍 PROJECT DEBUGGER
 * Shows ALL projects in database (including deleted/orphaned ones)
 */

export function ProjectDebugger() {
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAllProjects = async () => {
    setLoading(true);
    try {
      if (backendConfig.provider !== 'supabase') {
        throw new Error('Project Debugger ist aktuell nur im Legacy-Supabase-Modus verfügbar.');
      }

      const token = await getAuthToken();
      
      // Direct Supabase query to get ALL projects (bypass organization filter)
      const response = await fetch(
        `https://${supabaseProjectId}.supabase.co/rest/v1/projects?select=*&order=created_at.desc`,
        {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setAllProjects(data);
      toast.success(`Found ${data.length} projects in database`);
    } catch (error: any) {
      console.error('Debug fetch error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const restoreProject = async (projectId: string) => {
    try {
      if (backendConfig.provider !== 'supabase') {
        throw new Error('Project Debugger ist aktuell nur im Legacy-Supabase-Modus verfügbar.');
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
      fetchAllProjects(); // Refresh list
    } catch (error: any) {
      console.error('Restore error:', error);
      toast.error(`Error: ${error.message}`);
    }
  };

  return (
    <Card className="p-6 mb-6 border-2 border-red-500">
      <h3 className="font-semibold mb-4 text-red-600">🔍 Project Debugger</h3>
      
      <Button onClick={fetchAllProjects} disabled={loading} className="mb-4">
        {loading ? 'Loading...' : 'Show ALL Projects (including deleted)'}
      </Button>

      {allProjects.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {allProjects.map(project => (
            <div 
              key={project.id} 
              className={`p-3 rounded border ${project.is_deleted ? 'bg-red-50 border-red-300' : 'bg-green-50 border-green-300'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">{project.title}</div>
                  <div className="text-xs text-muted-foreground space-x-2">
                    <span>ID: {project.id}</span>
                    <span>Org: {project.organization_id || 'NONE'}</span>
                    <span>Deleted: {project.is_deleted ? 'YES' : 'NO'}</span>
                    <span>Type: {project.project_type}</span>
                  </div>
                </div>
                
                {project.is_deleted && (
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
          ))}
        </div>
      )}
    </Card>
  );
}
