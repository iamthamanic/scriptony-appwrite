import { useAuth } from "../hooks/useAuth";
import { useRouter, normalizePage } from "../hooks/useRouter";
import { useTheme } from "../hooks/useTheme";
import { useIsMobile } from "../components/ui/use-mobile";
import { Navigation } from "../components/Navigation";
import { HomePage } from "../components/pages/HomePage";
import { AuthPage } from "../components/pages/AuthPage";
import { ResetPasswordPage } from "../components/pages/ResetPasswordPage";
import { Toaster } from "../components/ui/sonner";
import { ServerStatusBanner } from "../components/ServerStatusBanner";
import { ConnectionStatusIndicator } from "../components/ConnectionStatusIndicator";
import { BackendNotConfiguredBanner } from "../components/BackendNotConfiguredBanner";
import { isBackendConfigured } from "../lib/env";
import { setupUndoKeyboardShortcuts } from "../lib/undo-manager";
import scriptonyLogo from "../assets/scriptony-logo.png";
import { Suspense, lazy, useCallback, useEffect } from "react";

const ProjectsPage = lazy(() =>
  import("../components/pages/ProjectsPage").then((module) => ({
    default: module.ProjectsPage,
  })),
);
const WorldbuildingPage = lazy(() =>
  import("../components/pages/WorldbuildingPage").then((module) => ({
    default: module.WorldbuildingPage,
  })),
);
const CreativeGymPage = lazy(() =>
  import("../components/pages/CreativeGymPage").then((module) => ({
    default: module.CreativeGymPage,
  })),
);
const UploadPage = lazy(() =>
  import("../components/pages/UploadPage").then((module) => ({
    default: module.UploadPage,
  })),
);
const AdminPage = lazy(() =>
  import("../components/pages/AdminPage").then((module) => ({
    default: module.AdminPage,
  })),
);
const SettingsPage = lazy(() =>
  import("../components/pages/SettingsPage").then((module) => ({
    default: module.SettingsPage,
  })),
);
const SuperadminPage = lazy(() =>
  import("../components/pages/SuperadminPage").then((module) => ({
    default: module.SuperadminPage,
  })),
);
const StagePage = lazy(() =>
  import("../components/pages/StagePage").then((module) => ({
    default: module.StagePage,
  })),
);
const ApiTestPage = lazy(() =>
  import("../components/pages/ApiTestPage").then((module) => ({
    default: module.ApiTestPage,
  })),
);
const ProjectRecoveryPage = lazy(() =>
  import("../components/pages/ProjectRecoveryPage").then((module) => ({
    default: module.ProjectRecoveryPage,
  })),
);
const ScriptonyAssistant = lazy(() =>
  import("../components/ScriptonyAssistant").then((module) => ({
    default: module.ScriptonyAssistant,
  })),
);
const PerformanceDashboard = lazy(() =>
  import("../components/PerformanceDashboard").then((module) => ({
    default: module.PerformanceDashboard,
  })),
);

function AppSectionFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-14 w-14">
        <img
          src={scriptonyLogo}
          alt="Scriptony Logo"
          className="h-full w-full animate-pulse object-contain"
        />
      </div>
    </div>
  );
}

export function AppContent() {
  const { user, loading: authLoading } = useAuth();
  const { state: router, navigate } = useRouter();
  const onNavigate = useCallback(
    (page: string, id?: string, categoryId?: string) => {
      navigate(normalizePage(page), id, categoryId);
    },
    [navigate],
  );
  const { theme, toggleTheme } = useTheme();
  const isMobile = useIsMobile();
  const isStagePage =
    router.page === "stage" ||
    router.page === "create" ||
    router.page === "present";

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
    return <ResetPasswordPage onNavigate={onNavigate} />;
  }

  // Show auth page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  const renderPage = () => {
    const { page, id: selectedId, categoryId: selectedCategoryId } = router;

    switch (page) {
      case "home":
        return <HomePage onNavigate={onNavigate} />;
      case "projekte":
        return (
          <ProjectsPage
            selectedProjectId={selectedId}
            onNavigate={onNavigate}
          />
        );
      case "welten":
      case "worldbuilding":
        return (
          <WorldbuildingPage
            selectedWorldId={selectedId}
            selectedCategoryId={selectedCategoryId}
            onNavigate={onNavigate}
          />
        );
      case "gym":
        return <CreativeGymPage />;
      case "upload":
        return <UploadPage onNavigate={onNavigate} />;
      case "admin":
        return <AdminPage />;
      case "einstellungen":
      case "settings":
        return <SettingsPage />;
      case "superadmin":
        return <SuperadminPage onNavigate={onNavigate} />;
      case "stage":
      case "create":
      case "present":
        return (
          <StagePage
            projectId={router.id ?? null}
            shotId={router.categoryId ?? null}
          />
        );
      case "api-test":
        return <ApiTestPage />;
      case "project-recovery":
        return <ProjectRecoveryPage onBack={() => onNavigate("projekte")} />;
      default:
        return <HomePage onNavigate={onNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation
        currentPage={router.page}
        onNavigate={onNavigate}
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
      <main
        className={`w-full ${
          isMobile
            ? "pb-[calc(5rem+env(safe-area-inset-bottom,0px))]"
            : isStagePage
              ? "h-[calc(100dvh-56px)] overflow-hidden max-w-none px-0"
              : "pt-0 max-w-7xl mx-auto px-6 pb-safe"
        }`}
      >
        <Suspense fallback={<AppSectionFallback />}>{renderPage()}</Suspense>
      </main>
      <Toaster position="top-center" />
      <Suspense fallback={null}>
        <ScriptonyAssistant />
      </Suspense>
      <ConnectionStatusIndicator />
      <Suspense fallback={null}>
        <PerformanceDashboard />
      </Suspense>
    </div>
  );
}
