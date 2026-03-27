import { useAuth } from "../hooks/useAuth";
import { useRouter } from "../hooks/useRouter";
import { useTheme } from "../hooks/useTheme";
import { useIsMobile } from "../components/ui/use-mobile";
import { Navigation } from "../components/Navigation";
import { HomePage } from "../components/pages/HomePage";
import { ProjectsPage } from "../components/pages/ProjectsPage";
import { WorldbuildingPage } from "../components/pages/WorldbuildingPage";
import { CreativeGymPage } from "../components/pages/CreativeGymPage";
import { UploadPage } from "../components/pages/UploadPage";
import { AdminPage } from "../components/pages/AdminPage";
import { SettingsPage } from "../components/pages/SettingsPage";
import { SuperadminPage } from "../components/pages/SuperadminPage";
import { StagePage } from "../components/pages/StagePage";
import { AuthPage } from "../components/pages/AuthPage";
import { ResetPasswordPage } from "../components/pages/ResetPasswordPage";
import { ApiTestPage } from "../components/pages/ApiTestPage";
import { ProjectRecoveryPage } from "../components/pages/ProjectRecoveryPage";
import { Toaster } from "../components/ui/sonner";
import { ScriptonyAssistant } from "../components/ScriptonyAssistant";
import { ServerStatusBanner } from "../components/ServerStatusBanner";
import { ConnectionStatusIndicator } from "../components/ConnectionStatusIndicator";
import { BackendNotConfiguredBanner } from "../components/BackendNotConfiguredBanner";
import { PerformanceDashboard } from "../components/PerformanceDashboard";
import { isBackendConfigured } from "../lib/env";
import { setupUndoKeyboardShortcuts } from "../lib/undo-manager";
import scriptonyLogo from '../assets/scriptony-logo.png';
import { useEffect } from "react";

export function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { state: router, navigate } = useRouter();
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const isStagePage = router.page === "stage" || router.page === "create" || router.page === "present";

  // Setup undo/redo keyboard shortcuts
  useEffect(() => {
    const cleanup = setupUndoKeyboardShortcuts();
    return cleanup;
  }, []);

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-16 h-16">
          <img
            src={scriptonyLogo}
            alt="Scriptony Logo"
            className="w-full h-full object-contain animate-pulse"
          />
        </div>
      </div>
    );
  }

  // Show reset password page
  if (router.page === "reset-password") {
    return <ResetPasswordPage onNavigate={navigate} />;
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
    const { page, id: selectedId, categoryId: selectedCategoryId } = router;
    
    switch (page) {
      case "home":
        return <HomePage onNavigate={navigate} />;
      case "projekte":
        return (
          <ProjectsPage
            selectedProjectId={selectedId}
            onNavigate={navigate}
          />
        );
      case "welten":
      case "worldbuilding":
        return (
          <WorldbuildingPage
            selectedWorldId={selectedId}
            selectedCategoryId={selectedCategoryId}
            onNavigate={navigate}
          />
        );
      case "creative-gym":
        return <CreativeGymPage />;
      case "upload":
        return <UploadPage onNavigate={navigate} />;
      case "admin":
        return <AdminPage />;
      case "einstellungen":
      case "settings":
        return <SettingsPage />;
      case "superadmin":
        return <SuperadminPage onNavigate={navigate} />;
      case "stage":
      case "create":
      case "present":
        return <StagePage />;
      case "api-test":
        return <ApiTestPage />;
      case "project-recovery":
        return <ProjectRecoveryPage />;
      default:
        return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        currentPage={router.page}
        onNavigate={navigate}
        theme={theme}
        onToggleTheme={toggleTheme}
        userRole={user.role}
        currentProjectId={router.id || null}
      />
      <ServerStatusBanner />
      {!isBackendConfigured() &&
        typeof window !== "undefined" &&
        window.location.hostname !== "localhost" &&
        !window.location.hostname.startsWith("127.0.0.1") && (
          <BackendNotConfiguredBanner />
        )}
      <main className={`pb-safe w-full ${
        isMobile
          ? 'pb-20'
          : isStagePage
            ? 'h-[calc(100dvh-56px)] overflow-hidden max-w-none px-0'
            : 'pt-14 max-w-7xl mx-auto px-6'
      }`}>
        {renderPage()}
      </main>
      <Toaster position="top-center" />
      <ScriptonyAssistant />
      <ConnectionStatusIndicator />
      <PerformanceDashboard />
    </div>
  );
}
