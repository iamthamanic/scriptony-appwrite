import { useState } from "react";
import {
  LineChart,
  Bug,
  Activity,
  Users,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Database,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Badge } from "../ui/badge";
import { Input } from "../ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { backendConfig } from "../../lib/env";
import { buildFunctionRouteUrl, EDGE_FUNCTIONS } from "../../lib/api-gateway";

export function AdminPage() {
  const [selectedTab, setSelectedTab] = useState("overview");
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculateResult, setRecalculateResult] = useState<string | null>(
    null,
  );

  const handleRecalculateWordCounts = async () => {
    setIsRecalculating(true);
    setRecalculateResult(null);

    try {
      // Get all book projects
      const response = await fetch(
        buildFunctionRouteUrl(EDGE_FUNCTIONS.MAIN_SERVER, "/projects"),
        {
          headers: backendConfig.publicAuthToken
            ? { Authorization: `Bearer ${backendConfig.publicAuthToken}` }
            : undefined,
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch projects");
      }

      const projects = await response.json();
      const bookProjects = projects.filter((p: any) => p.type === "book");

      let totalUpdated = 0;

      // Recalculate word counts for each book project
      for (const project of bookProjects) {
        const recalcResponse = await fetch(
          buildFunctionRouteUrl(
            EDGE_FUNCTIONS.MAIN_SERVER,
            `/projects/${project.id}/recalculate-word-counts`,
          ),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(backendConfig.publicAuthToken
                ? { Authorization: `Bearer ${backendConfig.publicAuthToken}` }
                : {}),
            },
          },
        );

        if (recalcResponse.ok) {
          const result = await recalcResponse.json();
          totalUpdated += result.updated || 0;
        }
      }

      setRecalculateResult(
        `✅ Erfolgreich! ${totalUpdated} Szenen in ${bookProjects.length} Buch-Projekt(en) aktualisiert.`,
      );
    } catch (error: any) {
      console.error("❌ Word count recalculation error:", error);
      setRecalculateResult(`❌ Fehler: ${error.message}`);
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 py-6 bg-gradient-to-b from-primary/5 to-transparent">
        <p className="text-muted-foreground">System-Verwaltung</p>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="px-4">
        <TabsList className="w-full grid grid-cols-3 mb-6">
          <TabsTrigger value="overview" className="text-xs">
            Übersicht
          </TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs">
            Analytics
          </TabsTrigger>
          <TabsTrigger value="tests" className="text-xs">
            Tests
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedTab("analytics")}
            >
              <CardHeader>
                <div className="rounded-lg bg-primary/10 p-3 w-fit mb-3">
                  <LineChart className="size-6 text-primary" />
                </div>
                <CardTitle>Usage Analytics</CardTitle>
                <CardDescription className="mt-2">
                  Überwache die Nutzung der Plattform und analysiere
                  Nutzeraktionen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary">Zu Analytics</Button>
              </CardContent>
            </Card>

            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedTab("tests")}
            >
              <CardHeader>
                <div className="rounded-lg bg-accent/10 p-3 w-fit mb-3">
                  <Bug className="size-6 text-accent" />
                </div>
                <CardTitle>Tests & Debugging</CardTitle>
                <CardDescription className="mt-2">
                  Führe Systemtests durch und überprüfe Debug-Informationen.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="secondary">Zu Tests</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6">
          <div className="space-y-6">
            {/* Filter Bar */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <Input type="date" placeholder="From Date" />
                  <Input type="date" placeholder="To Date" />
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Feature" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="projects">Projects</SelectItem>
                      <SelectItem value="worlds">Worlds</SelectItem>
                      <SelectItem value="gym">Creative Gym</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Action" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="create">Create</SelectItem>
                      <SelectItem value="update">Update</SelectItem>
                      <SelectItem value="delete">Delete</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon">
                      <RefreshCw className="size-4" />
                    </Button>
                    <Button variant="outline" size="icon">
                      <Download className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Total Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold">1,234</p>
                  <p className="text-xs text-muted-foreground">All time</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="size-4" />
                    Last 24 Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold">127</p>
                  <p className="text-xs text-muted-foreground">
                    +12% vs yesterday
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Activity className="size-4" />
                    Last 7 Days
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold">892</p>
                  <p className="text-xs text-muted-foreground">
                    +8% vs last week
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="size-4" />
                    Unique Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-bold">45</p>
                  <p className="text-xs text-muted-foreground">Active users</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] bg-muted/20 rounded-lg flex items-center justify-center">
                  <p className="text-muted-foreground">Chart Placeholder</p>
                </div>
              </CardContent>
            </Card>

            {/* Activity Table */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Feature</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>2025-05-18 14:32</TableCell>
                      <TableCell>user@example.com</TableCell>
                      <TableCell>
                        <Badge>Create</Badge>
                      </TableCell>
                      <TableCell>Projects</TableCell>
                      <TableCell>New project: "My Script"</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2025-05-18 14:28</TableCell>
                      <TableCell>user2@example.com</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Update</Badge>
                      </TableCell>
                      <TableCell>Worlds</TableCell>
                      <TableCell>Updated world: "Silkat"</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>2025-05-18 14:15</TableCell>
                      <TableCell>user@example.com</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Delete</Badge>
                      </TableCell>
                      <TableCell>Projects</TableCell>
                      <TableCell>Deleted scene #5</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tests Tab */}
        <TabsContent value="tests" className="mt-6">
          <div className="space-y-6">
            {/* Test Suites */}
            <Card>
              <CardHeader>
                <CardTitle>Test Suites</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Run</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>Auth-Flow Test</TableCell>
                      <TableCell>
                        <Badge className="bg-green-500">Passed</Badge>
                      </TableCell>
                      <TableCell>2025-05-18 10:00</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Run Again
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Project Creation Test</TableCell>
                      <TableCell>
                        <Badge className="bg-green-500">Passed</Badge>
                      </TableCell>
                      <TableCell>2025-05-18 10:00</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Run Again
                        </Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Upload Test</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Failed</Badge>
                      </TableCell>
                      <TableCell>2025-05-18 10:00</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Run Again
                        </Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Debug Logs */}
            <Card>
              <CardHeader>
                <CardTitle>Debug Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-[300px] overflow-auto">
                  <div>[INFO] 14:32:15 - Server started on port 3000</div>
                  <div>[INFO] 14:32:18 - Database connected</div>
                  <div className="text-yellow-400">
                    [WARN] 14:35:22 - Slow query detected (2.3s)
                  </div>
                  <div>[INFO] 14:40:01 - User logged in: user@example.com</div>
                  <div className="text-red-400">
                    [ERROR] 14:42:33 - Failed to upload file: size limit
                    exceeded
                  </div>
                  <div>[INFO] 14:45:12 - Project created: "My Script"</div>
                </div>
              </CardContent>
            </Card>

            {/* Recalculate Word Counts */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Database className="size-5 text-primary" />
                  <CardTitle>Recalculate Word Counts</CardTitle>
                </div>
                <CardDescription className="mt-2">
                  Berechnet die Wortzahl für alle existierenden Buch-Szenen neu
                  und schreibt sie in die Datenbank.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    onClick={handleRecalculateWordCounts}
                    disabled={isRecalculating}
                    className="w-full"
                  >
                    {isRecalculating ? (
                      <div className="flex items-center">
                        <RefreshCw className="size-4 animate-spin mr-2" />
                        Berechne Word Counts...
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Database className="size-4 mr-2" />
                        Word Counts neu berechnen
                      </div>
                    )}
                  </Button>
                  {recalculateResult && (
                    <div
                      className={`p-3 rounded-lg ${
                        recalculateResult.startsWith("✅")
                          ? "bg-green-500/10 text-green-600 dark:text-green-400"
                          : "bg-red-500/10 text-red-600 dark:text-red-400"
                      }`}
                    >
                      {recalculateResult}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
