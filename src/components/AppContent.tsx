import { useAuth } from "../hooks/useAuth";
import { useRouter, normalizePage } from "../hooks/useRouter";
import { useTheme } from "../hooks/useTheme";
import { useLocalWorkspaceOptional } from "../hooks/useLocalWorkspace";
import { useRuntime } from "../runtime";
import { useIsMobile } from "../components/ui/use-mobile";
import { Toaster } from "../components/ui/sonner";
import { isBackendConfigured } from "../lib/env";
import { setupUndoKeyboardShortcuts } from "../lib/undo-manager";
import scriptonyLogo from "../assets/scriptony-logo.png";
import { Suspense, lazy, useCallback, useEffect } from "react";

// Eager: only lightweight helpers needed for routing/auth decision
import { ResetPasswordPage } from "../components/pages/ResetPasswordPage";
import { BackendNotConfiguredBanner } from "../components/settings/BackendNotConfiguredBanner";
import { FirstRunWorkspaceGate } from "./desktop/FirstRunWorkspaceGate";

// Lazy: all heavy UI components deferred after first paint
const Navigation = lazy(() =>
  import("../components/Navigation").then((m) => ({ default: m.Navigation })),
);
const HomePage = lazy(() =>
  import("../components/pages/HomePage").then((m) => ({
    default: m.HomePage,
  })),
);
const AuthPage = lazy(() =>
  import("../components/pages/AuthPage").then((m) => ({
    default: m.AuthPage,
  })),
);
const ServerStatusBanner = lazy(() =>
  import("../components/settings/ServerStatusBanner").then((m) => ({
    default: m.ServerStatusBanner,
  })),
);
const ConnectionStatusIndicator = lazy(() =>
  import("../components/settings/ConnectionStatusIndicator").then((m) => ({
    default: m.ConnectionStatusIndicator,
  })),
);

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
const MveVoiceUiPreviewPage = lazy(() =>
  import("../components/qa/MveVoiceUiPreviewPage").then((module) => ({
    default: module.MveVoiceUiPreviewPage,
  })),
);
const MveTakeUiPreviewPage = lazy(() =>
  import("../components/qa/MveTakeUiPreviewPage").then((module) => ({
    default: module.MveTakeUiPreviewPage,
  })),
);
const MveTextBlockLanePreviewPage = lazy(() =>
  import("../components/qa/MveTextBlockLanePreviewPage").then((module) => ({
    default: module.MveTextBlockLanePreviewPage,
  })),
);
const MveEmptyTextBlockShellPreviewPage = lazy(() =>
  import("../components/qa/MveEmptyTextBlockShellPreviewPage").then(
    (module) => ({
      default: module.MveEmptyTextBlockShellPreviewPage,
    }),
  ),
);
const MveTextBlockOrderSyncPreviewPage = lazy(() =>
  import("../components/qa/MveTextBlockOrderSyncPreviewPage").then(
    (module) => ({
      default: module.MveTextBlockOrderSyncPreviewPage,
    }),
  ),
);
const MveDialogClipInlineSlice3PreviewPage = lazy(() =>
  import("../components/qa/MveDialogClipInlineSlice3PreviewPage").then(
    (module) => ({
      default: module.MveDialogClipInlineSlice3PreviewPage,
    }),
  ),
);
const MveDialogLaneLayoutFixesPreviewPage = lazy(() =>
  import("../components/qa/MveDialogLaneLayoutFixesPreviewPage").then(
    (module) => ({
      default: module.MveDialogLaneLayoutFixesPreviewPage,
    }),
  ),
);
const MveDialogLaneScrollCompactPreviewPage = lazy(() =>
  import("../components/qa/MveDialogLaneScrollCompactPreviewPage").then(
    (module) => ({
      default: module.MveDialogLaneScrollCompactPreviewPage,
    }),
  ),
);
const TimelineRowAlignmentPreviewPage = lazy(() =>
  import("../components/qa/TimelineRowAlignmentPreviewPage").then((module) => ({
    default: module.TimelineRowAlignmentPreviewPage,
  })),
);
const TimelineRowAlignmentTauriPage = lazy(() =>
  import("../components/qa/TimelineRowAlignmentTauriPage").then((module) => ({
    default: module.TimelineRowAlignmentTauriPage,
  })),
);
const ScriptonyAssistant = lazy(() =>
  import("../components/assistant/ScriptonyAssistant").then((module) => ({
    default: module.ScriptonyAssistant,
  })),
);
const PerformanceDashboard = lazy(() =>
  import("../components/settings/PerformanceDashboard").then((module) => ({
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
  const runtime = useRuntime();
  const workspace = useLocalWorkspaceOptional();
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
  const needsLocalWorkspace =
    runtime.profile === "local" && runtime.isDesktop && workspace !== null;

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

  // Local desktop: wait for workspace hydrate, then gate until a folder is chosen (T44/T59).
  if (needsLocalWorkspace && workspace.isLoading) {
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

  if (needsLocalWorkspace && !workspace.workspaceRoot) {
    return (
      <div className="min-h-screen bg-background">
        <FirstRunWorkspaceGate />
        <Toaster position="top-center" />
      </div>
    );
  }

  // Show reset password page
  if (router.page === "reset-password") {
    return <ResetPasswordPage onNavigate={onNavigate} />;
  }

  // Show auth page if not logged in
  if (!user) {
    return (
      <Suspense fallback={<AppSectionFallback />}>
        <AuthPage />
      </Suspense>
    );
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
      case "qa-mve-voice":
        return import.meta.env.DEV ? (
          <MveVoiceUiPreviewPage />
        ) : (
          <HomePage onNavigate={onNavigate} />
        );
      case "qa-mve-take-ui":
        return import.meta.env.DEV ? (
          <MveTakeUiPreviewPage />
        ) : (
          <HomePage onNavigate={onNavigate} />
        );
      case "qa-mve-text-block-lane":
        return import.meta.env.DEV ? (
          <MveTextBlockLanePreviewPage />
        ) : (
          <HomePage onNavigate={onNavigate} />
        );
      case "qa-mve-empty-text-block-shell":
        return import.meta.env.DEV ? (
          <MveEmptyTextBlockShellPreviewPage />
        ) : (
          <HomePage onNavigate={onNavigate} />
        );
      case "qa-mve-textblock-order-sync":
        return import.meta.env.DEV ? (
          <MveTextBlockOrderSyncPreviewPage />
        ) : (
          <HomePage onNavigate={onNavigate} />
        );
      case "qa-mve-dialog-clip-inline-slice3":
        return import.meta.env.DEV ? (
          <MveDialogClipInlineSlice3PreviewPage />
        ) : (
          <HomePage onNavigate={onNavigate} />
        );
      case "qa-mve-dialog-lane-layout-fixes":
        return import.meta.env.DEV ? (
          <MveDialogLaneLayoutFixesPreviewPage />
        ) : (
          <HomePage onNavigate={onNavigate} />
        );
      case "qa-mve-dialog-lane-scroll-compact":
        return import.meta.env.DEV ? (
          <MveDialogLaneScrollCompactPreviewPage />
        ) : (
          <HomePage onNavigate={onNavigate} />
        );
      case "qa-timeline-row-alignment":
        return import.meta.env.DEV ? (
          <TimelineRowAlignmentPreviewPage />
        ) : (
          <HomePage onNavigate={onNavigate} />
        );
      case "qa-timeline-row-alignment-tauri":
        return import.meta.env.DEV ? (
          <TimelineRowAlignmentTauriPage />
        ) : (
          <HomePage onNavigate={onNavigate} />
        );
      case "project-recovery":
        return <ProjectRecoveryPage onBack={() => onNavigate("projekte")} />;
      default:
        return <HomePage onNavigate={onNavigate} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={null}>
        <Navigation
          currentPage={router.page}
          onNavigate={onNavigate}
          theme={theme}
          onToggleTheme={toggleTheme}
          userRole={user.role}
          currentProjectId={router.id || null}
        />
      </Suspense>
      <Suspense fallback={null}>
        <ServerStatusBanner />
      </Suspense>
      {runtime.profile !== "local" &&
        !isBackendConfigured() &&
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
      <Suspense fallback={null}>
        <ConnectionStatusIndicator />
      </Suspense>
      <Suspense fallback={null}>
        <PerformanceDashboard />
      </Suspense>
    </div>
  );
}
