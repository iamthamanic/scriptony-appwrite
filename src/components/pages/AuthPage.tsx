import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Separator } from "../ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Alert, AlertDescription } from "../ui/alert";
import { useAuth } from "../../hooks/useAuth";
import { useTranslation } from "../../hooks/useTranslation";
import { toast } from "sonner";
import { Loader2, Mail, AlertCircle, Eye, EyeOff } from "lucide-react";
import scriptonyLogo from "../../assets/scriptony-logo.png";

export function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { signIn, resetPassword } = useAuth();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error(t("common.error"), {
        description: "Email und Passwort sind erforderlich",
      });
      return;
    }

    setLoading(true);

    try {
      await signIn(email, password);
      toast.success(t("auth.loginSuccess"));
    } catch (error: any) {
      console.error("Auth error:", error);
      toast.error(t("auth.error"), {
        description: "Passwort oder ID falsch",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!resetEmail) {
      toast.error("Fehler", {
        description: "Bitte E-Mail-Adresse eingeben",
      });
      return;
    }

    setResetLoading(true);

    try {
      await resetPassword(resetEmail);
      setResetSent(true);
      toast.success("E-Mail versendet!", {
        description: "Prüfe deinen Posteingang für den Reset-Link",
      });
    } catch (error: any) {
      console.error("Password reset error:", error);
      toast.error("Fehler", {
        description:
          error.message || "Reset-E-Mail konnte nicht gesendet werden",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-primary/5 to-transparent">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            <img
              src={scriptonyLogo}
              alt="Scriptony Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <CardTitle className="text-2xl">{t("auth.welcome")}</CardTitle>
          <CardDescription>{t("auth.loginSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("auth.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="max@beispiel.de"
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{t("auth.password")}</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs text-primary hover:underline"
                  disabled={loading}
                >
                  Passwort vergessen?
                </button>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={loading}
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-1 rounded"
                  tabIndex={-1}
                  aria-label={
                    showPassword ? "Passwort verbergen" : "Passwort anzeigen"
                  }
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("common.loading")}
                </>
              ) : (
                t("auth.login")
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Forgot Password Dialog */}
      <Dialog open={showForgotPassword} onOpenChange={setShowForgotPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Passwort zurücksetzen</DialogTitle>
            <DialogDescription>
              Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum
              Zurücksetzen deines Passworts.
            </DialogDescription>
          </DialogHeader>

          {!resetSent ? (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Alert className="bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertDescription className="text-amber-800 dark:text-amber-200 text-sm">
                  ⚠️ <strong>Wichtig:</strong> Ein E-Mail-Server muss in
                  Supabase konfiguriert sein, damit die Reset-E-Mail verschickt
                  wird. Ohne Konfiguration funktioniert dieser Flow nicht.
                  <br />
                  <br />
                  <strong>Alternative:</strong> Admins können Passwörter im
                  Superadmin-Panel zurücksetzen.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="resetEmail">E-Mail-Adresse</Label>
                <Input
                  id="resetEmail"
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="max@beispiel.de"
                  required
                  disabled={resetLoading}
                  className="h-11"
                  autoFocus
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowForgotPassword(false)}
                  disabled={resetLoading}
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gesendet...
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Link senden
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
                <Mail className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  <strong>E-Mail versendet!</strong>
                  <br />
                  Prüfe deinen Posteingang und klicke auf den Link zum
                  Zurücksetzen deines Passworts.
                  <br />
                  <br />
                  <small className="text-xs">
                    Keine E-Mail erhalten? Prüfe deinen Spam-Ordner oder stelle
                    sicher, dass der E-Mail-Server in Supabase konfiguriert ist.
                  </small>
                </AlertDescription>
              </Alert>

              <Button
                className="w-full"
                onClick={() => {
                  setShowForgotPassword(false);
                  setResetSent(false);
                  setResetEmail("");
                }}
              >
                Verstanden
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
