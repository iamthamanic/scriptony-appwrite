import { useState, useEffect, useCallback } from "react";

const VALID_PAGES = [
  "home", "projekte", "welten", "worldbuilding", "creative-gym", "upload",
  "admin", "superadmin", "einstellungen", "settings", "stage", "create", "present", "auth",
  "migration", "reset-password", "api-test", "project-recovery"
] as const;

type ValidPage = typeof VALID_PAGES[number];

interface RouterState {
  page: ValidPage;
  id?: string;
  categoryId?: string;
}

function normalizePage(page: string | undefined): ValidPage {
  if (page === "present" || page === "create") {
    return "stage";
  }

  return VALID_PAGES.includes(page as ValidPage) ? (page as ValidPage) : "home";
}

export function useRouter(): {
  state: RouterState;
  navigate: (page: ValidPage, id?: string, categoryId?: string) => void;
} {
  const getInitialState = useCallback((): RouterState => {
    if (typeof window === "undefined") {
      return { page: "home" };
    }
    
    // Check reset password path first
    if (
      window.location.pathname === "/reset-password" ||
      window.location.hash.includes("type=recovery")
    ) {
      return { page: "reset-password" };
    }

    const hash = window.location.hash.slice(1);
    const [page, id, categoryId] = hash.split('/');

    return {
      page: normalizePage(page),
      id: id || undefined,
      categoryId: categoryId || undefined
    };
  }, []);

  const [state, setState] = useState<RouterState>(getInitialState);

  const navigate = useCallback((page: ValidPage, id?: string, categoryId?: string) => {
    if (typeof window !== "undefined") {
      window.location.hash = [page, id, categoryId].filter(Boolean).join('/');
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      const [page, id, categoryId] = hash.split('/');
      
      setState({
        page: normalizePage(page),
        id: id || undefined,
        categoryId: categoryId || undefined
      });
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return { state, navigate };
}
