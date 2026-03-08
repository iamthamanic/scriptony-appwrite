/**
 * 🔌 Connection Status Indicator
 * 
 * Shows a small indicator if essential backend functions are not reachable.
 * Helps users immediately see if there's a connectivity problem.
 */

import { useState, useEffect } from 'react';
import { AlertCircle, WifiOff, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { EDGE_FUNCTIONS, buildFunctionRouteUrl } from '../lib/api-gateway';
import { backendConfig } from '../lib/env';

export function ConnectionStatusIndicator() {
  const [status, setStatus] = useState<'checking' | 'ok' | 'error'>('checking');
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    setStatus('checking');
    setErrorDetails(null);

    // Test essential functions
    const essentialFunctions = [
      EDGE_FUNCTIONS.AUTH,
      EDGE_FUNCTIONS.PROJECTS,
      EDGE_FUNCTIONS.PROJECT_NODES,
    ];

    try {
      const results = await Promise.allSettled(
        essentialFunctions.map(async (funcName) => {
          const url = buildFunctionRouteUrl(funcName, '/health');
          
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              ...(backendConfig.publicAuthToken
                ? { 'Authorization': `Bearer ${backendConfig.publicAuthToken}` }
                : {}),
            },
            signal: AbortSignal.timeout(5000), // 5 second timeout
          });

          if (!response.ok) {
            throw new Error(`${funcName}: HTTP ${response.status}`);
          }

          return { funcName, ok: true };
        })
      );

      // Check if any failed
      const failures = results.filter(r => r.status === 'rejected');
      
      if (failures.length > 0) {
        const errors = failures.map((f: any) => f.reason?.message || 'Unknown error').join(', ');
        setStatus('error');
        setErrorDetails(errors);
      } else {
        setStatus('ok');
      }
    } catch (error: any) {
      setStatus('error');
      setErrorDetails(error.message || 'Cannot connect to server');
    }
  };

  // Don't show anything if OK or dismissed
  if (status === 'ok' || dismissed) {
    return null;
  }

  // Checking state - minimal indicator
  if (status === 'checking') {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg px-3 py-2 flex items-center gap-2 text-sm shadow-lg">
          <div className="size-2 rounded-full bg-blue-500 animate-pulse" />
          <span className="text-blue-700 dark:text-blue-300">Verbindung prüfen...</span>
        </div>
      </div>
    );
  }

  // Error state - full alert
  return null;
}