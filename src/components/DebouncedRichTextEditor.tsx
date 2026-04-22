/**
 * 🚀 DebouncedRichTextEditor - Wrapper für RichTextEditorModal mit Debounced Save
 *
 * Features:
 * - Debounced Saving (1000ms)
 * - Save Status Badge
 * - Optimistic UI
 */

import React, { useCallback } from "react";
import { RichTextEditorModal } from "./RichTextEditorModal";
import { SaveStatusBadge } from "./SaveStatusBadge";
import { useEditorSave } from "../hooks/useEditorSave";

export interface DebouncedRichTextEditorProps {
  isOpen: boolean;
  onClose: () => void;
  value: any;
  title: string;
  characters: any[];
  lastModified?: {
    timestamp: string;
    userName?: string;
  };
  // Save props
  sceneId: string;
  sceneTitle: string;
  getAccessToken: () => Promise<string | null>;
  updateAPI: (id: string, data: any, token: string) => Promise<any>;
  onOptimisticUpdate: (sceneId: string, content: any) => void;
  onError?: () => void;
}

export function DebouncedRichTextEditor(props: DebouncedRichTextEditorProps) {
  const {
    isOpen,
    onClose,
    value,
    title,
    characters,
    lastModified,
    sceneId,
    sceneTitle,
    getAccessToken,
    updateAPI,
    onOptimisticUpdate,
    onError,
  } = props;

  // Use debounced save hook
  const { handleContentChange, saveStatus, lastSaved } = useEditorSave({
    sceneId,
    sceneTitle,
    characters,
    getAccessToken,
    updateAPI,
    onOptimisticUpdate,
    onError,
  });

  return (
    <>
      <RichTextEditorModal
        isOpen={isOpen}
        onClose={onClose}
        value={value}
        onChange={handleContentChange}
        title={title}
        characters={characters}
        lastModified={lastModified}
      />

      {/* Floating Save Status Badge (only visible when editor is open) */}
      {isOpen && (
        <div className="fixed bottom-4 right-4 z-[60]">
          <SaveStatusBadge status={saveStatus} lastSaved={lastSaved} />
        </div>
      )}
    </>
  );
}
