import { useState, useEffect } from "react";
import { User, CreditCard, Shield, Key, Bot, Globe, LogOut, Moon, Sun, Copy, Trash2, ImageIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Switch } from "../ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "../../hooks/useTranslation";
import { toast } from "sonner@2.0.3";
import { apiGet, apiPost, apiDelete, unwrapApiResult } from "../../lib/api-client";
import { StorageSettingsSection } from "../StorageSettingsSection";
import { AISettingsForm } from "../ai/AISettingsForm";
import {
  isImageWebpConversionEnabled,
  setImageWebpConversionEnabled,
} from "../../lib/image-upload-prep";

export function SettingsPage() {
  const { user, signOut, updateProfile } = useAuth();
  const { language, setLanguage, t } = useTranslation();
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [theme, setThemeState] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("theme");
    if (saved === "dark" || saved === "light") return saved;
    return "light";
  });
  const isDemoMode = localStorage.getItem("scriptony_demo_mode") === "true";

  const [losslessWebpUpload, setLosslessWebpUpload] = useState(() =>
    isImageWebpConversionEnabled()
  );

  // Integration tokens (for external tools: Blender/ComfyUI etc.)
  const [integrationTokens, setIntegrationTokens] = useState<Array<{ id: string; name: string; created_at: string }>>([]);
  const [integrationTokensLoading, setIntegrationTokensLoading] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [createdTokenOneTime, setCreatedTokenOneTime] = useState<string | null>(null);

  const loadIntegrationTokens = async () => {
    if (!user || isDemoMode) return;
    setIntegrationTokensLoading(true);
    try {
      const result = await apiGet<{ tokens: Array<{ id: string; name: string; created_at: string }> }>("/integration-tokens");
      const data = unwrapApiResult(result);
      setIntegrationTokens(data?.tokens ?? []);
    } catch (error) {
      console.error("Error loading integration tokens:", error);
      toast.error("Token-Liste konnte nicht geladen werden.");
    } finally {
      setIntegrationTokensLoading(false);
    }
  };

  useEffect(() => {
    if (user && !isDemoMode) {
      loadIntegrationTokens();
    }
  }, [user, isDemoMode]);

  const handleSaveProfile = async () => {
    try {
      if (isDemoMode) {
        toast.success(t("common.success"), {
          description: "Demo Mode: Änderungen werden nicht gespeichert",
        });
        return;
      }
      
      await updateProfile({ name });
      toast.success(t("common.success"), {
        description: "Profil erfolgreich aktualisiert",
      });
    } catch (error) {
      toast.error(t("common.error"), {
        description: "Fehler beim Aktualisieren des Profils",
      });
    }
  };

  const handleLogout = async () => {
    try {
      // If in demo mode, just clear and reload
      if (isDemoMode) {
        localStorage.removeItem("scriptony_demo_mode");
        window.location.reload();
        return;
      }
      
      await signOut();
      toast.success(t("auth.logoutSuccess"));
    } catch (error) {
      toast.error(t("common.error"));
    }
  };

  const handleThemeChange = (newTheme: "light" | "dark") => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 py-6 bg-gradient-to-b from-primary/5 to-transparent">

      </div>

      <Tabs defaultValue="profile" className="w-full px-4">
        <TabsList className="w-full flex flex-wrap gap-2 mb-6 h-auto min-h-9">
          <TabsTrigger value="profile" className="text-xs flex-none">{t("settings.profile")}</TabsTrigger>
          <TabsTrigger value="preferences" className="text-xs flex-none">Präferenzen</TabsTrigger>
          <TabsTrigger value="subscription" className="text-xs flex-none">Abo</TabsTrigger>
          <TabsTrigger value="security" className="text-xs flex-none">Sicherheit</TabsTrigger>
          <TabsTrigger value="storage" className="text-xs flex-none">Speicher</TabsTrigger>
          <TabsTrigger value="integrations" className="text-xs flex-none">Integrationen</TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          {isDemoMode && (
            <Card className="border-accent bg-accent/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🎭</div>
                  <div>
                    <p className="text-sm font-medium">Demo Mode aktiv</p>
                    <p className="text-xs text-muted-foreground">
                      Du nutzt die App ohne Authentifizierung. Daten werden nicht gespeichert.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">{t("settings.profile")}</CardTitle>
              <CardDescription className="text-xs">Deine persönlichen Informationen</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="size-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
                  <User className="size-8" />
                </div>
                <Button variant="secondary" size="sm" className="h-9">Avatar ändern</Button>
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm">{t("auth.name")}</Label>
                <Input 
                  id="name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11" 
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">{t("auth.email")}</Label>
                <Input id="email" value={user?.email} disabled className="bg-muted h-11" />
                <p className="text-xs text-muted-foreground">Kann nicht geändert werden</p>
              </div>

              <Button onClick={handleSaveProfile} className="w-full h-11">{t("common.save")}</Button>
            </CardContent>
          </Card>

          {/* Logout */}
          <Button 
            onClick={handleLogout}
            variant="destructive" 
            className="w-full h-11"
          >
            <LogOut className="size-4 mr-2" />
            {isDemoMode ? "Demo Mode beenden" : t("auth.logout")}
          </Button>
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="size-4" />
                {t("settings.language")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Select value={language} onValueChange={(val: "de" | "en") => setLanguage(val)}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="de">🇩🇪 Deutsch</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base flex items-center gap-2">
                {theme === "dark" ? <Moon className="size-4" /> : <Sun className="size-4" />}
                {t("settings.theme")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  onClick={() => handleThemeChange("light")}
                  className="h-11"
                >
                  <Sun className="size-4 mr-2" />
                  {t("settings.themeLight")}
                </Button>
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  onClick={() => handleThemeChange("dark")}
                  className="h-11"
                >
                  <Moon className="size-4 mr-2" />
                  {t("settings.themeDark")}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base flex items-center gap-2">
                <ImageIcon className="size-4" />
                Bild-Uploads
              </CardTitle>
              <CardDescription className="text-xs">
                JPEG/PNG werden vor dem Upload in verlustfreies WebP gewandelt (kleinere Dateien im Speicher). GIF und
                bestehende WebP bleiben unverändert.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="webp-upload" className="text-sm font-medium">
                    Verlustfreies WebP
                  </Label>
                  <p className="text-xs text-muted-foreground">Standard: ein (empfohlen)</p>
                </div>
                <Switch
                  id="webp-upload"
                  checked={losslessWebpUpload}
                  onCheckedChange={(checked) => {
                    setLosslessWebpUpload(checked);
                    setImageWebpConversionEnabled(checked);
                  }}
                  disabled={isDemoMode}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subscription Tab */}
        <TabsContent value="subscription" className="space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Aktuelles Abo</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-3">
                <div>
                  <h3 className="text-base">Free Plan</h3>
                  <p className="text-xs text-muted-foreground">Kostenlos für immer</p>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>3 Projekte</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>1 Welt</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span>Basic Creative Gym</span>
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="p-4">
              <CardTitle className="text-base flex items-center gap-2">
                <span>Upgrade auf Pro</span>
                <Badge className="text-xs">Empfohlen</Badge>
              </CardTitle>
              <CardDescription className="text-xs">Unbegrenzte Projekte & Features</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="space-y-4">
                <div>
                  <p className="mb-3">€9,99 / Monat</p>
                  <ul className="space-y-2 text-sm mb-4">
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Unbegrenzte Projekte</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Unbegrenzte Welten</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>Premium Creative Gym</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-green-500">✓</span>
                      <span>KI-Integration</span>
                    </li>
                  </ul>
                </div>
                <Button className="w-full h-11">Upgrade</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Passwort ändern</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 pt-0">
              <div className="space-y-2">
                <Label className="text-sm">Altes Passwort</Label>
                <Input type="password" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Neues Passwort</Label>
                <Input type="password" className="h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Neues Passwort wiederholen</Label>
                <Input type="password" className="h-11" />
              </div>
              <Button className="w-full h-11">Passwort ändern</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Zwei-Faktor (2FA)</CardTitle>
              <CardDescription className="text-xs">Zusätzlicher Kontoschutz</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">2FA {twoFactorEnabled ? "Aktiviert" : "Deaktiviert"}</p>
                  <p className="text-xs text-muted-foreground">
                    {twoFactorEnabled ? "Konto geschützt" : "Für mehr Sicherheit"}
                  </p>
                </div>
                <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Login Sessions</CardTitle>
              <CardDescription className="text-xs">Aktive Sitzungen</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Chrome on MacOS</p>
                  <p className="text-xs text-muted-foreground">Heute, 14:32</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0">Aktuell</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Safari on iPhone</p>
                  <p className="text-xs text-muted-foreground">Gestern, 09:15</p>
                </div>
                <Button variant="outline" size="sm" className="shrink-0 h-8 text-xs">Logout</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Speicher Tab – Speicherort (Scriptony Cloud / weitere Anbieter in Kürze) */}
        <TabsContent value="storage" className="space-y-4">
          <StorageSettingsSection />
        </TabsContent>

        {/* Integrationen Tab – API-Tokens für externe Tools (Blender/ComfyUI) */}
        <TabsContent value="integrations" className="space-y-4">
          <Card id="settings-ai-integrations">
            <CardHeader className="p-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Bot className="size-4" />
                KI &amp; LLM
              </CardTitle>
              <CardDescription className="text-xs">
                API-Keys, Provider, Modell und System-Prompt für den Scriptony-Assistant, Creative Gym und weitere KI-Features.
                Dieselben Einstellungen erreichst du im Gym über „KI-Einstellungen öffnen“.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <AISettingsForm embedded active />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Key className="size-4" />
                API-Tokens für externe Tools
              </CardTitle>
              <CardDescription className="text-xs">
                Erzeuge einen Token, um z. B. Blender oder ComfyUI mit Scriptony zu verbinden. Token nur einmal sichtbar – sicher aufbewahren.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-4">
              {isDemoMode ? (
                <p className="text-sm text-muted-foreground">In der Demo-Version können keine Tokens erstellt werden.</p>
              ) : (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Name (z. B. Blender / ComfyUI)"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      className="h-11 flex-1"
                    />
                    <Button
                      className="h-11"
                      onClick={async () => {
                        try {
                          const result = await apiPost<{ id: string; name: string; token: string; created_at: string }>(
                            "/integration-tokens",
                            { name: newTokenName.trim() || "External Tool" }
                          );
                          const data = unwrapApiResult(result);
                          if (data?.token) {
                            setCreatedTokenOneTime(data.token);
                            setNewTokenName("");
                            loadIntegrationTokens();
                            toast.success("Token erstellt. Bitte jetzt kopieren – er wird nicht erneut angezeigt.");
                          }
                        } catch (e) {
                          toast.error("Token konnte nicht erstellt werden.");
                        }
                      }}
                    >
                      Token erzeugen
                    </Button>
                  </div>
                  {createdTokenOneTime && (
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400">Token nur einmal sichtbar – kopieren und sicher speichern:</p>
                      <div className="flex gap-2">
                        <code className="flex-1 break-all text-xs bg-background px-2 py-2 rounded border overflow-x-auto">
                          {createdTokenOneTime}
                        </code>
                        <Button
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => {
                            navigator.clipboard.writeText(createdTokenOneTime);
                            toast.success("Token kopiert.");
                          }}
                        >
                          <Copy className="size-4" />
                        </Button>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => setCreatedTokenOneTime(null)}>Schließen</Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Deine Tokens</CardTitle>
              <CardDescription className="text-xs">Vorhandene Tokens. Widerrufen entfernt den Zugriff sofort.</CardDescription>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {integrationTokensLoading ? (
                <p className="text-sm text-muted-foreground">Lade …</p>
              ) : integrationTokens.length === 0 ? (
                <p className="text-sm text-muted-foreground">Noch keine Tokens. Erzeuge einen oben.</p>
              ) : (
                <ul className="space-y-2">
                  {integrationTokens.map((tok) => (
                    <li
                      key={tok.id}
                      className="flex items-center justify-between p-3 bg-muted rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium">{tok.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Erstellt: {new Date(tok.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive hover:text-destructive shrink-0 h-8"
                        onClick={async () => {
                          try {
                            await apiDelete(`/integration-tokens/${tok.id}`);
                            toast.success("Token wurde widerrufen.");
                            loadIntegrationTokens();
                          } catch {
                            toast.error("Token konnte nicht widerrufen werden.");
                          }
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}