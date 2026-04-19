import { useState, useEffect } from "react";
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
import { Alert, AlertDescription } from "../ui/alert";
import { useAuth } from "../../hooks/useAuth";
import { toast } from "sonner@2.0.3";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import scriptonyLogo from "../../assets/scriptony-logo.png";

interface ResetPasswordPageProps {
  onNavigate: (page: string) => void;
}

export function ResetPasswordPage({ onNavigate }: ResetPasswordPageProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { updatePassword } = useAuth();

  // Check if we have a password reset token in URL
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    // Check URL hash for access token (Supabase redirect)
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      setHasToken(true);
    } else {
      setHasToken(false);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword || !confirmPassword) {
      toast.error("Fehler", {
        description: "Bitte beide Passwort-Felder ausfüllen",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast.error("Fehler", {
        description: "Passwort muss mindestens 6 Zeichen lang sein",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("Fehler", {
        description: "Passwörter stimmen nicht überein",
      });
      return;
    }

    setLoading(true);

    try {
      await updatePassword(newPassword);
      setSuccess(true);
      toast.success("Passwort erfolgreich geändert!");

      // Redirect to home after 2 seconds
      setTimeout(() => {
        onNavigate("home");
      }, 2000);
    } catch (error: any) {
      console.error("Password update error:", error);
      toast.error("Fehler beim Ändern des Passworts", {
        description: error.message || "Ein Fehler ist aufgetreten",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!hasToken) {
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
            <CardTitle className="text-2xl">Ungültiger Link</CardTitle>
            <CardDescription>
              Dieser Link ist ungültig oder abgelaufen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Bitte fordere einen neuen Passwort-Reset Link an.
              </AlertDescription>
            </Alert>

            <Button className="w-full mt-4" onClick={() => onNavigate("auth")}>
              Zurück zum Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-primary/5 to-transparent">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-2 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
              <CheckCircle2 className="w-full h-full text-green-500" />
            </div>
            <CardTitle className="text-2xl">Passwort geändert!</CardTitle>
            <CardDescription>
              Dein Passwort wurde erfolgreich aktualisiert
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Du wirst automatisch weitergeleitet...
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <CardTitle className="text-2xl">Neues Passwort setzen</CardTitle>
          <CardDescription>
            Wähle ein sicheres neues Passwort für deinen Account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Neues Passwort</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mindestens 6 Zeichen"
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Passwort bestätigen</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Passwort wiederholen"
                required
                disabled={loading}
                className="h-11"
              />
            </div>

            <Button type="submit" className="w-full h-11" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Wird aktualisiert...
                </>
              ) : (
                "Passwort ändern"
              )}
            </Button>

            <div className="text-center text-sm">
              <button
                type="button"
                onClick={() => onNavigate("auth")}
                className="text-primary hover:underline"
                disabled={loading}
              >
                Zurück zum Login
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
