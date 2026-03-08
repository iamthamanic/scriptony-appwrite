import { useState } from "react";
import { Button } from "../ui/button";
import { Card } from "../ui/card";
import { Alert, AlertDescription } from "../ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Database, ArrowRight } from "lucide-react";
import { getAuthToken } from "../../lib/auth/getAuthToken";
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../../lib/api-gateway";

interface MigrationStats {
  organizations: number;
  worlds: number;
  worldCategories: number;
  worldItems: number;
  projects: number;
  episodes: number;
  characters: number;
  scenes: number;
}

interface MigrationResult {
  success: boolean;
  stats: MigrationStats;
  errors: string[];
}

export function MigrationPage() {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [migratingSql, setMigratingSql] = useState(false);
  const [sqlResult, setSqlResult] = useState<{ success: boolean; applied: string[]; errors: string[] } | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  const runMigration = async () => {
    setMigrating(true);
    setError(null);
    setResult(null);

    try {
      // Get auth token
      const token = await getAuthToken();

      if (!token) {
        throw new Error("Nicht eingeloggt. Bitte neu einloggen.");
      }

      console.log("🚀 Starte Migration von KV-Store zu PostgreSQL...");

      // Call migration endpoint
      const response = await fetch(
        buildFunctionRouteUrl(EDGE_FUNCTIONS.MAIN_SERVER, "/migrate"),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setResult(data);
        console.log("✅ Migration erfolgreich!", data.stats);
      } else {
        throw new Error(data.error || "Migration fehlgeschlagen");
      }
    } catch (err: any) {
      console.error("Migration error:", err);
      setError(err.message || "Unbekannter Fehler");
    } finally {
      setMigrating(false);
    }
  };

  const runSqlMigrations = async () => {
    setMigratingSql(true);
    setSqlError(null);
    setSqlResult(null);

    try {
      // Get auth token
      const token = await getAuthToken();

      if (!token) {
        throw new Error("Nicht eingeloggt. Bitte neu einloggen.");
      }

      console.log("🔄 Running SQL migrations (MCP Tool System)...");

      // Call SQL migration endpoint
      const response = await fetch(
        buildFunctionRouteUrl(EDGE_FUNCTIONS.MAIN_SERVER, "/migrate-sql"),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        setSqlResult(data);
        console.log("✅ SQL Migrations erfolgreich!", data.applied);
      } else {
        throw new Error(data.error || "SQL Migration fehlgeschlagen");
      }
    } catch (err: any) {
      console.error("SQL Migration error:", err);
      setSqlError(err.message || "Unbekannter Fehler");
    } finally {
      setMigratingSql(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Database className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold">PostgreSQL Migration</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Migriere deine Daten vom KV-Store zu PostgreSQL für bessere Performance,
            Multi-Tenancy und professionelle Datenbank-Features.
          </p>
        </div>

        {/* Info Card */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Was wird migriert?</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Alle Projekte</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Alle Szenen</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Alle Charaktere</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Alle Episodes</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Alle Welten</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span>Alle Kategorien & Items</span>
            </div>
          </div>
        </Card>

        {/* Migration Process */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Migration durchführen</h2>
          
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Wichtig:</strong> Stelle sicher, dass das SQL-Schema bereits in
                Supabase ausgeführt wurde. Siehe <code>/START_HERE.md</code> für Details.
              </AlertDescription>
            </Alert>

            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex-1">
                <p className="font-medium">KV-Store</p>
                <p className="text-sm text-muted-foreground">Alte Datenstruktur</p>
              </div>
              <ArrowRight className="w-6 h-6 text-primary" />
              <div className="flex-1">
                <p className="font-medium">PostgreSQL</p>
                <p className="text-sm text-muted-foreground">Neue Datenbank</p>
              </div>
            </div>

            <Button
              onClick={runMigration}
              disabled={migrating || result?.success}
              className="w-full"
              size="lg"
            >
              {migrating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Migriere Daten...
                </>
              ) : result?.success ? (
                <>
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Migration erfolgreich!
                </>
              ) : (
                <>
                  <Database className="w-5 h-5 mr-2" />
                  Migration starten
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Results */}
        {result && (
          <Card className="p-6 border-green-500 bg-green-500/5">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-500 mt-1" />
              <div>
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                  Migration erfolgreich abgeschlossen!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Alle Daten wurden erfolgreich zu PostgreSQL migriert.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {result.stats.organizations}
                </div>
                <div className="text-sm text-muted-foreground">Organizations</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {result.stats.projects}
                </div>
                <div className="text-sm text-muted-foreground">Projekte</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {result.stats.worlds}
                </div>
                <div className="text-sm text-muted-foreground">Welten</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {result.stats.scenes}
                </div>
                <div className="text-sm text-muted-foreground">Szenen</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {result.stats.characters}
                </div>
                <div className="text-sm text-muted-foreground">Characters</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {result.stats.episodes}
                </div>
                <div className="text-sm text-muted-foreground">Episodes</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {result.stats.worldCategories}
                </div>
                <div className="text-sm text-muted-foreground">Kategorien</div>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">
                  {result.stats.worldItems}
                </div>
                <div className="text-sm text-muted-foreground">Items</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <Alert className="mt-4" variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Warnungen:</strong>
                  <ul className="mt-2 space-y-1">
                    {result.errors.slice(0, 5).map((err, i) => (
                      <li key={i} className="text-sm">
                        • {err}
                      </li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-muted-foreground text-center">
                🎉 Reload jetzt die App mit <kbd className="px-2 py-1 bg-muted rounded">F5</kbd>,
                um die neuen Daten zu sehen!
              </p>
            </div>
          </Card>
        )}

        {/* Error */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Fehler:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {/* SQL Migrations (MCP Tool System) */}
        <Card className="p-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Database className="w-5 h-5" />
                SQL Migrations (MCP Tool System)
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Führt SQL Migrations aus für:
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 ml-4">
                <li>• RAG Auto-Sync Queue Tabelle</li>
                <li>• Database Triggers für automatische RAG Updates</li>
                <li>• Tool Call History Tracking</li>
                <li>• MCP Tool System Setup</li>
              </ul>
            </div>

            <Button
              onClick={runSqlMigrations}
              disabled={migratingSql}
              className="w-full"
              variant="secondary"
            >
              {migratingSql ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  SQL Migrations werden ausgeführt...
                </>
              ) : sqlResult?.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  SQL Migrations erfolgreich!
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  SQL Migrations ausführen
                </>
              )}
            </Button>
          </div>

          {/* SQL Migration Results */}
          {sqlResult && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-start gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">SQL Migrations abgeschlossen</p>
                  {sqlResult.applied.length > 0 ? (
                    <>
                      <p className="text-sm text-muted-foreground mt-1">
                        Applied migrations:
                      </p>
                      <ul className="text-sm text-muted-foreground ml-4 mt-1">
                        {sqlResult.applied.map((id, i) => (
                          <li key={i}>✅ {id}</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">
                      Alle Migrations bereits applied
                    </p>
                  )}
                </div>
              </div>

              {sqlResult.errors.length > 0 && (
                <Alert className="mt-2" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Errors:</strong>
                    <ul className="mt-1 space-y-1">
                      {sqlResult.errors.map((err, i) => (
                        <li key={i} className="text-sm">• {err}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* SQL Error */}
          {sqlError && (
            <Alert className="mt-4" variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>SQL Migration Fehler:</strong> {sqlError}
              </AlertDescription>
            </Alert>
          )}
        </Card>
      </div>
    </div>
  );
}
