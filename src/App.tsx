import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { AppContent } from "./components/AppContent";
import { AuthProvider } from "./hooks/useAuth";
import { TranslationProvider } from "./hooks/useTranslation";
import { queryClient } from "./lib/react-query";
import { STORAGE_KEYS } from "./lib/config";
import { seedTestUser } from "./utils/seedData";

export default function App() {
  // Run seed/migration in the background — never block first paint
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasMigrated = localStorage.getItem(STORAGE_KEYS.HAS_MIGRATED);
    if (hasMigrated) return;

    seedTestUser()
      .then(() => {
        localStorage.setItem(STORAGE_KEYS.HAS_SEEDED_USER, "true");
      })
      .catch(() => {
        // Ignore seed errors
      })
      .finally(() => {
        localStorage.setItem(STORAGE_KEYS.HAS_MIGRATED, "true");
      });
  }, []);

  return (
    <TranslationProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </AuthProvider>
    </TranslationProvider>
  );
}
