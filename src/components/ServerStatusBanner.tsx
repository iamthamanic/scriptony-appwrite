import { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "./ui/alert";
import { Button } from "./ui/button";
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../lib/api-gateway";

export function ServerStatusBanner() {
  // Disabled: the backend now exposes per-function health checks instead of one central endpoint.
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'hidden'>('hidden');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Health check disabled for the provider-neutral multi-function backend.
    return;
    
    // // Verzögerter Health Check (gibt dem Server Zeit zum Cold Start)
    // const timer = setTimeout(() => {
    //   checkServerStatus();
    // }, 2000); // 2s Verzögerung
    // 
    // return () => clearTimeout(timer);
  }, []);

  const checkServerStatus = async () => {
    const healthUrl = buildFunctionRouteUrl(EDGE_FUNCTIONS.MAIN_SERVER, "/health");
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout (für Cold Start)
      
      const response = await fetch(healthUrl, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setStatus('online');
        // Auto-hide after 3 seconds if online
        setTimeout(() => setStatus('hidden'), 3000);
      } else {
        setStatus('offline');
      }
    } catch (error) {
      console.error('[Server Status] Health check failed:', error);
      setStatus('offline');
    }
  };

  if (status === 'hidden') {
    return null;
  }

  if (status === 'checking') {
    return (
      <Alert className="m-4 border-blue-500 bg-blue-50 dark:bg-blue-950">
        <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        <AlertDescription className="ml-2">
          Prüfe Backend-Verbindung...
        </AlertDescription>
      </Alert>
    );
  }

  if (status === 'online') {
    return (
      <Alert className="m-4 border-green-500 bg-green-50 dark:bg-green-950">
        <CheckCircle2 className="h-4 w-4 text-green-500" />
        <AlertDescription className="ml-2">
          ✅ Backend ist online und bereit!
        </AlertDescription>
      </Alert>
    );
  }

  // Offline
  return (
    <Alert className="m-4 border-destructive bg-destructive/10">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="ml-2 flex-1">
        <div className="space-y-3">
          <div>
            <strong className="font-semibold">Server nicht erreichbar</strong>
            <p className="text-sm mt-1">
              Die Backend Function ist nicht deployed oder offline.
            </p>
          </div>

          {!showDetails ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(true)}
              className="gap-2"
            >
              Wie behebe ich das?
            </Button>
          ) : (
            <div className="space-y-3 text-sm">
              <div className="bg-card p-3 rounded-lg border">
                <h4 className="font-semibold mb-2">📋 Schnelle Lösung:</h4>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Öffne dein Backend-Dashboard</li>
                  <li>Gehe zu Functions</li>
                  <li>Deploye die Function "make-server-3b52693b"</li>
                  <li>Lade diese Seite neu</li>
                </ol>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => window.open('https://cloud.appwrite.io', '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Backend Dashboard öffnen
                </Button>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // Open the quick solution guide
                    const link = document.createElement('a');
                    link.href = '/SERVER_OFFLINE_LÖSUNG.md';
                    link.target = '_blank';
                    link.click();
                  }}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  📋 Lösung lesen
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={checkServerStatus}
                  className="gap-2"
                >
                  🔄 Erneut prüfen
                </Button>
              </div>

              <details className="bg-muted/50 p-3 rounded-lg">
                <summary className="cursor-pointer font-semibold">
                  🔍 Technische Details
                </summary>
                <div className="mt-2 space-y-1 font-mono text-xs">
                  <div>
                    <span className="text-muted-foreground">URL:</span>
                    <div className="break-all">
                      {buildFunctionRouteUrl(EDGE_FUNCTIONS.MAIN_SERVER)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Function Name:</span>
                    <div>Multi-Function (scriptony-*)</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="text-destructive">❌ Offline / Not Deployed</div>
                  </div>
                </div>
              </details>
            </div>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}
