import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type Language = "de" | "en";

interface TranslationContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType | undefined>(
  undefined,
);

// Translation dictionary
const translations: Record<Language, Record<string, string>> = {
  de: {
    // Navigation
    "nav.home": "Home",
    "nav.projects": "Projekte",
    "nav.worldbuilding": "Worldbuilding",
    "nav.gym": "Creative Gym",
    "nav.upload": "Upload",
    "nav.admin": "Admin",
    "nav.settings": "Einstellungen",
    "nav.superadmin": "Superadmin",

    // Common
    "common.save": "Speichern",
    "common.cancel": "Abbrechen",
    "common.delete": "Löschen",
    "common.edit": "Bearbeiten",
    "common.create": "Erstellen",
    "common.search": "Suchen",
    "common.loading": "Lädt...",
    "common.error": "Fehler",
    "common.success": "Erfolg",
    "common.close": "Schließen",
    "common.back": "Zurück",
    "common.next": "Weiter",
    "common.previous": "Zurück",
    "common.yes": "Ja",
    "common.no": "Nein",
    "common.confirm": "Bestätigen",

    // Auth
    "auth.login": "Anmelden",
    "auth.logout": "Abmelden",
    "auth.signup": "Registrieren",
    "auth.email": "E-Mail",
    "auth.password": "Passwort",
    "auth.name": "Name",
    "auth.forgotPassword": "Passwort vergessen?",
    "auth.noAccount": "Noch kein Konto?",
    "auth.hasAccount": "Bereits ein Konto?",
    "auth.loginSuccess": "Erfolgreich angemeldet",
    "auth.logoutSuccess": "Erfolgreich abgemeldet",
    "auth.signupSuccess": "Erfolgreich registriert",
    "auth.error": "Authentifizierungsfehler",
    "auth.welcome": "Willkommen bei Scriptony",
    "auth.loginSubtitle": "Melde dich an, um fortzufahren",
    "auth.signupSubtitle": "Erstelle ein Konto, um loszulegen",

    // Projects
    "projects.title": "Projekte",
    "projects.new": "Neues Projekt",
    "projects.empty": "Keine Projekte vorhanden",
    "projects.emptyDescription":
      "Erstelle dein erstes Projekt und beginne mit dem Schreiben.",
    "projects.type.film": "Film",
    "projects.type.series": "Serie",
    "projects.type.theatre": "Theater",
    "projects.type.other": "Sonstiges",
    "projects.scenes": "Szenen",
    "projects.characters": "Charaktere",
    "projects.logline": "Logline",
    "projects.synopsis": "Synopsis",

    // Worldbuilding
    "worldbuilding.title": "Worldbuilding",
    "worldbuilding.new": "Neue Welt",
    "worldbuilding.empty": "Keine Welten vorhanden",
    "worldbuilding.emptyDescription":
      "Erstelle deine erste Welt und füge Kategorien und Assets hinzu.",
    "worldbuilding.name": "Name der Welt",
    "worldbuilding.description": "Beschreibung",
    "worldbuilding.linkedProject": "Verknüpftes Projekt",
    "worldbuilding.categories": "Kategorien",

    // Creative Gym
    "gym.title": "Creative Gym",
    "gym.challenges": "Challenges",
    "gym.artForms": "Art Forms",
    "gym.trainingPlans": "Trainingspläne",
    "gym.achievements": "Erfolge",

    // Upload
    "upload.title": "Upload & Analyse",
    "upload.dropZone": "Skript hierher ziehen oder klicken",
    "upload.analyzing": "Analysiere Skript...",

    // Settings
    "settings.title": "Einstellungen",
    "settings.profile": "Profil",
    "settings.language": "Sprache",
    "settings.theme": "Design",
    "settings.themeLight": "Hell",
    "settings.themeDark": "Dunkel",
    "settings.notifications": "Benachrichtigungen",
    "settings.storage": "Speicher",
    "settings.storageUsed": "Speicher verwendet",

    // Admin
    "admin.title": "Admin",
    "admin.users": "Benutzer",
    "admin.analytics": "Analysen",
    "admin.settings": "Einstellungen",

    // Assistant
    "assistant.title": "Scriptony Assistent",
    "assistant.placeholder": "Schreibe eine Nachricht...",
    "assistant.newChat": "Neuer Chat",
    "assistant.history": "Verlauf",
    "assistant.ragConnect": "RAG Verbindungen",
    "assistant.projects": "Projekte",
    "assistant.worlds": "Welten",
    "assistant.characters": "Charaktere",
    "assistant.scenes": "Szenen",
    "assistant.files": "Dateien",

    // Errors
    "error.generic": "Ein Fehler ist aufgetreten",
    "error.network": "Netzwerkfehler",
    "error.notFound": "Nicht gefunden",
    "error.unauthorized": "Nicht autorisiert",
    "error.forbidden": "Zugriff verweigert",
  },
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.projects": "Projects",
    "nav.worldbuilding": "Worldbuilding",
    "nav.gym": "Creative Gym",
    "nav.upload": "Upload",
    "nav.admin": "Admin",
    "nav.settings": "Settings",
    "nav.superadmin": "Superadmin",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.create": "Create",
    "common.search": "Search",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.close": "Close",
    "common.back": "Back",
    "common.next": "Next",
    "common.previous": "Previous",
    "common.yes": "Yes",
    "common.no": "No",
    "common.confirm": "Confirm",

    // Auth
    "auth.login": "Login",
    "auth.logout": "Logout",
    "auth.signup": "Sign Up",
    "auth.email": "Email",
    "auth.password": "Password",
    "auth.name": "Name",
    "auth.forgotPassword": "Forgot password?",
    "auth.noAccount": "Don't have an account?",
    "auth.hasAccount": "Already have an account?",
    "auth.loginSuccess": "Successfully logged in",
    "auth.logoutSuccess": "Successfully logged out",
    "auth.signupSuccess": "Successfully signed up",
    "auth.error": "Authentication error",
    "auth.welcome": "Welcome to Scriptony",
    "auth.loginSubtitle": "Sign in to continue",
    "auth.signupSubtitle": "Create an account to get started",

    // Projects
    "projects.title": "Projects",
    "projects.new": "New Project",
    "projects.empty": "No projects available",
    "projects.emptyDescription": "Create your first project and start writing.",
    "projects.type.film": "Film",
    "projects.type.series": "Series",
    "projects.type.theatre": "Theatre",
    "projects.type.other": "Other",
    "projects.scenes": "Scenes",
    "projects.characters": "Characters",
    "projects.logline": "Logline",
    "projects.synopsis": "Synopsis",

    // Worldbuilding
    "worldbuilding.title": "Worldbuilding",
    "worldbuilding.new": "New World",
    "worldbuilding.empty": "No worlds available",
    "worldbuilding.emptyDescription":
      "Create your first world and add categories and assets.",
    "worldbuilding.name": "World Name",
    "worldbuilding.description": "Description",
    "worldbuilding.linkedProject": "Linked Project",
    "worldbuilding.categories": "Categories",

    // Creative Gym
    "gym.title": "Creative Gym",
    "gym.challenges": "Challenges",
    "gym.artForms": "Art Forms",
    "gym.trainingPlans": "Training Plans",
    "gym.achievements": "Achievements",

    // Upload
    "upload.title": "Upload & Analysis",
    "upload.dropZone": "Drag script here or click",
    "upload.analyzing": "Analyzing script...",

    // Settings
    "settings.title": "Settings",
    "settings.profile": "Profile",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.themeLight": "Light",
    "settings.themeDark": "Dark",
    "settings.notifications": "Notifications",
    "settings.storage": "Storage",
    "settings.storageUsed": "Storage used",

    // Admin
    "admin.title": "Admin",
    "admin.users": "Users",
    "admin.analytics": "Analytics",
    "admin.settings": "Settings",

    // Assistant
    "assistant.title": "Scriptony Assistant",
    "assistant.placeholder": "Write a message...",
    "assistant.newChat": "New Chat",
    "assistant.history": "History",
    "assistant.ragConnect": "RAG Connections",
    "assistant.projects": "Projects",
    "assistant.worlds": "Worlds",
    "assistant.characters": "Characters",
    "assistant.scenes": "Scenes",
    "assistant.files": "Files",

    // Errors
    "error.generic": "An error occurred",
    "error.network": "Network error",
    "error.notFound": "Not found",
    "error.unauthorized": "Unauthorized",
    "error.forbidden": "Access denied",
  },
};

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem("scriptony_language");
    if (saved === "de" || saved === "en") return saved;
    // Default to German
    return "de";
  });

  useEffect(() => {
    localStorage.setItem("scriptony_language", language);
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <TranslationContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return context;
}
