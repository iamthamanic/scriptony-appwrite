/**
 * 🔍 API DEBUG PAGE - Backend Function Testing
 * 
 * Tests backend functions individually to see which ones work.
 */

import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { getAuthToken } from '../../lib/auth/getAuthToken';
import { backendConfig } from '../../lib/env';
import { buildFunctionRouteUrl } from '../../lib/api-gateway';

interface TestResult {
  name: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  message?: string;
  url?: string;
  responseTime?: number;
}

const BACKEND_FUNCTIONS = [
  { name: 'scriptony-auth', route: '/storage/usage' },
  { name: 'scriptony-projects', route: '/projects' },
  { name: 'scriptony-project-nodes', route: '/nodes?project_id=debug-project' },
  { name: 'scriptony-worldbuilding', route: '/worlds' },
  { name: 'scriptony-ai', route: '/ai/models' },
  { name: 'scriptony-gym', route: '/categories' },
  { name: 'scriptony-superadmin', route: '/superadmin/stats' },
];

export function ApiDebugPage() {
  const [results, setResults] = useState<TestResult[]>(
    BACKEND_FUNCTIONS.map(fn => ({ name: fn.name, status: 'idle' as const }))
  );
  const [authToken, setAuthToken] = useState<string | null>(null);

  const testFunction = async (index: number) => {
    const fn = BACKEND_FUNCTIONS[index];
    
    // Update status to loading
    setResults(prev => prev.map((r, i) => 
      i === index ? { ...r, status: 'loading' as const } : r
    ));

    const startTime = Date.now();
    const url = buildFunctionRouteUrl(fn.name, fn.route);

    try {
      console.log(`[DEBUG] Testing ${fn.name} at ${url}`);

      // Get auth token
      let token = authToken;
      if (!token) {
        token = await getAuthToken();
        if (token) setAuthToken(token);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token || backendConfig.publicAuthToken
            ? { 'Authorization': `Bearer ${token || backendConfig.publicAuthToken}` }
            : {}),
        },
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[DEBUG] ${fn.name} Error:`, errorText);
        setResults(prev => prev.map((r, i) => 
          i === index ? {
            ...r,
            status: 'error' as const,
            message: `${response.status} ${response.statusText}: ${errorText.substring(0, 100)}`,
            url,
            responseTime,
          } : r
        ));
        return;
      }

      const data = await response.json();
      console.log(`[DEBUG] ${fn.name} Success:`, data);
      
      setResults(prev => prev.map((r, i) => 
        i === index ? {
          ...r,
          status: 'success' as const,
          message: 'OK',
          url,
          responseTime,
        } : r
      ));
    } catch (error: any) {
      console.error(`[DEBUG] ${fn.name} Network Error:`, error);
      setResults(prev => prev.map((r, i) => 
        i === index ? {
          ...r,
          status: 'error' as const,
          message: `Network Error: ${error.message}`,
          url,
          responseTime: Date.now() - startTime,
        } : r
      ));
    }
  };

  const testAll = async () => {
    for (let i = 0; i < BACKEND_FUNCTIONS.length; i++) {
      await testFunction(i);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-400" />;
    }
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const avgResponseTime = results
    .filter(r => r.responseTime !== undefined)
    .reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.filter(r => r.responseTime).length;

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="mb-2">🔍 Backend Functions Debug Test</h1>
        <p className="text-muted-foreground">
          Test the configured backend functions individually to diagnose connection issues
        </p>
      </div>

      {/* Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Test Summary</CardTitle>
          <CardDescription>
            Overall status of all backend functions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-muted-foreground">Success</div>
              <div className="text-2xl text-green-600">{successCount}/7</div>
            </div>
            <div>
              <div className="text-muted-foreground">Errors</div>
              <div className="text-2xl text-red-600">{errorCount}/7</div>
            </div>
            <div>
              <div className="text-muted-foreground">Avg Response Time</div>
              <div className="text-2xl">
                {avgResponseTime > 0 ? `${avgResponseTime.toFixed(0)}ms` : '-'}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={testAll} className="w-full">
              🚀 Test All Functions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Individual Results */}
      <div className="space-y-3">
        {results.map((result, index) => (
          <Card key={result.name}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(result.status)}
                    <div>
                      <div className="font-medium">{result.name}</div>
                      {result.url && (
                        <div className="text-xs text-muted-foreground">
                        GET {BACKEND_FUNCTIONS[index].route}
                        </div>
                      )}
                    </div>
                </div>

                <div className="flex items-center gap-3">
                  {result.responseTime !== undefined && (
                    <Badge variant="outline">
                      {result.responseTime}ms
                    </Badge>
                  )}
                  {result.status === 'idle' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testFunction(index)}
                    >
                      Test
                    </Button>
                  )}
                  {result.status === 'error' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testFunction(index)}
                    >
                      Retry
                    </Button>
                  )}
                </div>
              </div>

              {result.message && (
                <div className={`mt-2 text-sm ${
                  result.status === 'error' ? 'text-red-600' : 'text-green-600'
                }`}>
                  {result.message}
                </div>
              )}

              {result.url && (
                <div className="mt-2 text-xs text-muted-foreground font-mono break-all">
                  {result.url}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>💡 How to Fix Errors</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div>
            <strong>If all tests fail:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
              <li>Check your internet connection</li>
              <li>Check if Supabase project is online</li>
              <li>Check browser console for CORS errors</li>
            </ul>
          </div>
          <div>
            <strong>If specific functions fail:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
              <li>Check the deployed backend functions in your active provider dashboard</li>
              <li>Check if the function is deployed</li>
              <li>Check function logs for errors</li>
              <li>Redeploy the function if needed</li>
            </ul>
          </div>
          <div>
            <strong>Expected Result:</strong>
            <ul className="list-disc list-inside ml-4 mt-1 text-muted-foreground">
              <li>All 7 functions should return 200 OK</li>
              <li>Response time should be {"<"} 2000ms</li>
              <li>No "Network Error" or "Failed to fetch" errors</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
