import { useState, useEffect } from "react";
import {
  Users,
  Building2,
  Film,
  Globe as GlobeIcon,
  Activity,
  Search,
  Database,
  Loader2,
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
import { toast } from "sonner@2.0.3";
import { useAuth } from "../../hooks/useAuth";
import { apiGateway } from "../../lib/api-gateway";

interface SuperadminPageProps {
  onNavigate?: (page: string) => void;
}

interface Stats {
  totalUsers: number;
  totalOrganizations: number;
  totalProjects: number;
  totalWorlds: number;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  lastSignIn: string | null;
  createdAt: string;
  emailConfirmed: boolean;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerEmail: string;
  memberCount: number;
  projectCount: number;
  worldCount: number;
  createdAt: string;
}

interface Analytics {
  totalEvents: number;
  activeUsers24h: number;
  activeUsers7d: number;
  activeOrganizations: number;
}

export function SuperadminPage({ onNavigate }: SuperadminPageProps) {
  const { getAccessToken } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [orgsLoading, setOrgsLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load stats on mount
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Nicht authentifiziert");
      }

      const data = await apiGateway({
        method: "GET",
        route: "/superadmin/stats",
        accessToken: token,
      });

      setStats(data.stats);
    } catch (error: any) {
      console.error("Error loading stats:", error);
      toast.error(`Fehler beim Laden der Statistiken: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Nicht authentifiziert");
      }

      const data = await apiGateway({
        method: "GET",
        route: "/superadmin/users",
        accessToken: token,
      });

      setUsers(data.users);
    } catch (error: any) {
      console.error("Error loading users:", error);
      toast.error(`Fehler beim Laden der Nutzer: ${error.message}`);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadOrganizations = async () => {
    try {
      setOrgsLoading(true);
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Nicht authentifiziert");
      }

      const data = await apiGateway({
        method: "GET",
        route: "/superadmin/organizations",
        accessToken: token,
      });

      setOrganizations(data.organizations);
    } catch (error: any) {
      console.error("Error loading organizations:", error);
      toast.error(`Fehler beim Laden der Organisationen: ${error.message}`);
    } finally {
      setOrgsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const token = await getAccessToken();

      if (!token) {
        throw new Error("Nicht authentifiziert");
      }

      const data = await apiGateway({
        method: "GET",
        route: "/superadmin/analytics",
        accessToken: token,
      });

      setAnalytics(data.analytics);
    } catch (error: any) {
      console.error("Error loading analytics:", error);
      toast.error(`Fehler beim Laden der Analytics: ${error.message}`);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Filter users by search query
  const filteredUsers = users.filter(
    (user) =>
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.id.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 pb-24 md:pb-8">
      <div className="mb-8">
        <p className="text-muted-foreground">
          Plattformweite Übersicht und Steuerung
        </p>
      </div>

      <Tabs defaultValue="dashboard">
        <TabsList>
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger
            value="users"
            onClick={() => users.length === 0 && loadUsers()}
          >
            Nutzer
          </TabsTrigger>
          <TabsTrigger
            value="orgs"
            onClick={() => organizations.length === 0 && loadOrganizations()}
          >
            Organisationen
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            onClick={() => !analytics && loadAnalytics()}
          >
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6 space-y-6">
          {/* KPI Cards */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : stats ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Users className="size-4" />
                      Nutzer gesamt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">
                      {stats.totalUsers.toLocaleString("de-DE")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Alle registrierten Nutzer
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Building2 className="size-4" />
                      Organisationen gesamt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">
                      {stats.totalOrganizations.toLocaleString("de-DE")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Aktive Workspaces
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Film className="size-4" />
                      Aktive Projekte
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">
                      {stats.totalProjects.toLocaleString("de-DE")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Über alle Nutzer
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <GlobeIcon className="size-4" />
                      Aktive Welten
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">
                      {stats.totalWorlds.toLocaleString("de-DE")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Über alle Nutzer
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Schnellaktionen</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-4">
                  <Button variant="secondary" onClick={() => loadUsers()}>
                    Nutzer laden
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => loadOrganizations()}
                  >
                    Organisationen laden
                  </Button>
                  <Button variant="secondary" onClick={() => loadAnalytics()}>
                    Analytics laden
                  </Button>
                  <Button
                    variant="default"
                    className="bg-primary"
                    onClick={() => onNavigate?.("migration")}
                  >
                    <Database className="size-4 mr-2" />
                    PostgreSQL Migration
                  </Button>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Keine Daten verfügbar</p>
                <Button onClick={loadStats} className="mt-4">
                  Erneut versuchen
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-6 space-y-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Nutzer-ID oder E-Mail eingeben"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={loadUsers} disabled={usersLoading}>
              {usersLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Lädt...
                </>
              ) : (
                "Aktualisieren"
              )}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Nutzerverwaltung</CardTitle>
              <CardDescription>
                {filteredUsers.length}{" "}
                {filteredUsers.length === 1 ? "Nutzer" : "Nutzer"}
                {searchQuery && ` (gefiltert)`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery
                    ? "Keine Nutzer gefunden"
                    : "Keine Nutzer vorhanden"}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nutzer-ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>E-Mail</TableHead>
                        <TableHead>Rolle</TableHead>
                        <TableHead>Letzter Login</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-mono text-sm">
                            {user.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                user.role === "superadmin"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.lastSignIn
                              ? new Date(user.lastSignIn).toLocaleDateString(
                                  "de-DE",
                                  {
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "Nie"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                user.emailConfirmed
                                  ? "bg-green-500"
                                  : "bg-yellow-500"
                              }
                            >
                              {user.emailConfirmed ? "Aktiv" : "Pending"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organizations Tab */}
        <TabsContent value="orgs" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <CardDescription>
              {organizations.length}{" "}
              {organizations.length === 1 ? "Organisation" : "Organisationen"}
            </CardDescription>
            <Button onClick={loadOrganizations} disabled={orgsLoading}>
              {orgsLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Lädt...
                </>
              ) : (
                "Aktualisieren"
              )}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Organisationen</CardTitle>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="size-8 animate-spin text-primary" />
                </div>
              ) : organizations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Keine Organisationen vorhanden
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Org-ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Owner</TableHead>
                        <TableHead>Mitglieder</TableHead>
                        <TableHead>Projekte</TableHead>
                        <TableHead>Welten</TableHead>
                        <TableHead>Erstellt</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {organizations.map((org) => (
                        <TableRow key={org.id}>
                          <TableCell className="font-mono text-sm">
                            {org.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>{org.name}</TableCell>
                          <TableCell>{org.ownerEmail}</TableCell>
                          <TableCell>{org.memberCount}</TableCell>
                          <TableCell>{org.projectCount}</TableCell>
                          <TableCell>{org.worldCount}</TableCell>
                          <TableCell>
                            {new Date(org.createdAt).toLocaleDateString(
                              "de-DE",
                              {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                              },
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="mt-6 space-y-6">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
          ) : analytics ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Total Events</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">
                      {analytics.totalEvents.toLocaleString("de-DE")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Event-Tracking nicht implementiert
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Nutzer aktiv (24h)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">
                      {analytics.activeUsers24h.toLocaleString("de-DE")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Letztes Sign-In
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Nutzer aktiv (7 Tage)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">
                      {analytics.activeUsers7d.toLocaleString("de-DE")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Letztes Sign-In
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Organisationen aktiv
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-bold">
                      {analytics.activeOrganizations.toLocaleString("de-DE")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Letzte 7 Tage
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end">
                <Button onClick={loadAnalytics}>
                  <Activity className="size-4 mr-2" />
                  Aktualisieren
                </Button>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Analytics-Daten nicht verfügbar
                </p>
                <Button onClick={loadAnalytics} className="mt-4">
                  Laden
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
