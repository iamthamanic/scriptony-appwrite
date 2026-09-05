import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppContent } from "./components/AppContent";
import { RuntimeProvider } from "./runtime";
import { BackendProvider } from "./backend";
import { LocalProjectProvider } from "./hooks/useLocalProject";
import { LocalWorkspaceProvider } from "./hooks/useLocalWorkspace";
import { AuthProvider } from "./hooks/useAuth";
import { CloudLoginProvider } from "./hooks/useCloudSession";
import { TranslationProvider } from "./hooks/useTranslation";
import { GlobalLoadingProgressProvider } from "./hooks/useGlobalLoadingProgress";
import { queryClient } from "./lib/react-query";
import { STORAGE_KEYS } from "./lib/config";
import scriptonyLogo from "./assets/scriptony-logo.png";
import { seedTestUser } from "./utils/seedData";

export default function App() {
  const [migrationComplete, setMigrationComplete] = useState(false);

  // Auto-setup on first app load
  useEffect(() => {
    const runAutoSetup = async () => {
      if (typeof window === "undefined") return;

      const hasMigrated = localStorage.getItem(STORAGE_KEYS.HAS_MIGRATED);

      if (hasMigrated) {
        setMigrationComplete(true);
        return;
      }

      try {
        await seedTestUser();
        localStorage.setItem(STORAGE_KEYS.HAS_SEEDED_USER, "true");
      } catch {
        // Ignore seed errors
      }

      localStorage.setItem(STORAGE_KEYS.HAS_MIGRATED, "true");
      setMigrationComplete(true);
    };

    runAutoSetup();
  }, []);

  // Show loading during migration
  if (!migrationComplete) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-24 h-24">
            <img
              src={scriptonyLogo}
              alt="Scriptony Logo"
              className="w-full h-full object-contain animate-pulse"
            />
          </div>
          <h2 className="text-2xl font-semibold text-foreground">
            Scriptony wird vorbereitet...
          </h2>
        </div>
      </div>
    );
  }

  return (
    <RuntimeProvider>
      <LocalWorkspaceProvider>
        <LocalProjectProvider>
          <BackendProvider>
            <TranslationProvider>
              <AuthProvider>
                <CloudLoginProvider>
                  <QueryClientProvider client={queryClient}>
                    <GlobalLoadingProgressProvider>
                      <AppContent />
                    </GlobalLoadingProgressProvider>
                  </QueryClientProvider>
                </CloudLoginProvider>
              </AuthProvider>
            </TranslationProvider>
          </BackendProvider>
        </LocalProjectProvider>
      </LocalWorkspaceProvider>
    </RuntimeProvider>
  );
}
