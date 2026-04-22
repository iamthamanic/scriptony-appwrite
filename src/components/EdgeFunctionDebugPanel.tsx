/**
 * 🔍 Backend Function Debug Panel
 *
 * Tests connectivity to all backend functions and displays status.
 * Helps diagnose "Failed to fetch" errors.
 */

import { useState } from "react";
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { EDGE_FUNCTIONS, buildFunctionRouteUrl } from "../lib/api-gateway";
import { backendConfig } from "../lib/env";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible";

interface FunctionStatus {
  name: string;
  status: "pending" | "success" | "error" | "not-deployed";
  responseTime?: number;
  error?: string;
  response?: any;
}

export function EdgeFunctionDebugPanel() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<FunctionStatus[]>([]);
  const [expandedFunctions, setExpandedFunctions] = useState<Set<string>>(
    new Set(),
  );

  const testFunction = async (name: string): Promise<FunctionStatus> => {
    const url = buildFunctionRouteUrl(name, "/health");
    const startTime = Date.now();

    try {
      console.log(`[Debug] Testing ${name} at ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          ...(backendConfig.publicAuthToken
            ? { Authorization: `Bearer ${backendConfig.publicAuthToken}` }
            : {}),
        },
        // Add timeout
        signal: AbortSignal.timeout(10000), // 10 second timeout
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        if (response.status === 404) {
          return {
            name,
            status: "not-deployed",
            responseTime,
            error: "Function not deployed or /health endpoint missing",
          };
        }

        const errorText = await response.text();
        return {
          name,
          status: "error",
          responseTime,
          error: `HTTP ${response.status}: ${errorText}`,
        };
      }

      const data = await response.json();

      return {
        name,
        status: "success",
        responseTime,
        response: data,
      };
    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // Detect specific error types
      let errorMessage = error.message;
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        errorMessage =
          "Request timeout (>10s) - function might be cold starting or not responding";
      } else if (
        error.message.includes("Failed to fetch") ||
        error.message.includes("NetworkError")
      ) {
        errorMessage =
          "Network error - CORS issue, function not deployed, or network blocked";
      }

      return {
        name,
        status: "error",
        responseTime,
        error: errorMessage,
      };
    }
  };

  const testAllFunctions = async () => {
    setTesting(true);
    setResults([]);

    const functionsToTest = Object.values(EDGE_FUNCTIONS);

    // Test all functions in parallel
    const promises = functionsToTest.map((name) => testFunction(name));
    const allResults = await Promise.all(promises);

    setResults(allResults);
    setTesting(false);
  };

  const toggleExpanded = (name: string) => {
    const next = new Set(expandedFunctions);
    if (next.has(name)) {
      next.delete(name);
    } else {
      next.add(name);
    }
    setExpandedFunctions(next);
  };

  const getStatusIcon = (status: FunctionStatus["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="size-4 text-green-600" />;
      case "error":
        return <XCircle className="size-4 text-red-600" />;
      case "not-deployed":
        return <AlertCircle className="size-4 text-orange-600" />;
      default:
        return (
          <div className="size-4 rounded-full border-2 border-gray-300 animate-pulse" />
        );
    }
  };

  const getStatusBadge = (status: FunctionStatus["status"]) => {
    switch (status) {
      case "success":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            OK
          </Badge>
        );
      case "error":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            Error
          </Badge>
        );
      case "not-deployed":
        return (
          <Badge className="bg-orange-100 text-orange-800 border-orange-200">
            Not Deployed
          </Badge>
        );
      default:
        return (
          <Badge className="bg-gray-100 text-gray-800 border-gray-200">
            Testing...
          </Badge>
        );
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">
              Backend Function Connectivity Test
            </h3>
            <p className="text-sm text-muted-foreground">
              Test all backend functions to diagnose connectivity errors
            </p>
          </div>
          <Button onClick={testAllFunctions} disabled={testing} size="sm">
            {testing ? (
              <>
                <RefreshCw className="size-4 mr-2 animate-spin" />
                Testing...
              </>
            ) : (
              <>
                <RefreshCw className="size-4 mr-2" />
                Test All
              </>
            )}
          </Button>
        </div>

        {/* Project Info */}
        <div className="p-3 bg-muted/50 rounded-lg text-sm">
          <div className="font-medium mb-1">Project Configuration:</div>
          <div className="text-muted-foreground space-y-1">
            <div>
              Provider:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded">
                {backendConfig.provider}
              </code>
            </div>
            <div>
              Base URL:{" "}
              <code className="text-xs bg-muted px-1 py-0.5 rounded break-all">
                {backendConfig.functionsBaseUrl || "(unset)"}
              </code>
            </div>
            {backendConfig.functionDomainMap && (
              <div className="break-all">
                Domain map:{" "}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {Object.keys(backendConfig.functionDomainMap).join(", ")}
                </code>
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Test Results:</div>

            {/* Summary */}
            <div className="flex gap-2 text-sm">
              <Badge className="bg-green-100 text-green-800 border-green-200">
                ✓ {results.filter((r) => r.status === "success").length} OK
              </Badge>
              <Badge className="bg-red-100 text-red-800 border-red-200">
                ✗ {results.filter((r) => r.status === "error").length} Error
              </Badge>
              <Badge className="bg-orange-100 text-orange-800 border-orange-200">
                ! {results.filter((r) => r.status === "not-deployed").length}{" "}
                Not Deployed
              </Badge>
            </div>

            {/* Individual Results */}
            <div className="space-y-2 mt-4">
              {results.map((result) => {
                const isExpanded = expandedFunctions.has(result.name);

                return (
                  <Collapsible
                    key={result.name}
                    open={isExpanded}
                    onOpenChange={() => toggleExpanded(result.name)}
                  >
                    <div className="border rounded-lg">
                      <CollapsibleTrigger asChild>
                        <button className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(result.status)}
                            <code className="text-sm font-mono">
                              {result.name}
                            </code>
                            {result.responseTime && (
                              <span className="text-xs text-muted-foreground">
                                {result.responseTime}ms
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(result.status)}
                            {isExpanded ? (
                              <ChevronDown className="size-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="size-4 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t p-3 bg-muted/30 text-sm">
                          {result.status === "success" && result.response && (
                            <div className="space-y-2">
                              <div className="font-medium text-green-700">
                                ✓ Function is responding correctly
                              </div>
                              <div className="text-xs">
                                <div className="font-medium text-muted-foreground mb-1">
                                  Health Response:
                                </div>
                                <pre className="bg-muted p-2 rounded overflow-x-auto">
                                  {JSON.stringify(result.response, null, 2)}
                                </pre>
                              </div>
                            </div>
                          )}

                          {result.status === "error" && (
                            <div className="space-y-2">
                              <div className="font-medium text-red-700">
                                ✗ Function Error
                              </div>
                              <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                {result.error}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                <strong>Possible causes:</strong>
                                <ul className="list-disc list-inside mt-1 space-y-1">
                                  <li>
                                    Function not deployed in Supabase Dashboard
                                  </li>
                                  <li>CORS configuration issue</li>
                                  <li>Function crashed or has runtime error</li>
                                  <li>Network/firewall blocking requests</li>
                                </ul>
                              </div>
                            </div>
                          )}

                          {result.status === "not-deployed" && (
                            <div className="space-y-2">
                              <div className="font-medium text-orange-700">
                                ! Function Not Deployed
                              </div>
                              <div className="text-xs text-muted-foreground">
                                This function needs to be deployed in the
                                Supabase Dashboard.
                              </div>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>
          </div>
        )}

        {/* Help Text */}
        {!testing && results.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Click "Test All" to check connectivity to all backend functions
          </div>
        )}
      </div>
    </Card>
  );
}
