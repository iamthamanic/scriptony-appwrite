import { useState, useRef, useMemo, useEffect } from "react";
import {
  MessageCircle,
  X,
  Mic,
  Search,
  Calendar,
  Plus,
  Upload,
  FileText,
  Image as ImageIcon,
  CheckSquare,
  Square,
  ChevronDown,
} from "lucide-react";
import { useColoredTags } from "./hooks/useColoredTags";
import { useTokenCounter } from "./hooks/useTokenCounter";
import {
  projectsApi,
  charactersApi,
  scenesApi,
  worldsApi,
  itemsApi,
} from "../utils/api";
import { apiGet, apiPost, apiDelete, apiPut } from "../lib/api-client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Button } from "./ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Calendar as CalendarComponent } from "./ui/calendar";
import { toast } from "sonner";
import svgPaths from "../imports/svg-s01rzl305m";
import systemPromptSvg from "../imports/svg-moj859ikvp";
import BxEdit from "../imports/BxEdit";
import { ChatSettingsDialog } from "./ChatSettingsDialog";
import { AssistantOrbitLoader } from "./ai/AssistantOrbitLoader";
import { normalizeAssistantSystemPrompt } from "../../functions/_shared/default-assistant-system-prompt";
import { SCRIPTONY_AI_SETTINGS_UPDATED_EVENT } from "../lib/ai-settings-updated";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatHistory {
  id: string;
  title: string;
  lastEdited: Date;
  model: string;
  messages: Message[];
}

interface RAGProject {
  id: string;
  title: string;
  type: string;
  lastEdited: Date;
}

interface RAGWorld {
  id: string;
  name: string;
  category: string;
  lastEdited: Date;
}

interface RAGCharacter {
  id: string;
  name: string;
  project?: string;
  world?: string;
  lastEdited: Date;
}

interface RAGWorldAsset {
  id: string;
  name: string;
  category: string;
  world: string;
  lastEdited: Date;
}

interface RAGCustomFile {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadedAt: Date;
}

interface RAGScene {
  id: string;
  name: string;
  project: string;
  lastEdited: Date;
}

// SVG Icon Components from Figma
function SendIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 19 19"
    >
      <path
        d={svgPaths.p29fb5a00}
        stroke="white"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function AttachIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 21 21"
    >
      <path
        d={svgPaths.p5e3af20}
        stroke="#6E59A5"
        strokeLinecap="square"
        strokeWidth="2"
      />
    </svg>
  );
}

function ChatHistoryIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 18 16"
    >
      <path
        d={svgPaths.p2f824c80}
        fill="currentColor"
        className="dark:fill-foreground"
      />
      <path
        d={svgPaths.p27403cf0}
        fill="currentColor"
        className="dark:fill-foreground"
      />
      <path
        d={svgPaths.p30020200}
        fill="currentColor"
        className="dark:fill-foreground"
      />
      <path
        d={svgPaths.p25d05e00}
        fill="currentColor"
        className="dark:fill-foreground"
      />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 24 24"
    >
      <path
        d={svgPaths.p33389e00}
        fill="currentColor"
        className="dark:fill-foreground"
      />
    </svg>
  );
}

function SystemPromptIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="none"
      viewBox="0 0 18 16"
    >
      <path
        d={systemPromptSvg.p2512f580}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 15 15"
    >
      <path
        d={svgPaths.p21a92570}
        fill="currentColor"
        className="dark:fill-foreground"
      />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 18 18"
    >
      <path
        d={svgPaths.p4914e80}
        stroke="currentColor"
        className="dark:stroke-foreground"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d={svgPaths.p18657f00}
        stroke="currentColor"
        className="dark:stroke-foreground"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function AssistantIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 20 20"
    >
      <path
        d={svgPaths.p1541e700}
        fill="#6E59A5"
        className="dark:fill-primary"
      />
    </svg>
  );
}

function EmptyChatIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 73 73"
    >
      <path
        d={svgPaths.p1a6d7c00}
        stroke="#9D9DA5"
        className="dark:stroke-muted-foreground"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="block size-full"
      fill="none"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 14 14"
    >
      <path d={svgPaths.p2aa77200} fill="white" />
    </svg>
  );
}

interface ModelInfo {
  id: string;
  name: string;
  context_window: number;
}

interface AssistantRuntimeResponse {
  feature: "assistant_chat";
  provider: string;
  provider_display: string;
  model: string;
  selected_model?: ModelInfo | null;
  models_with_context?: ModelInfo[];
  source?: "remote" | "registry";
  configured?: boolean;
  can_send?: boolean;
  requires_api_key?: boolean;
  has_credentials?: boolean;
  ollama_mode?: "local" | "cloud";
  error?: string;
}

/** Exact id match, then case-insensitive (API vs. settings often differ only by casing). */
function findModelByIdLoose(
  list: ModelInfo[],
  id: string,
): ModelInfo | undefined {
  const t = id.trim();
  if (!t) return undefined;
  const exact = list.find((m) => m.id === t);
  if (exact) return exact;
  const lower = t.toLowerCase();
  return list.find((m) => m.id.toLowerCase() === lower);
}

export function ScriptonyAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [model, setModel] = useState("");
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [activeProviderDisplay, setActiveProviderDisplay] =
    useState<string>("");
  const [assistantReady, setAssistantReady] = useState<boolean>(false);
  const [assistantStatusError, setAssistantStatusError] = useState<
    string | null
  >(null);

  // Token counter hook (context window comes from selected model via loadModels / sync effect)
  const tokenCounter = useTokenCounter({
    model: model,
  });
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isSystemPromptOpen, setIsSystemPromptOpen] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [lastEditedDate, setLastEditedDate] = useState<Date | null>(null);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "json" | "md">(
    "json",
  );
  const [exportFileName, setExportFileName] = useState("scriptony-chat");
  const [chatTitle, setChatTitle] = useState(() => {
    const now = new Date();
    return `Scriptony Assistant Chat - ${now.toLocaleDateString("de-DE")} - ${now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`;
  });
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [isChatSettingsOpen, setIsChatSettingsOpen] = useState(false);
  const [isRAGDatabaseOpen, setIsRAGDatabaseOpen] = useState(false);
  const [ragActiveTab, setRagActiveTab] = useState<
    "projects" | "worlds" | "characters" | "custom"
  >("projects");
  const [ragSearch, setRagSearch] = useState("");
  const [selectedRAGProjects, setSelectedRAGProjects] = useState<string[]>([]);
  const [selectedRAGWorlds, setSelectedRAGWorlds] = useState<string[]>([]);
  const [selectedRAGCharacters, setSelectedRAGCharacters] = useState<string[]>(
    [],
  );
  const [selectedRAGCustomFiles, setSelectedRAGCustomFiles] = useState<
    string[]
  >([]);
  const [previewFile, setPreviewFile] = useState<RAGCustomFile | null>(null);
  const [chatHistorySearch, setChatHistorySearch] = useState("");
  const [dateFilterFrom, setDateFilterFrom] = useState<Date | undefined>();
  const [dateFilterTo, setDateFilterTo] = useState<Date | undefined>();
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);

  // Autocomplete states
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionsType, setSuggestionsType] = useState<
    "@" | "/" | "#" | null
  >(null);
  const [suggestionSearch, setSuggestionSearch] = useState("");
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);

  // RAG Data - loaded from API
  const [ragProjects, setRagProjects] = useState<RAGProject[]>([]);
  const [ragWorlds, setRagWorlds] = useState<RAGWorld[]>([]);
  const [ragCharacters, setRagCharacters] = useState<RAGCharacter[]>([]);
  const [ragWorldAssets, setRagWorldAssets] = useState<RAGWorldAsset[]>([]);
  const [ragScenes, setRagScenes] = useState<RAGScene[]>([]);
  const [ragCustomFiles, setRagCustomFiles] = useState<RAGCustomFile[]>([]);

  // ✅ PERFORMANCE FIX: Track if RAG data has been loaded
  const [ragDataLoaded, setRagDataLoaded] = useState(false);

  // ✅ PERFORMANCE FIX: Load RAG data lazily (only when user uses @ / # references)
  const loadRAGDataLazy = async () => {
    if (ragDataLoaded) {
      console.log("✅ RAG data already loaded (skipping)");
      return;
    }

    try {
      console.log("🔄 Loading RAG data...");

      // Load projects
      const projectsData = await projectsApi.getAll();
      setRagProjects(
        projectsData.map((p: any) => ({
          id: p.id,
          title: p.title,
          type: p.type || "Movie",
          lastEdited: new Date(p.lastEdited),
        })),
      );

      // Load worlds
      const worldsData = await worldsApi.getAll();
      setRagWorlds(
        worldsData.map((w: any) => ({
          id: w.id,
          name: w.name,
          category: w.description || "Worldbuilding",
          lastEdited: new Date(w.lastEdited),
        })),
      );

      // Load characters from all projects
      const allCharacters: RAGCharacter[] = [];
      for (const project of projectsData) {
        try {
          const chars = await charactersApi.getAll(project.id);
          chars.forEach((char: any) => {
            allCharacters.push({
              id: char.id,
              name: char.name,
              project: project.title,
              lastEdited: new Date(char.lastEdited || project.lastEdited),
            });
          });
        } catch (error) {
          console.error(
            `Error loading characters for project ${project.id}:`,
            error,
          );
        }
      }
      setRagCharacters(allCharacters);

      // Load scenes from all projects
      const allScenes: RAGScene[] = [];
      for (const project of projectsData) {
        try {
          const scenes = await scenesApi.getAll(project.id);
          scenes.forEach((scene: any) => {
            allScenes.push({
              id: scene.id,
              name: scene.title || scene.name,
              project: project.title,
              lastEdited: new Date(scene.lastEdited || project.lastEdited),
            });
          });
        } catch (error) {
          console.error(
            `Error loading scenes for project ${project.id}:`,
            error,
          );
        }
      }
      setRagScenes(allScenes);

      // Load world assets (items) from all worlds
      const allAssets: RAGWorldAsset[] = [];
      for (const world of worldsData) {
        try {
          const items = await itemsApi.getAllForWorld(world.id);
          items.forEach((item: any) => {
            allAssets.push({
              id: item.id,
              name: item.title || item.name,
              category: item.categoryId || "General",
              world: world.name,
              lastEdited: new Date(item.lastEdited || world.lastEdited),
            });
          });
        } catch (error) {
          console.error(`Error loading items for world ${world.id}:`, error);
        }
      }
      setRagWorldAssets(allAssets);

      setRagDataLoaded(true);
      console.log("✅ RAG data loaded");
    } catch (error) {
      console.error("Failed to load RAG data:", error);
    }
  };

  /** Projekte/Welten/… laden sobald die RAG-Datenbank geöffnet wird (nicht nur bei @ / # in der Eingabe). */
  useEffect(() => {
    if (!isRAGDatabaseOpen) return;
    void loadRAGDataLazy();
  }, [isRAGDatabaseOpen]);

  // ✅ PERFORMANCE FIX: Cache assistant runtime to avoid repeated model/runtime fetches
  const [runtimeCache, setRuntimeCache] =
    useState<AssistantRuntimeResponse | null>(null);
  const [runtimeCacheTime, setRuntimeCacheTime] = useState<number>(0);
  const CACHE_DURATION = 60000; // 1 minute cache

  /** Bumps on each runtime load so overlapping async runs cannot clobber UI. */
  const loadRuntimeGenRef = useRef(0);

  const applyAssistantRuntime = (runtime: AssistantRuntimeResponse) => {
    const normalizedModels = Array.isArray(runtime.models_with_context)
      ? runtime.models_with_context
          .filter((m) => m && typeof m.id === "string" && m.id.trim())
          .map((m) => ({
            id: String(m.id ?? ""),
            name: String(m.name ?? m.id ?? ""),
            context_window: Number(m.context_window ?? 200000),
          }))
      : [];
    const selectedModel =
      runtime.selected_model && runtime.selected_model.id
        ? {
            id: String(runtime.selected_model.id),
            name: String(
              runtime.selected_model.name ?? runtime.selected_model.id,
            ),
            context_window: Number(
              runtime.selected_model.context_window ?? 200000,
            ),
          }
        : null;
    const mergedModels =
      selectedModel && !findModelByIdLoose(normalizedModels, selectedModel.id)
        ? [selectedModel, ...normalizedModels]
        : normalizedModels;
    const nextModel = runtime.model?.trim() || selectedModel?.id || "";
    const preferred =
      findModelByIdLoose(mergedModels, nextModel) ||
      selectedModel ||
      mergedModels[0];

    setAvailableModels(mergedModels);
    setActiveProviderDisplay(
      runtime.provider_display || runtime.provider || "",
    );
    setAssistantReady(Boolean(runtime.can_send));
    setAssistantStatusError(runtime.error || null);
    setModel(nextModel);

    if (
      preferred &&
      Number.isFinite(preferred.context_window) &&
      preferred.context_window > 0
    ) {
      tokenCounter.setContextWindow(preferred.context_window);
    }
  };

  const loadAssistantRuntime = async (forceRefresh = false) => {
    const gen = ++loadRuntimeGenRef.current;
    const isStale = () => gen !== loadRuntimeGenRef.current;

    try {
      const now = Date.now();
      const cacheValid =
        runtimeCache != null &&
        !forceRefresh &&
        now - runtimeCacheTime < CACHE_DURATION;

      if (cacheValid && runtimeCache) {
        if (isStale()) return;
        applyAssistantRuntime(runtimeCache);
        return;
      }

      const runtimeResult = await apiGet<AssistantRuntimeResponse>(
        "/features/assistant_chat/runtime",
      );
      if (isStale()) return;

      if ("error" in runtimeResult && runtimeResult.error) {
        throw new Error(
          runtimeResult.error.message ||
            "Assistant-Laufzeit konnte nicht geladen werden.",
        );
      }

      if (!runtimeResult.data) {
        throw new Error("Assistant-Laufzeit konnte nicht geladen werden.");
      }

      setRuntimeCache(runtimeResult.data);
      setRuntimeCacheTime(now);
      applyAssistantRuntime(runtimeResult.data);
    } catch (error) {
      console.error("Error loading assistant runtime:", error);
      if (gen !== loadRuntimeGenRef.current) return;
      setAssistantReady(false);
      setAssistantStatusError(
        error instanceof Error
          ? error.message
          : "Assistant-Laufzeit konnte nicht geladen werden.",
      );
      setAvailableModels([]);
      setActiveProviderDisplay("");
      setModel("");
    }
  };

  /** Keep context bar aligned with the resolved model row (survives chat history model changes). */
  useEffect(() => {
    if (!model.trim() || availableModels.length === 0) return;
    const row = findModelByIdLoose(availableModels, model);
    if (row && Number.isFinite(row.context_window) && row.context_window > 0) {
      tokenCounter.setContextWindow(row.context_window);
    }
  }, [model, availableModels, tokenCounter.setContextWindow]);

  useEffect(() => {
    if (isOpen) {
      void loadAssistantRuntime(false);
      loadCurrentConversation();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleSettingsUpdated = () => {
      console.log("🔄 Assistant runtime invalidated after settings update");
      setRuntimeCache(null);
      setRuntimeCacheTime(0);
      void loadAssistantRuntime(true);
    };

    window.addEventListener(
      SCRIPTONY_AI_SETTINGS_UPDATED_EVENT,
      handleSettingsUpdated,
    );
    return () => {
      window.removeEventListener(
        SCRIPTONY_AI_SETTINGS_UPDATED_EVENT,
        handleSettingsUpdated,
      );
    };
  }, []);

  const loadChatHistory = async () => {
    try {
      const result = await apiGet("/ai/conversations");
      if (result.data) {
        const conversations = result.data.conversations || [];
        setChatHistory(
          conversations.map((conv: any) => ({
            id: conv.id,
            title: conv.title,
            lastEdited: new Date(conv.last_message_at || conv.updated_at),
            model: model, // We don't store model in DB yet, use current
            messages: [], // Messages loaded separately when needed
          })),
        );
      }
    } catch (error: any) {
      console.error("Failed to load chat history:", error);
    }
  };

  const loadCurrentConversation = async () => {
    // If there's a current conversation ID, load its messages
    if (currentConversationId) {
      try {
        const result = await apiGet(
          `/ai/conversations/${currentConversationId}/messages`,
        );
        if (result.data) {
          const msgs = result.data.messages || [];
          setMessages(
            msgs.map((msg: any) => ({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: new Date(msg.created_at),
            })),
          );
        }
      } catch (error: any) {
        console.error("Failed to load messages:", error);
      }
    }
  };

  // Load system prompt when dialog opens
  useEffect(() => {
    async function loadSystemPrompt() {
      try {
        // Load global system prompt
        const settingsResult = await apiGet("/ai/settings");
        if (settingsResult.data?.settings) {
          const raw = settingsResult.data.settings.system_prompt;
          setSystemPrompt(
            normalizeAssistantSystemPrompt(
              typeof raw === "string" ? raw : null,
            ),
          );
        }
      } catch (error) {
        console.error("Failed to load system prompt:", error);
      }
    }

    if (isSystemPromptOpen) {
      loadSystemPrompt();
    }
  }, [isSystemPromptOpen]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Check if any RAG items are connected
  const hasRAGConnections = useMemo(() => {
    return selectedRAGProjects.length > 0 || selectedRAGWorlds.length > 0;
  }, [selectedRAGProjects, selectedRAGWorlds]);

  // Get characters from connected projects and worlds
  const availableCharacters = useMemo(() => {
    const connectedProjects = ragProjects.filter((p) =>
      selectedRAGProjects.includes(p.id),
    );
    const connectedWorlds = ragWorlds.filter((w) =>
      selectedRAGWorlds.includes(w.id),
    );

    return ragCharacters.filter((char) => {
      if (char.project) {
        return connectedProjects.some((p) => p.title === char.project);
      }
      if (char.world) {
        return connectedWorlds.some((w) => w.name === char.world);
      }
      return false;
    });
  }, [
    ragProjects,
    ragWorlds,
    ragCharacters,
    selectedRAGProjects,
    selectedRAGWorlds,
  ]);

  // Get assets from connected worlds
  const availableAssets = useMemo(() => {
    const connectedWorlds = ragWorlds.filter((w) =>
      selectedRAGWorlds.includes(w.id),
    );

    return ragWorldAssets.filter((asset) => {
      return connectedWorlds.some((w) => w.name === asset.world);
    });
  }, [ragWorlds, ragWorldAssets, selectedRAGWorlds]);

  // Get scenes from connected projects
  const availableScenes = useMemo(() => {
    const connectedProjects = ragProjects.filter((p) =>
      selectedRAGProjects.includes(p.id),
    );

    return ragScenes.filter((scene) => {
      return connectedProjects.some((p) => p.title === scene.project);
    });
  }, [ragProjects, ragScenes, selectedRAGProjects]);

  // Filter suggestions based on search
  const filteredSuggestions = useMemo(() => {
    if (suggestionsType === "@") {
      return availableCharacters.filter((char) =>
        char.name.toLowerCase().includes(suggestionSearch.toLowerCase()),
      );
    } else if (suggestionsType === "/") {
      return availableAssets.filter((asset) =>
        asset.name.toLowerCase().includes(suggestionSearch.toLowerCase()),
      );
    } else if (suggestionsType === "#") {
      return availableScenes.filter((scene) =>
        scene.name.toLowerCase().includes(suggestionSearch.toLowerCase()),
      );
    }
    return [];
  }, [
    suggestionsType,
    suggestionSearch,
    availableCharacters,
    availableAssets,
    availableScenes,
  ]);

  // Use the colored tags hook
  const { colorizeText } = useColoredTags({
    characters: availableCharacters,
    assets: availableAssets,
    scenes: availableScenes,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 80) + "px";

    // Token estimation while typing
    tokenCounter.estimateInput(newValue);

    // Backend accurate count (debounced)
    tokenCounter.countInputAccurate(newValue);

    // Check for autocomplete trigger characters
    const lastChar = newValue.slice(-1);
    const cursorPosition = e.target.selectionStart || 0;
    const textBeforeCursor = newValue.slice(0, cursorPosition);

    // Find the most recent trigger character (@, /, #)
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    const lastSlashIndex = textBeforeCursor.lastIndexOf("/");
    const lastHashIndex = textBeforeCursor.lastIndexOf("#");
    const maxIndex = Math.max(lastAtIndex, lastSlashIndex, lastHashIndex);

    let shouldShowSuggestions = false;
    let triggerType: "@" | "/" | "#" | null = null;
    let searchText = "";

    if (maxIndex !== -1) {
      if (maxIndex === lastAtIndex) {
        // @ is most recent
        searchText = textBeforeCursor.slice(lastAtIndex + 1);
        if (!searchText.includes(" ") && !searchText.includes("\n")) {
          shouldShowSuggestions = true;
          triggerType = "@";
        }
      } else if (maxIndex === lastSlashIndex) {
        // / is most recent
        searchText = textBeforeCursor.slice(lastSlashIndex + 1);
        if (!searchText.includes(" ") && !searchText.includes("\n")) {
          shouldShowSuggestions = true;
          triggerType = "/";
        }
      } else if (maxIndex === lastHashIndex) {
        // # is most recent
        searchText = textBeforeCursor.slice(lastHashIndex + 1);
        if (!searchText.includes(" ") && !searchText.includes("\n")) {
          shouldShowSuggestions = true;
          triggerType = "#";
        }
      }
    }

    if (shouldShowSuggestions && triggerType) {
      // ✅ PERFORMANCE FIX: Load RAG data only when user actually uses references
      if (!ragDataLoaded) {
        loadRAGDataLazy();
      }

      setSuggestionsType(triggerType);
      setSuggestionSearch(searchText);
      setShowSuggestions(true);
      setSelectedSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestionsType(null);
      setSuggestionSearch("");
    }
  };

  const insertSuggestion = (name: string) => {
    if (!inputRef.current) return;

    const cursorPosition = inputRef.current.selectionStart || 0;
    const textBeforeCursor = inputValue.slice(0, cursorPosition);
    const textAfterCursor = inputValue.slice(cursorPosition);

    // Find the trigger position
    const triggerChar = suggestionsType;
    const lastTriggerIndex = textBeforeCursor.lastIndexOf(triggerChar || "");

    if (lastTriggerIndex === -1 || triggerChar == null) return;

    // Replace from trigger to cursor with the selected name
    const newValue =
      textBeforeCursor.slice(0, lastTriggerIndex) +
      triggerChar +
      name +
      " " +
      textAfterCursor;

    setInputValue(newValue);
    setShowSuggestions(false);
    setSuggestionsType(null);
    setSuggestionSearch("");

    // Reset textarea height
    if (inputRef.current) {
      setTimeout(() => {
        const textarea = inputRef.current as unknown as HTMLTextAreaElement;
        if (textarea) {
          textarea.style.height = "auto";
          textarea.style.height = Math.min(textarea.scrollHeight, 80) + "px";
        }
      }, 0);
    }

    // Set focus back to input
    setTimeout(() => {
      if (inputRef.current) {
        const newCursorPosition =
          lastTriggerIndex + triggerChar.length + name.length + 1;
        inputRef.current.focus();
        inputRef.current.setSelectionRange(
          newCursorPosition,
          newCursorPosition,
        );
      }
    }, 0);
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (!assistantReady) {
      toast.error(
        assistantStatusError ||
          "Bitte konfiguriere zuerst Provider und Modell in den Integrationen.",
      );
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageContent = inputValue;
    setInputValue("");
    setShowSuggestions(false);
    setSuggestionsType(null);
    setSuggestionSearch("");
    setIsLoading(true);

    // Reset textarea height
    if (inputRef.current) {
      const textarea = inputRef.current as unknown as HTMLTextAreaElement;
      textarea.style.height = "auto";
    }

    try {
      // Call real AI backend
      const result = await apiPost("/ai/chat", {
        conversation_id: currentConversationId,
        message: messageContent,
        use_rag: true,
        rag_project_ids: selectedRAGProjects,
        rag_world_ids: selectedRAGWorlds,
        rag_character_ids: selectedRAGCharacters,
      });

      if (result.data) {
        const {
          conversation_id,
          message: assistantMessage,
          token_details,
        } = result.data;

        // Validate assistantMessage exists
        if (!assistantMessage || !assistantMessage.content) {
          console.error(
            "Invalid AI response - no message content:",
            result.data,
          );
          toast.error(
            "AI-Antwort ungültig. Bitte prüfe deine API Key Konfiguration.",
          );
          // Remove user message on error
          setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
          return;
        }

        // Always trust backend conversation_id to keep one continuous session while assistant stays open.
        if (conversation_id && conversation_id !== currentConversationId) {
          setCurrentConversationId(conversation_id);
          // Update title from first message
          if (!currentConversationId && messages.length === 0) {
            const shortTitle =
              messageContent.slice(0, 50) +
              (messageContent.length > 50 ? "..." : "");
            setChatTitle(shortTitle);
          }
          // Reload chat history to show new conversation
          await loadChatHistory();
        }

        // Add AI response to messages
        const aiMsg: Message = {
          id: assistantMessage.id || `ai-${Date.now()}`,
          role: "assistant",
          content: assistantMessage.content,
          timestamp: new Date(assistantMessage.created_at || Date.now()),
        };
        setMessages((prev) => [...prev, aiMsg]);

        // Update token counter with accurate backend data
        if (token_details) {
          tokenCounter.updateFromResponse({
            input_tokens: token_details.input_tokens,
            output_tokens: token_details.output_tokens,
            total_tokens: token_details.total_tokens,
          });
        }

        // If this was an immediate response (background tools), poll for follow-up message
        const isBackgroundToolResponse = aiMsg.content.includes(
          "⏳ Dies kann einige Sekunden dauern",
        );

        if (isBackgroundToolResponse) {
          console.log(
            "⏳ Background tools detected - polling for follow-up message...",
          );

          // Poll every 2 seconds for up to 60 seconds
          let pollCount = 0;
          const maxPolls = 30;
          const pollInterval = setInterval(async () => {
            pollCount++;

            try {
              const pollResult = await apiGet(
                `/ai/conversations/${conversation_id}/messages`,
              );
              if (pollResult.data) {
                const newMessages = pollResult.data.messages || [];

                // Find messages newer than our immediate response
                const newerMessages = newMessages.filter((msg: any) => {
                  const msgTime = new Date(msg.created_at).getTime();
                  const ourTime = aiMsg.timestamp.getTime();
                  return msgTime > ourTime && msg.id !== aiMsg.id;
                });

                if (newerMessages.length > 0) {
                  console.log(
                    `✅ Found ${newerMessages.length} new message(s) - updating chat`,
                  );

                  // Add new messages to state (avoid duplicates)
                  setMessages((prev) => {
                    const existingIds = new Set(prev.map((m) => m.id));
                    const newMsgs = newerMessages
                      .filter((msg: any) => !existingIds.has(msg.id))
                      .map((msg: any) => ({
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        timestamp: new Date(msg.created_at),
                      }));

                    return [...prev, ...newMsgs];
                  });

                  clearInterval(pollInterval);
                  toast.success("Aktionen abgeschlossen!");
                }
              }
            } catch (error) {
              console.error("Polling error:", error);
            }

            // Stop polling after max attempts
            if (pollCount >= maxPolls) {
              console.log("⏰ Polling timeout - stopping");
              clearInterval(pollInterval);
            }
          }, 2000);
        }
      } else {
        console.error("No data in AI response:", result);
        toast.error(
          "Keine Antwort von der AI erhalten. Bitte prüfe deine Einstellungen.",
        );
        // Remove user message on error
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      }
    } catch (error: any) {
      console.error("Failed to send message:", error);

      // Better error messages
      let errorMessage = "Fehler beim Senden der Nachricht";

      if (error.message?.includes("No API key")) {
        errorMessage = "Bitte konfiguriere einen API Key in den Chat Settings";
      } else if (error.message?.includes("Unauthorized")) {
        errorMessage = "Nicht autorisiert. Bitte neu einloggen.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast.error(errorMessage);

      // Remove user message on error
      setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    // Handle autocomplete navigation
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : prev,
        );
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSuggestionIndex((prev) => (prev > 0 ? prev - 1 : prev));
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const suggestion = filteredSuggestions[selectedSuggestionIndex];
        if (suggestion) {
          insertSuggestion(suggestion.name);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowSuggestions(false);
        return;
      }
    }

    // Normal message sending
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
    tokenCounter.reset();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setUploadedFiles((prev) => [...prev, ...newFiles]);
      toast.success(`${newFiles.length} Datei(en) hochgeladen`);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleSaveSystemPrompt = async () => {
    try {
      if (currentConversationId) {
        // Save to current conversation only
        await apiPut(`/ai/conversations/${currentConversationId}/prompt`, {
          system_prompt: systemPrompt,
        });
        toast.success("System-Prompt für diesen Chat gespeichert");
      } else {
        // Save as global default
        await apiPut("/ai/settings", {
          system_prompt: systemPrompt,
        });
        toast.success("Globaler System-Prompt gespeichert");
      }
      setLastEditedDate(new Date());
      setIsSystemPromptOpen(false);
    } catch (error: any) {
      console.error("Failed to save system prompt:", error);
      toast.error("Fehler beim Speichern des System-Prompts");
    }
  };

  const handleTitleClick = () => {
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.select(), 0);
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (!chatTitle.trim()) {
      const now = new Date();
      setChatTitle(
        `Scriptony Assistant Chat - ${now.toLocaleDateString("de-DE")} - ${now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`,
      );
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setIsEditingTitle(false);
    }
    if (e.key === "Escape") {
      setIsEditingTitle(false);
    }
  };

  // Filter and search chat history
  const filteredChatHistory = useMemo(() => {
    return chatHistory
      .filter((chat) => {
        // Text search - searches through title only (messages not loaded in list)
        const searchLower = chatHistorySearch.toLowerCase();
        const matchesSearch =
          !chatHistorySearch || chat.title.toLowerCase().includes(searchLower);

        // Date filter
        const chatDate = chat.lastEdited;
        const matchesDateFrom = !dateFilterFrom || chatDate >= dateFilterFrom;
        const matchesDateTo =
          !dateFilterTo ||
          chatDate <=
            new Date(
              dateFilterTo.getFullYear(),
              dateFilterTo.getMonth(),
              dateFilterTo.getDate(),
              23,
              59,
              59,
            );

        return matchesSearch && matchesDateFrom && matchesDateTo;
      })
      .sort((a, b) => b.lastEdited.getTime() - a.lastEdited.getTime());
  }, [chatHistory, chatHistorySearch, dateFilterFrom, dateFilterTo]);

  const handleLoadChat = async (chat: ChatHistory) => {
    try {
      // Load messages for this conversation
      const result = await apiGet(`/ai/conversations/${chat.id}/messages`);
      if (result.data) {
        const msgs = result.data.messages || [];
        setMessages(
          msgs.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
          })),
        );
      }

      setChatTitle(chat.title);
      setModel(chat.model);
      setCurrentConversationId(chat.id);
      setIsChatHistoryOpen(false);
      toast.success(`Chat "${chat.title}" geladen`);
    } catch (error: any) {
      console.error("Failed to load chat:", error);
      toast.error("Fehler beim Laden des Chats");
    }
  };

  const handleNewChat = () => {
    // Current chat is automatically saved in backend
    // Just reset local state for new conversation
    const now = new Date();
    setChatTitle(
      `Scriptony Assistant Chat - ${now.toLocaleDateString("de-DE")} - ${now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}`,
    );
    setMessages([]);
    setCurrentConversationId(null);
    tokenCounter.reset();
    setIsChatHistoryOpen(false);

    // Reload chat history to include the old chat
    loadChatHistory();

    toast.success("Neuer Chat gestartet");
  };

  // RAG Database handlers
  const toggleRAGProject = (id: string) => {
    setSelectedRAGProjects((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  };

  const toggleRAGWorld = (id: string) => {
    setSelectedRAGWorlds((prev) =>
      prev.includes(id) ? prev.filter((w) => w !== id) : [...prev, id],
    );
  };

  const toggleRAGCharacter = (id: string) => {
    setSelectedRAGCharacters((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleRAGCustomFile = (id: string) => {
    setSelectedRAGCustomFiles((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id],
    );
  };

  const handleRAGFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files).map((file) => ({
        id: `f-${Date.now()}-${Math.random()}`,
        name: file.name,
        type: file.name.split(".").pop() || "unknown",
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        uploadedAt: new Date(),
      }));
      setRagCustomFiles((prev) => [...prev, ...newFiles]);
      toast.success(
        `${newFiles.length} Datei(en) zur RAG-Datenbank hinzugefügt`,
      );
    }
  };

  const filteredRAGItems = useMemo(() => {
    const searchLower = ragSearch.toLowerCase();

    return {
      projects: ragProjects.filter(
        (p) =>
          p.title.toLowerCase().includes(searchLower) ||
          p.type.toLowerCase().includes(searchLower),
      ),
      worlds: ragWorlds.filter(
        (w) =>
          w.name.toLowerCase().includes(searchLower) ||
          w.category.toLowerCase().includes(searchLower),
      ),
      characters: ragCharacters.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          (c.project?.toLowerCase().includes(searchLower) ?? false),
      ),
      customFiles: ragCustomFiles.filter(
        (f) =>
          f.name.toLowerCase().includes(searchLower) ||
          f.type.toLowerCase().includes(searchLower),
      ),
    };
  }, [ragSearch, ragProjects, ragWorlds, ragCharacters, ragCustomFiles]);

  const handleExportChat = () => {
    if (messages.length === 0) {
      toast.error("Keine Nachrichten zum Exportieren");
      return;
    }

    const fileName = `${exportFileName}.${exportFormat}`;
    let content = "";
    let mimeType = "";

    switch (exportFormat) {
      case "json":
        content = JSON.stringify(messages, null, 2);
        mimeType = "application/json";
        break;

      case "md":
        content = `# ${exportFileName}\n\n`;
        content += `**Exportiert am:** ${new Date().toLocaleString("de-DE")}\n\n`;
        content += `**Modell:** ${model}\n\n`;
        content += `---\n\n`;
        messages.forEach((msg) => {
          const role = msg.role === "user" ? "👤 User" : "🤖 Assistant";
          const time = msg.timestamp.toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
          });
          content += `### ${role} (${time})\n\n${msg.content}\n\n`;
        });
        mimeType = "text/markdown";
        break;

      case "pdf": {
        // For PDF, we'll create a simple HTML representation and use browser print
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <title>${exportFileName}</title>
            <style>
              body { font-family: Inter, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
              h1 { color: #6E59A5; }
              .meta { color: #666; margin-bottom: 20px; }
              .message { margin: 20px 0; padding: 15px; border-radius: 8px; }
              .user { background: #E5DEFF; }
              .assistant { background: #F5F6F8; }
              .role { font-weight: bold; margin-bottom: 8px; }
              .time { font-size: 12px; color: #666; }
            </style>
          </head>
          <body>
            <h1>${exportFileName}</h1>
            <div class="meta">
              <p><strong>Exportiert am:</strong> ${new Date().toLocaleString("de-DE")}</p>
              <p><strong>Modell:</strong> ${model}</p>
            </div>
            ${messages
              .map(
                (msg) => `
              <div class="message ${msg.role}">
                <div class="role">${msg.role === "user" ? "👤 User" : "🤖 Assistant"}</div>
                <div class="time">${msg.timestamp.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}</div>
                <p>${msg.content}</p>
              </div>
            `,
              )
              .join("")}
          </body>
          </html>
        `;

        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
          }, 250);
        }
        setIsExportDialogOpen(false);
        toast.success("PDF-Druckvorschau geöffnet");
        return;
      }
    }

    // Create and download file for JSON and MD
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExportDialogOpen(false);
    toast.success(`Chat als ${exportFormat.toUpperCase()} exportiert`);
  };

  return (
    <>
      {/* Floating Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="fixed bottom-20 right-4 z-[60] flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-0 shadow-lg transition-all hover:scale-110 hover:shadow-xl hover:brightness-105 active:scale-95"
        style={{ backgroundColor: "rgba(142, 117, 209, 1)" }}
        aria-label={
          isOpen
            ? "Scriptony Assistant schließen"
            : "Scriptony Assistant öffnen"
        }
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="h-6 w-6 text-white" />
        ) : (
          <MessageCircle className="h-6 w-6 text-white" />
        )}
      </button>

      {/* Floating Chat Panel */}
      <Sheet open={isOpen} onOpenChange={setIsOpen} modal={false}>
        <SheetContent
          hideOverlay
          side="bottom"
          onInteractOutside={(event) => event.preventDefault()}
          className="assistant-floating-panel p-0 flex flex-col overflow-hidden border bg-[#F8F8F8] shadow-2xl dark:bg-background [&>button]:hidden"
          style={{
            left: "auto",
            right: "1rem",
            bottom: "9rem",
            width: "calc(100vw - 2rem)",
            maxWidth: "376px",
            height: "670px",
            maxHeight: "calc(100vh - 11rem)",
            borderRadius: "1.5rem",
            /* Above sticky nav / bottom bars (z-50); below modal layer (z-[100]) */
            zIndex: 60,
          }}
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Scriptony Assistant</SheetTitle>
            <SheetDescription>
              AI-gestützter Assistent für deine Drehbuch-Projekte
            </SheetDescription>
          </SheetHeader>

          <div className="relative h-full w-full flex flex-col overflow-hidden">
            {/* Top Right Buttons */}
            <div className="absolute right-4 top-2 z-50 flex items-center gap-2">
              <button
                onClick={handleNewChat}
                className="h-[31px] px-3 rounded-[10px] bg-[#e4e6ea] dark:bg-muted flex items-center justify-center gap-1.5 hover:bg-gray-300 dark:hover:bg-muted/80 transition-colors active:scale-95 text-[#646567] dark:text-foreground text-[11px] font-medium"
                aria-label="Neuer Chat"
              >
                <Plus className="size-3.5" />
                New Chat
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="size-[31px] rounded-[10px] bg-primary flex items-center justify-center hover:bg-primary/90 transition-colors active:scale-95"
                aria-label="Schließen"
              >
                <X className="size-[14px] text-white" />
              </button>
            </div>

            {/* Header Section */}
            <div className="flex-shrink-0 px-4 pt-2 pb-2">
              {/* Title with Icon - Left aligned */}
              <div className="flex items-center gap-2 mb-5">
                <div className="size-[20px] flex items-center justify-center">
                  <AssistantIcon />
                </div>
                <h3 className="text-[#6e59a5] dark:text-primary text-[15.4px] font-semibold">
                  Scriptony Assistant
                </h3>
              </div>

              {/* Editable Chat Title */}
              <div className="mb-3 relative">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    type="text"
                    value={chatTitle}
                    onChange={(e) => setChatTitle(e.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={handleTitleKeyDown}
                    className="w-full bg-[#e4e6ea] dark:bg-muted border-0 rounded-[10px] px-3 py-2 pr-10 text-[#646567] dark:text-foreground text-[13px] outline-none focus:ring-2 focus:ring-primary"
                  />
                ) : (
                  <div className="w-full bg-[#e4e6ea] dark:bg-muted rounded-[10px] px-3 py-2 pr-10 text-[#646567] dark:text-foreground text-[13px] flex items-center">
                    <span className="flex-1">{chatTitle}</span>
                  </div>
                )}
                <button
                  onClick={handleTitleClick}
                  className="absolute right-2 top-1/2 -translate-y-1/2 size-[24px] flex items-center justify-center rounded-md text-[#6e59a5] hover:bg-[#6e59a5]/15 dark:text-primary dark:hover:bg-primary/20 transition-colors"
                  aria-label="Titel bearbeiten"
                >
                  <div className="size-[16px] text-inherit">
                    <BxEdit />
                  </div>
                </button>
              </div>

              {/* Model Selection and Context Window in one row */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                {/* Model Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[#a1a1a7] dark:text-muted-foreground text-[10px]">
                      Modell:
                    </label>
                    {activeProviderDisplay && (
                      <Badge
                        variant="outline"
                        className="h-4 px-1 text-[8px] capitalize"
                      >
                        {activeProviderDisplay}
                      </Badge>
                    )}
                  </div>
                  {!assistantReady ? (
                    <button
                      type="button"
                      onClick={() => setIsChatSettingsOpen(true)}
                      className="h-[32px] w-full bg-destructive/10 dark:bg-destructive/20 border border-destructive/50 rounded-[10px] px-2 flex items-center justify-center hover:bg-destructive/15 dark:hover:bg-destructive/25 transition-colors"
                      title={
                        assistantStatusError ||
                        "Öffnet die KI-Integrationen zur Konfiguration von Provider und Modell."
                      }
                    >
                      <span className="text-destructive text-[9px] font-medium text-center leading-tight">
                        Assistant konfigurieren
                      </span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      title="Öffnet die KI-Einstellungen (Provider, API-Keys, Modell — wie Einstellungen → Integrationen)."
                      aria-label="KI-Einstellungen und Modell"
                      onClick={() => setIsChatSettingsOpen(true)}
                      className="flex w-full items-center justify-between gap-2 border-0 bg-[#e4e6ea] px-3 dark:bg-muted rounded-[10px] h-[32px] text-[#646567] dark:text-foreground text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0"
                    >
                      <span className="min-w-0 truncate text-left">
                        {availableModels.find((m) => m.id === model)?.name ??
                          (model ? model : "Modell wählen…")}
                      </span>
                      <ChevronDown
                        className="size-4 shrink-0 opacity-50 pointer-events-none"
                        aria-hidden
                      />
                    </button>
                  )}
                </div>

                {/* Context Window */}
                <div>
                  <label className="text-[#a1a1a7] dark:text-muted-foreground text-[10px] mb-1 block">
                    Context:
                  </label>
                  {!assistantReady ? (
                    <button
                      type="button"
                      onClick={() => setIsChatSettingsOpen(true)}
                      className="h-[32px] w-full bg-destructive/10 dark:bg-destructive/20 border border-destructive/50 rounded-[10px] px-2 flex items-center justify-center hover:bg-destructive/15 dark:hover:bg-destructive/25 transition-colors"
                      title={
                        assistantStatusError ||
                        "Öffnet die KI-Integrationen zur Konfiguration von Provider und Modell."
                      }
                    >
                      <span className="text-destructive text-[9px] font-medium text-center leading-tight">
                        in Integrationen
                      </span>
                    </button>
                  ) : (
                    <div className="bg-[#e4e6ea] dark:bg-muted rounded-[10px] px-3 py-2 h-[32px] flex items-center justify-between">
                      <span className="text-[#727375] dark:text-muted-foreground text-[10px]">
                        {tokenCounter.formatted.total} /{" "}
                        {tokenCounter.formatted.contextWindow}
                        {tokenCounter.isEstimating && (
                          <span className="text-[9px] ml-0.5 opacity-60">
                            ~
                          </span>
                        )}
                      </span>
                      <div className="w-12 bg-[#d4d6da] dark:bg-background rounded-full h-1 overflow-hidden ml-2">
                        <div
                          className={`h-full transition-all ${
                            tokenCounter.isOverLimit
                              ? "bg-destructive"
                              : tokenCounter.isNearLimit
                                ? "bg-orange-500"
                                : "bg-[#6e59a5] dark:bg-primary"
                          }`}
                          style={{
                            width: `${Math.min(tokenCounter.usagePercent, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-5 gap-2">
                <button
                  onClick={() => setIsChatHistoryOpen(true)}
                  className="bg-primary rounded-[10px] p-2 flex flex-col items-center justify-center gap-1 hover:bg-primary/90 transition-colors active:scale-95 min-h-[64px]"
                >
                  <div className="size-[20px] flex items-center justify-center text-white">
                    <ChatHistoryIcon />
                  </div>
                  <span className="text-white text-[7px] leading-tight text-center">
                    Chat-History
                  </span>
                </button>

                <button
                  onClick={() => setIsRAGDatabaseOpen(true)}
                  className="bg-primary rounded-[10px] p-2 flex flex-col items-center justify-center gap-1 hover:bg-primary/90 transition-colors active:scale-95 min-h-[64px] relative"
                >
                  {(selectedRAGProjects.length > 0 ||
                    selectedRAGWorlds.length > 0 ||
                    selectedRAGCharacters.length > 0 ||
                    selectedRAGCustomFiles.length > 0) && (
                    <div className="absolute top-1 left-1 size-3 bg-green-500 rounded-sm flex items-center justify-center">
                      <CheckSquare
                        className="size-2 text-white"
                        strokeWidth={3}
                      />
                    </div>
                  )}
                  <div className="size-[20px] flex items-center justify-center text-white">
                    <DatabaseIcon />
                  </div>
                  <span className="text-white text-[7px] leading-tight text-center">
                    RAG-Datenbank
                  </span>
                </button>

                <button
                  onClick={() => setIsSystemPromptOpen(true)}
                  className="bg-primary rounded-[10px] p-2 flex flex-col items-center justify-center gap-1 hover:bg-primary/90 transition-colors active:scale-95 min-h-[64px] relative"
                >
                  {systemPrompt.trim() && lastEditedDate && (
                    <div className="absolute top-1 left-1 size-3 bg-green-500 rounded-sm flex items-center justify-center">
                      <CheckSquare
                        className="size-2 text-white"
                        strokeWidth={3}
                      />
                    </div>
                  )}
                  <div className="size-[20px] flex items-center justify-center text-white">
                    <SystemPromptIcon />
                  </div>
                  <span className="text-white text-[7px] leading-tight text-center">
                    System-Prompt
                  </span>
                </button>

                <button
                  onClick={() => {
                    setExportFileName(chatTitle);
                    setIsExportDialogOpen(true);
                  }}
                  className="bg-primary rounded-[10px] p-2 flex flex-col items-center justify-center gap-1 hover:bg-primary/90 transition-colors active:scale-95 min-h-[64px]"
                >
                  <div className="size-[20px] flex items-center justify-center text-white">
                    <ExportIcon />
                  </div>
                  <span className="text-white text-[7px] leading-tight text-center">
                    Export Chat
                  </span>
                </button>

                <button
                  onClick={() => setIsChatSettingsOpen(true)}
                  className="bg-primary rounded-[10px] p-2 flex flex-col items-center justify-center gap-1 hover:bg-primary/90 transition-colors active:scale-95 min-h-[64px]"
                >
                  <div className="size-[20px] flex items-center justify-center text-white">
                    <SettingsIcon />
                  </div>
                  <span className="text-white text-[7px] leading-tight text-center">
                    Chat Settings
                  </span>
                </button>
              </div>
            </div>

            {/* Chat Messages Area - Fixed Height with Scroll */}
            <div className="flex-1 min-h-0 overflow-hidden">
              <ScrollArea className="h-full px-4">
                {messages.length === 0 ? (
                  <div className="flex h-full items-center justify-center">
                    <div className="text-center px-4 mt-8">
                      <div className="size-[73px] mx-auto mb-6 flex items-center justify-center">
                        <EmptyChatIcon />
                      </div>
                      <h3 className="text-[20px] text-[#9d9da5] mb-4">
                        Starte eine Konversation
                      </h3>
                      <p className="text-[14.8px] text-[#9d9da5] leading-[20.122px]">
                        Frage mich zu aktuellen Projekten,
                        <br />
                        erstelle neue Projekte oder Welten
                      </p>
                      <div className="mt-6 flex gap-4 justify-center text-xs flex-wrap">
                        <div className="flex items-center gap-1">
                          <span className="bg-character-blue-light px-1.5 py-0.5 rounded font-medium text-character-blue">
                            @
                          </span>
                          <span className="text-character-blue">
                            Charaktere
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="bg-asset-green-light px-1.5 py-0.5 rounded font-medium text-asset-green">
                            /
                          </span>
                          <span className="text-asset-green">Assets</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="bg-scene-pink-light px-1.5 py-0.5 rounded font-medium text-scene-pink">
                            #
                          </span>
                          <span className="text-scene-pink">Szenen</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 py-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[85%] rounded-xl px-4 py-3 ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-white dark:bg-card border border-border"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                            {colorizeText(message.content).map(
                              (part, index) => {
                                if (part.type === "character") {
                                  return (
                                    <span
                                      key={index}
                                      style={{
                                        color: "var(--character-blue)",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {part.text}
                                    </span>
                                  );
                                } else if (part.type === "asset") {
                                  return (
                                    <span
                                      key={index}
                                      style={{
                                        color: "var(--asset-green)",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {part.text}
                                    </span>
                                  );
                                } else if (part.type === "scene") {
                                  return (
                                    <span
                                      key={index}
                                      style={{
                                        color: "var(--scene-pink)",
                                        fontWeight: 500,
                                      }}
                                    >
                                      {part.text}
                                    </span>
                                  );
                                }
                                return <span key={index}>{part.text}</span>;
                              },
                            )}
                          </p>
                          <span className="text-xs opacity-70 mt-1.5 block">
                            {message.timestamp.toLocaleTimeString("de-DE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                      </div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <AssistantOrbitLoader />
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Input Area - Fixed at Bottom */}
            <div className="flex-shrink-0 px-4 pb-6 border-t border-border/50 pt-4 bg-background">
              {/* File Upload Input (Hidden) */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept=".pdf,.txt,.docx,.fountain"
                className="hidden"
              />

              {/* Uploaded Files Display */}
              {uploadedFiles.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {uploadedFiles.map((file, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {file.name}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Input Container */}
              <div className="relative bg-transparent border-2 border-border focus-within:border-primary rounded-[10px] p-2 flex items-center gap-2 transition-colors">
                {/* Microphone Button */}
                <button
                  className="flex-shrink-0 size-[31px] flex items-center justify-center rounded-[10px] bg-[#e4e6ea] dark:bg-muted hover:bg-gray-300 dark:hover:bg-muted/80 transition-colors active:scale-95"
                  aria-label="Spracheingabe"
                >
                  <Mic className="size-[16px] text-primary" />
                </button>

                {/* Suggestions Dropdown */}
                {showSuggestions && (
                  <div className="absolute bottom-full left-0 right-0 mb-2 bg-card border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto z-50">
                    <div
                      className={`p-2 border-b border-border text-xs ${
                        suggestionsType === "@"
                          ? "text-character-blue"
                          : suggestionsType === "/"
                            ? "text-asset-green"
                            : "text-scene-pink"
                      }`}
                    >
                      {suggestionsType === "@"
                        ? "@ Charaktere"
                        : suggestionsType === "/"
                          ? "/ Assets"
                          : "# Szenen"}{" "}
                      ({filteredSuggestions.length})
                    </div>
                    {filteredSuggestions.length > 0 ? (
                      filteredSuggestions.map((suggestion, index) => {
                        const isCharacter =
                          "project" in suggestion && "world" in suggestion;
                        const isScene =
                          "project" in suggestion &&
                          !("world" in suggestion) &&
                          !("category" in suggestion);
                        const isAsset = "category" in suggestion;

                        let subtitle = "";
                        let color = "";
                        let bgColor = "";
                        let selectedBg = "";
                        let symbol = "";

                        if (isCharacter) {
                          subtitle =
                            (suggestion as RAGCharacter).project ||
                            (suggestion as RAGCharacter).world ||
                            "";
                          color = "text-character-blue";
                          bgColor = "hover:bg-character-blue-light";
                          selectedBg = "bg-character-blue-light";
                          symbol = "@";
                        } else if (isScene) {
                          subtitle = (suggestion as RAGScene).project;
                          color = "text-scene-pink";
                          bgColor = "hover:bg-scene-pink-light";
                          selectedBg = "bg-scene-pink-light";
                          symbol = "#";
                        } else if (isAsset) {
                          subtitle = (suggestion as RAGWorldAsset).category;
                          color = "text-asset-green";
                          bgColor = "hover:bg-asset-green-light";
                          selectedBg = "bg-asset-green-light";
                          symbol = "/";
                        }

                        return (
                          <button
                            key={suggestion.id}
                            onClick={() => insertSuggestion(suggestion.name)}
                            className={`w-full text-left px-3 py-2 transition-colors ${bgColor} ${
                              index === selectedSuggestionIndex
                                ? selectedBg
                                : ""
                            }`}
                          >
                            <div className={`text-sm ${color}`}>
                              {symbol}
                              {suggestion.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {subtitle}
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <div className="p-3 text-sm text-muted-foreground text-center">
                        {suggestionsType === "@"
                          ? "Keine Charaktere gefunden. Verbinde ein Projekt oder eine Welt in der RAG-Datenbank."
                          : suggestionsType === "/"
                            ? "Keine Assets gefunden. Verbinde eine Welt in der RAG-Datenbank."
                            : "Keine Szenen gefunden. Verbinde ein Projekt in der RAG-Datenbank."}
                      </div>
                    )}
                  </div>
                )}

                {/* Textarea Field */}
                <div className="flex-1 relative min-w-0">
                  <textarea
                    ref={inputRef as any}
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyPress}
                    placeholder={
                      hasRAGConnections
                        ? "Schreibe eine Nachricht... (@ Charaktere, / Assets, # Szenen)"
                        : "Schreibe eine Nachricht..."
                    }
                    rows={1}
                    className="w-full bg-transparent border-0 outline-none text-[14.8px] leading-[1.45] text-foreground placeholder:text-[#9e9ea4] dark:placeholder:text-muted-foreground disabled:opacity-50 resize-none max-h-[80px] overflow-y-auto py-2"
                    style={{
                      caretColor: "var(--foreground)",
                      minHeight: "24px",
                    }}
                    disabled={isLoading}
                  />
                </div>

                {/* Attachment Button */}
                <button
                  onClick={handleUploadClick}
                  className="flex-shrink-0 size-[20px] flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Datei hochladen"
                >
                  <AttachIcon />
                </button>

                {/* RUN Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || !assistantReady}
                  className="flex-shrink-0 h-[31px] px-4 flex items-center justify-center gap-2 rounded-[10px] bg-[#6e59a5] dark:bg-primary text-white hover:bg-[#6e59a5]/90 dark:hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  title={
                    !assistantReady
                      ? assistantStatusError ||
                        "Bitte konfiguriere zuerst Provider und Modell in den Integrationen."
                      : ""
                  }
                >
                  <span className="text-[14.8px] font-bold">RUN</span>
                  <div className="size-[16px] flex items-center justify-center">
                    <SendIcon />
                  </div>
                </button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* System Prompt Dialog */}
      <Dialog open={isSystemPromptOpen} onOpenChange={setIsSystemPromptOpen}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh] flex flex-col md:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-[20px] flex items-center justify-center">
                <SystemPromptIcon />
              </div>
              System-Prompt
            </DialogTitle>
            <DialogDescription>
              Definiere den System-Prompt, der bei jedem Chat verwendet werden
              soll.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex flex-col gap-4 overflow-hidden">
            <Textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Gebe hier deinen System-Prompt ein..."
              className="flex-1 min-h-[300px] resize-none"
            />

            {lastEditedDate && (
              <p className="text-sm text-muted-foreground">
                Zuletzt bearbeitet:{" "}
                {lastEditedDate.toLocaleString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setIsSystemPromptOpen(false)}
              className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Schließen
            </button>
            <button
              onClick={handleSaveSystemPrompt}
              className="px-6 py-2 rounded-lg bg-[#6E59A5] text-white hover:bg-[#6E59A5]/90 transition-colors"
            >
              Speichern
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Chat Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="w-[95vw] max-w-md md:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-[20px] flex items-center justify-center">
                <ExportIcon />
              </div>
              Chat exportieren
            </DialogTitle>
            <DialogDescription>
              Wähle das Format und den Dateinamen für den Export.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-6">
            {/* File Name Input */}
            <div className="space-y-2">
              <Label htmlFor="fileName">Dateiname</Label>
              <Input
                id="fileName"
                value={exportFileName}
                onChange={(e) => setExportFileName(e.target.value)}
                placeholder="scriptony-chat"
              />
            </div>

            {/* Format Selection */}
            <div className="space-y-3">
              <Label>Export-Format</Label>
              <RadioGroup
                value={exportFormat}
                onValueChange={(value) =>
                  setExportFormat(value as "pdf" | "json" | "md")
                }
              >
                <div className="flex items-center space-x-3 rounded-lg border border-border p-4 hover:bg-accent/5 transition-colors">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json" className="flex-1 cursor-pointer">
                    <div>
                      <div>JSON</div>
                      <div className="text-sm text-muted-foreground">
                        Strukturiertes Datenformat
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 rounded-lg border border-border p-4 hover:bg-accent/5 transition-colors">
                  <RadioGroupItem value="md" id="md" />
                  <Label htmlFor="md" className="flex-1 cursor-pointer">
                    <div>
                      <div>Markdown</div>
                      <div className="text-sm text-muted-foreground">
                        Lesbare Textdatei mit Formatierung
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 rounded-lg border border-border p-4 hover:bg-accent/5 transition-colors">
                  <RadioGroupItem value="pdf" id="pdf" />
                  <Label htmlFor="pdf" className="flex-1 cursor-pointer">
                    <div>
                      <div>PDF</div>
                      <div className="text-sm text-muted-foreground">
                        Druckversion (öffnet Druckvorschau)
                      </div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-4">
            <button
              onClick={() => setIsExportDialogOpen(false)}
              className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleExportChat}
              className="px-6 py-2 rounded-lg bg-[#6E59A5] text-white hover:bg-[#6E59A5]/90 transition-colors"
            >
              Exportieren
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat History Dialog */}
      <Dialog open={isChatHistoryOpen} onOpenChange={setIsChatHistoryOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] flex flex-col md:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-[20px] flex items-center justify-center">
                <ChatHistoryIcon />
              </div>
              Chat-History
            </DialogTitle>
            <DialogDescription>
              Durchsuche und lade deine bisherigen Chats.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Search and Filter in one row */}
            <div className="flex items-center gap-1.5">
              {/* Search */}
              <div className="flex-1 relative min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  placeholder="Chats durchsuchen (Titel & Inhalte)..."
                  value={chatHistorySearch}
                  onChange={(e) => setChatHistorySearch(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              {/* Date From */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-[70px] justify-center text-left font-normal px-1.5 shrink-0"
                  >
                    <Calendar className="size-3.5 shrink-0" />
                    {dateFilterFrom ? (
                      <span className="ml-0.5 text-[11px] truncate">
                        {dateFilterFrom.toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    ) : (
                      <span className="ml-0.5 text-[11px] text-muted-foreground">
                        Von
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFilterFrom}
                    onSelect={setDateFilterFrom}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              {/* Date To */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-[70px] justify-center text-left font-normal px-1.5 shrink-0"
                  >
                    <Calendar className="size-3.5 shrink-0" />
                    {dateFilterTo ? (
                      <span className="ml-0.5 text-[11px] truncate">
                        {dateFilterTo.toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </span>
                    ) : (
                      <span className="ml-0.5 text-[11px] text-muted-foreground">
                        Bis
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={dateFilterTo}
                    onSelect={setDateFilterTo}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Results Count */}
            <div className="text-sm text-muted-foreground">
              {filteredChatHistory.length}{" "}
              {filteredChatHistory.length === 1 ? "Chat" : "Chats"} gefunden
            </div>

            {/* Chat List - Table Style */}
            <ScrollArea className="flex-1 -mx-6 px-6">
              {filteredChatHistory.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Keine Chats gefunden</p>
                  {(chatHistorySearch || dateFilterFrom || dateFilterTo) && (
                    <button
                      onClick={() => {
                        setChatHistorySearch("");
                        setDateFilterFrom(undefined);
                        setDateFilterTo(undefined);
                      }}
                      className="mt-4 text-primary hover:underline"
                    >
                      Filter zurücksetzen
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredChatHistory.map((chat) => (
                    <div
                      key={chat.id}
                      onClick={() => handleLoadChat(chat)}
                      className="group py-3 px-4 -mx-4 hover:bg-accent/5 transition-colors cursor-pointer flex items-center gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-3 mb-1">
                          <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                            {chat.title}
                          </h4>
                          <Badge
                            variant="secondary"
                            className="text-xs shrink-0"
                          >
                            {chat.model}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="shrink-0">
                            {chat.lastEdited.toLocaleDateString("de-DE", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}{" "}
                            ���{" "}
                            {chat.lastEdited.toLocaleTimeString("de-DE", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          <span className="text-xs shrink-0">
                            {chat.messages.length}{" "}
                            {chat.messages.length === 1
                              ? "Nachricht"
                              : "Nachrichten"}
                          </span>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <span className="text-primary text-sm">Laden →</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <button
              onClick={() => setIsChatHistoryOpen(false)}
              className="px-6 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Schließen
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* RAG Database Dialog */}
      <Dialog open={isRAGDatabaseOpen} onOpenChange={setIsRAGDatabaseOpen}>
        <DialogContent className="w-[95vw] max-w-4xl max-h-[80vh] flex flex-col md:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="size-[20px] flex items-center justify-center">
                <DatabaseIcon />
              </div>
              RAG-Datenbank
            </DialogTitle>
            <DialogDescription>
              Wähle Projekte, Welten, Charaktere und Dateien für das
              Chat-Gedächtnis aus.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            {/* Tab Buttons */}
            <div className="flex gap-2">
              <Button
                variant={ragActiveTab === "projects" ? "default" : "outline"}
                size="sm"
                onClick={() => setRagActiveTab("projects")}
                className="flex-1"
              >
                Projekte
                {selectedRAGProjects.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedRAGProjects.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={ragActiveTab === "worlds" ? "default" : "outline"}
                size="sm"
                onClick={() => setRagActiveTab("worlds")}
                className="flex-1"
              >
                Welten
                {selectedRAGWorlds.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedRAGWorlds.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={ragActiveTab === "characters" ? "default" : "outline"}
                size="sm"
                onClick={() => setRagActiveTab("characters")}
                className="flex-1"
              >
                Charaktere
                {selectedRAGCharacters.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedRAGCharacters.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={ragActiveTab === "custom" ? "default" : "outline"}
                size="sm"
                onClick={() => setRagActiveTab("custom")}
                className="flex-1"
              >
                Custom
                {selectedRAGCustomFiles.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedRAGCustomFiles.length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Durchsuchen..."
                value={ragSearch}
                onChange={(e) => setRagSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Upload Button for Custom Tab */}
            {ragActiveTab === "custom" && (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleRAGFileUpload}
                  accept=".pdf,.txt,.png,.jpg,.jpeg,.webp"
                  multiple
                  className="hidden"
                  id="rag-file-upload"
                />
                <Button
                  onClick={() =>
                    document.getElementById("rag-file-upload")?.click()
                  }
                  variant="secondary"
                  size="sm"
                  className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100"
                >
                  <Upload className="size-4 mr-2" />
                  Dateien hochladen
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  PDF, TXT, PNG, JPEG, WEBP
                </p>
              </div>
            )}

            {/* Content List */}
            <ScrollArea className="flex-1">
              {ragActiveTab === "projects" && (
                <div className="space-y-2">
                  {filteredRAGItems.projects.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine Projekte gefunden</p>
                    </div>
                  ) : (
                    filteredRAGItems.projects.map((project) => (
                      <div
                        key={project.id}
                        onClick={() => toggleRAGProject(project.id)}
                        className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 cursor-pointer transition-colors"
                      >
                        <div className="shrink-0">
                          {selectedRAGProjects.includes(project.id) ? (
                            <CheckSquare className="size-5 text-primary" />
                          ) : (
                            <Square className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">
                            {project.title}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {project.type}
                            </Badge>
                            <span className="text-xs">
                              {project.lastEdited.toLocaleDateString("de-DE")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {ragActiveTab === "worlds" && (
                <div className="space-y-2">
                  {filteredRAGItems.worlds.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine Welten gefunden</p>
                    </div>
                  ) : (
                    filteredRAGItems.worlds.map((world) => (
                      <div
                        key={world.id}
                        onClick={() => toggleRAGWorld(world.id)}
                        className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 cursor-pointer transition-colors"
                      >
                        <div className="shrink-0">
                          {selectedRAGWorlds.includes(world.id) ? (
                            <CheckSquare className="size-5 text-primary" />
                          ) : (
                            <Square className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">
                            {world.name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {world.category}
                            </Badge>
                            <span className="text-xs">
                              {world.lastEdited.toLocaleDateString("de-DE")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {ragActiveTab === "characters" && (
                <div className="space-y-2">
                  {filteredRAGItems.characters.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine Charaktere gefunden</p>
                    </div>
                  ) : (
                    filteredRAGItems.characters.map((character) => (
                      <div
                        key={character.id}
                        onClick={() => toggleRAGCharacter(character.id)}
                        className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 cursor-pointer transition-colors"
                      >
                        <div className="shrink-0">
                          {selectedRAGCharacters.includes(character.id) ? (
                            <CheckSquare className="size-5 text-primary" />
                          ) : (
                            <Square className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">
                            {character.name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {character.project}
                            </Badge>
                            <span className="text-xs">
                              {character.lastEdited.toLocaleDateString("de-DE")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {ragActiveTab === "custom" && (
                <div className="space-y-2">
                  {filteredRAGItems.customFiles.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Keine Dateien hochgeladen</p>
                      <p className="text-sm mt-2">
                        Lade PDF, TXT, PNG, JPEG oder WEBP Dateien hoch
                      </p>
                    </div>
                  ) : (
                    filteredRAGItems.customFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => setPreviewFile(file)}
                        className="group flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/5 cursor-pointer transition-colors"
                      >
                        <div
                          className="shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleRAGCustomFile(file.id);
                          }}
                        >
                          {selectedRAGCustomFiles.includes(file.id) ? (
                            <CheckSquare className="size-5 text-primary" />
                          ) : (
                            <Square className="size-5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="shrink-0">
                          {file.type === "pdf" && (
                            <FileText className="size-5 text-red-500" />
                          )}
                          {file.type === "txt" && (
                            <FileText className="size-5 text-blue-500" />
                          )}
                          {(file.type === "png" ||
                            file.type === "jpg" ||
                            file.type === "jpeg" ||
                            file.type === "webp") && (
                            <ImageIcon className="size-5 text-green-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground truncate">
                            {file.name}
                          </h4>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="text-xs uppercase">
                              {file.type}
                            </span>
                            <span className="text-xs">{file.size}</span>
                            <span className="text-xs">
                              {file.uploadedAt.toLocaleDateString("de-DE")}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>

            {/* Summary */}
            <div className="border-t pt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Ausgewählt:</span>
                <div className="flex items-center gap-3">
                  {selectedRAGProjects.length > 0 && (
                    <Badge variant="secondary">
                      {selectedRAGProjects.length} Projekte
                    </Badge>
                  )}
                  {selectedRAGWorlds.length > 0 && (
                    <Badge variant="secondary">
                      {selectedRAGWorlds.length} Welten
                    </Badge>
                  )}
                  {selectedRAGCharacters.length > 0 && (
                    <Badge variant="secondary">
                      {selectedRAGCharacters.length} Charaktere
                    </Badge>
                  )}
                  {selectedRAGCustomFiles.length > 0 && (
                    <Badge variant="secondary">
                      {selectedRAGCustomFiles.length} Dateien
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsRAGDatabaseOpen(false)}
            >
              Schließen
            </Button>
            <Button
              onClick={() => {
                const total =
                  selectedRAGProjects.length +
                  selectedRAGWorlds.length +
                  selectedRAGCharacters.length +
                  selectedRAGCustomFiles.length;
                toast.success(`${total} Items zur RAG-Datenbank hinzugefügt`);
                setIsRAGDatabaseOpen(false);
              }}
            >
              Speichern
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog
        open={previewFile !== null}
        onOpenChange={() => setPreviewFile(null)}
      >
        <DialogContent className="w-[95vw] max-w-4xl max-h-[90vh] overflow-auto md:w-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewFile?.type === "pdf" && (
                <FileText className="size-5 text-red-500" />
              )}
              {previewFile?.type === "txt" && (
                <FileText className="size-5 text-blue-500" />
              )}
              {(previewFile?.type === "png" ||
                previewFile?.type === "jpg" ||
                previewFile?.type === "jpeg" ||
                previewFile?.type === "webp") && (
                <ImageIcon className="size-5 text-green-500" />
              )}
              <span>{previewFile?.name}</span>
            </DialogTitle>
            <DialogDescription className="flex items-center gap-3">
              <span className="uppercase">{previewFile?.type}</span>
              <span>•</span>
              <span>{previewFile?.size}</span>
              <span>•</span>
              <span>{previewFile?.uploadedAt.toLocaleDateString("de-DE")}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4">
            {/* Preview content based on file type */}
            {previewFile?.type === "pdf" && (
              <div className="bg-muted/30 rounded-lg p-8 text-center">
                <FileText className="size-16 mx-auto mb-4 text-red-500 opacity-50" />
                <p className="text-muted-foreground mb-2">PDF Vorschau</p>
                <p className="text-sm text-muted-foreground">
                  Vollständige PDF-Vorschau ist in dieser Demo nicht verfügbar
                </p>
              </div>
            )}

            {previewFile?.type === "txt" && (
              <div className="bg-muted/30 rounded-lg p-6">
                <div className="bg-background rounded border p-4 font-mono text-sm max-h-96 overflow-auto">
                  <p className="text-muted-foreground">
                    Dies ist eine Demo-Vorschau einer Textdatei.
                    {"\n\n"}
                    In einer echten Implementierung würde hier der tatsächliche
                    Inhalt der Datei "{previewFile.name}" angezeigt werden.
                    {"\n\n"}
                    Die Datei wurde am{" "}
                    {previewFile.uploadedAt.toLocaleDateString("de-DE")}{" "}
                    hochgeladen und hat eine Größe von {previewFile.size}.
                  </p>
                </div>
              </div>
            )}

            {(previewFile?.type === "png" ||
              previewFile?.type === "jpg" ||
              previewFile?.type === "jpeg" ||
              previewFile?.type === "webp") && (
              <div className="bg-muted/30 rounded-lg p-8">
                <div className="bg-background rounded border p-4 flex items-center justify-center min-h-64">
                  <div className="text-center">
                    <ImageIcon className="size-16 mx-auto mb-4 text-green-500 opacity-50" />
                    <p className="text-muted-foreground mb-2">Bildvorschau</p>
                    <p className="text-sm text-muted-foreground">
                      {previewFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      In einer echten Implementierung würde hier das Bild
                      angezeigt werden
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t mt-4">
            <Button variant="outline" onClick={() => setPreviewFile(null)}>
              Schließen
            </Button>
            <Button
              onClick={() => {
                if (previewFile) {
                  toggleRAGCustomFile(previewFile.id);
                  const isSelected = selectedRAGCustomFiles.includes(
                    previewFile.id,
                  );
                  toast.success(
                    isSelected ? "Datei entfernt" : "Datei ausgewählt",
                  );
                }
              }}
            >
              {previewFile &&
              selectedRAGCustomFiles.includes(previewFile.id) ? (
                <>
                  <CheckSquare className="size-4 mr-2" />
                  Ausgewählt
                </>
              ) : (
                <>
                  <Square className="size-4 mr-2" />
                  Auswählen
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chat Settings Dialog */}
      <ChatSettingsDialog
        open={isChatSettingsOpen}
        onOpenChange={setIsChatSettingsOpen}
        onUpdate={() => void loadAssistantRuntime(true)}
      />
    </>
  );
}
