import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { backendConfig } from "../../lib/env";
import { getAuthToken } from "../../lib/auth/getAuthToken";
import { EdgeFunctionDebugPanel } from "../EdgeFunctionDebugPanel";
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../../lib/api-gateway";

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error' | 'running';
  message?: string;
  duration?: number;
}

export function ApiTestPage() {
  const [tests, setTests] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const updateTest = (name: string, update: Partial<TestResult>) => {
    setTests(prev => {
      const existing = prev.find(t => t.name === name);
      if (existing) {
        return prev.map(t => t.name === name ? { ...t, ...update } : t);
      }
      return [...prev, { name, status: 'pending', ...update }];
    });
  };

  const runTests = async () => {
    setRunning(true);
    setTests([]);

    // Test 1: Environment Config
    updateTest('Environment Config', { status: 'running' });
    try {
      const url = backendConfig.functionsBaseUrl;
      const hasKey = backendConfig.provider === "nhost" || backendConfig.publicAuthToken.length > 0;
      
      if (url && hasKey) {
        updateTest('Environment Config', { 
          status: 'success', 
          message: `URL: ${url.substring(0, 30)}...` 
        });
      } else {
        updateTest('Environment Config', { 
          status: 'error', 
          message: 'Missing URL or Key' 
        });
      }
    } catch (e: any) {
      updateTest('Environment Config', { 
        status: 'error', 
        message: e.message 
      });
    }

    // Test 2: Health Check (No Auth)
    updateTest('Health Check', { status: 'running' });
    const healthUrl = buildFunctionRouteUrl(EDGE_FUNCTIONS.MAIN_SERVER, "/health");
    const healthStart = Date.now();
    
    try {
      const response = await fetch(healthUrl);
      const duration = Date.now() - healthStart;
      const data = await response.json();
      
      if (response.ok) {
        updateTest('Health Check', { 
          status: 'success', 
          message: `Status: ${data.status} (${duration}ms)`,
          duration 
        });
      } else {
        updateTest('Health Check', { 
          status: 'error', 
          message: `HTTP ${response.status}: ${JSON.stringify(data)}` 
        });
      }
    } catch (e: any) {
      const duration = Date.now() - healthStart;
      updateTest('Health Check', { 
        status: 'error', 
        message: `${e.message} (after ${duration}ms)`,
        duration 
      });
    }

    // Test 3: Auth Token
    updateTest('Auth Token', { status: 'running' });
    try {
      const token = await getAuthToken();
      
      if (token) {
        const tokenPreview = token.substring(0, 20) + '...';
        updateTest('Auth Token', { 
          status: 'success', 
          message: `Token: ${tokenPreview}` 
        });

        // Test 4: Projects API (With Auth)
        updateTest('Projects API', { status: 'running' });
        const projectsUrl = buildFunctionRouteUrl(EDGE_FUNCTIONS.MAIN_SERVER, "/projects");
        const projectsStart = Date.now();
        
        try {
          const response = await fetch(projectsUrl, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          const duration = Date.now() - projectsStart;
          const data = await response.json();
          
          if (response.ok) {
            const projectCount = data.projects?.length || 0;
            updateTest('Projects API', { 
              status: 'success', 
              message: `${projectCount} projects found (${duration}ms)`,
              duration 
            });
          } else {
            updateTest('Projects API', { 
              status: 'error', 
              message: `HTTP ${response.status}: ${JSON.stringify(data)}` 
            });
          }
        } catch (e: any) {
          const duration = Date.now() - projectsStart;
          updateTest('Projects API', { 
            status: 'error', 
            message: `${e.message} (after ${duration}ms)`,
            duration 
          });
        }
      } else {
        updateTest('Auth Token', { 
          status: 'error', 
          message: 'No session found - please log in' 
        });
      }
    } catch (e: any) {
      updateTest('Auth Token', { 
        status: 'error', 
        message: e.message 
      });
    }

    setRunning(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold">API Connection Test</h1>
          <p className="text-muted-foreground mt-2">
            Diagnose API connection issues
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Connection Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button 
              onClick={runTests} 
              disabled={running}
              className="w-full"
            >
              {running ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Tests...
                </>
              ) : (
                'Run All Tests'
              )}
            </Button>

            {tests.length > 0 && (
              <div className="space-y-3 mt-6">
                {tests.map((test) => (
                  <div 
                    key={test.name}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card"
                  >
                    <div className="mt-0.5">
                      {getStatusIcon(test.status)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium">{test.name}</div>
                      {test.message && (
                        <div className="text-sm text-muted-foreground mt-1 font-mono whitespace-pre-wrap break-all">
                          {test.message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {tests.length === 0 && !running && (
              <div className="text-center py-8 text-muted-foreground">
                Click "Run All Tests" to diagnose connection issues
              </div>
            )}
          </CardContent>
        </Card>

        {/* Backend Function Debug Panel */}
        <EdgeFunctionDebugPanel />

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm font-mono">
            <div>
              <span className="text-muted-foreground">Base URL:</span>
              <div className="break-all">{backendConfig.functionsBaseUrl}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Backend Provider:</span>
              <div>{backendConfig.provider}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Full URL:</span>
              <div className="break-all">
                {buildFunctionRouteUrl(EDGE_FUNCTIONS.MAIN_SERVER)}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
