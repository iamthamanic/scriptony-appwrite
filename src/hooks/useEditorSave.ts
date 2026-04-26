/**
 * 💾 useEditorSave - Debounced Save für Tiptap Editor
 *
 * Hook speziell für RichTextEditorModal mit:
 * - Debounced Saving (1000ms)
 * - Optimistic UI Updates
 * - Status-Tracking
 */

import { useCallback } from "react";
import { useDebouncedSave } from "./useDebouncedSave";
import { toast } from "sonner";

export interface EditorSaveOptions {
  sceneId: string;
  sceneTitle: string;
  characters: any[];
  getAccessToken: () => Promise<string | null>;
  updateAPI: (id: string, data: any, token: string) => Promise<any>;
  onOptimisticUpdate: (sceneId: string, content: any) => void;
  onError?: () => void;
}

export function useEditorSave(options: EditorSaveOptions) {
  const {
    sceneId,
    sceneTitle,
    characters,
    getAccessToken,
    updateAPI,
    onOptimisticUpdate,
    onError,
  } = options;

  // Debounced save function
  const { save, status, lastSaved } = useDebouncedSave({
    delay: 1000, // 1 second debounce
    onSave: async (jsonDoc: any) => {
      console.log("[useEditorSave] 💾 Executing save for scene:", sceneId);

      const token = await getAccessToken();
      if (!token) {
        throw new Error("No auth token");
      }

      // Update in backend
      await updateAPI(
        sceneId,
        {
          title: sceneTitle,
          metadata: {
            content: jsonDoc,
            characters: characters || [],
          },
        },
        token,
      );

      console.log("[useEditorSave] ✅ Save complete");
    },
    onError: (error) => {
      console.error("[useEditorSave] ❌ Save failed:", error);
      toast.error("Fehler beim Speichern");
      onError?.();
    },
  });

  // Handle content change from editor
  const handleContentChange = useCallback(
    (jsonDoc: any) => {
      console.log("[useEditorSave] 📝 Content changed, scheduling save...");

      // Optimistic update (instant UI)
      onOptimisticUpdate(sceneId, jsonDoc);

      // Debounced save (after 1000ms)
      save(jsonDoc);
    },
    [sceneId, save, onOptimisticUpdate],
  );

  return {
    handleContentChange,
    saveStatus: status,
    lastSaved,
  };
}
