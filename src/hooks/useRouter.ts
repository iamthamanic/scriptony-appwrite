import { useState, useEffect, useCallback } from "react";

const VALID_PAGES = [
  "home",
  "projekte",
  "welten",
  "worldbuilding",
  "gym",
  "upload",
  "admin",
  "superadmin",
  "einstellungen",
  "settings",
  "stage",
  "create",
  "present",
  "auth",
  "migration",
  "reset-password",
  "api-test",
  "project-recovery",
] as const;

export type ValidPage = (typeof VALID_PAGES)[number];

interface RouterState {
  page: ValidPage;
  id?: string;
  categoryId?: string;
}

export function normalizePage(page: string | undefined): ValidPage {
  if (page === "present" || page === "create") {
    return "stage";
  }

  // Older links used #creative-gym; canonical hash is #gym.
  if (page === "creative-gym") {
    return "gym";
  }

  return VALID_PAGES.includes(page as ValidPage) ? (page as ValidPage) : "home";
}

function safeDecodeHashSegment(
  segment: string | undefined,
): string | undefined {
  if (segment == null || segment === "") return undefined;
  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return segment.trim();
  }
}

/** Single source of truth for hash → router state (also used after programmatic navigate). */
function readRouterStateFromWindow(): RouterState {
  if (typeof window === "undefined") {
    return { page: "home" };
  }

  if (
    window.location.pathname === "/reset-password" ||
    window.location.hash.includes("type=recovery")
  ) {
    return { page: "reset-password" };
  }

  const hash = window.location.hash.slice(1);
  const [page, id, categoryId] = hash.split("/");

  return {
    page: normalizePage(page),
    id: safeDecodeHashSegment(id),
    categoryId: safeDecodeHashSegment(categoryId),
  };
}

export function useRouter(): {
  state: RouterState;
  navigate: (page: ValidPage, id?: string, categoryId?: string) => void;
} {
  const [state, setState] = useState<RouterState>(readRouterStateFromWindow);

  const navigate = useCallback(
    (page: ValidPage, id?: string, categoryId?: string) => {
      if (typeof window === "undefined") return;
      window.location.hash = [page, id, categoryId].filter(Boolean).join("/");
      // Sync immediately: some environments defer or skip hashchange when updating the hash.
      setState(readRouterStateFromWindow());
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleHashChange = () => {
      setState(readRouterStateFromWindow());
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  return { state, navigate };
}
