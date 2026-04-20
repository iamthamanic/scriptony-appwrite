/**
 * 🚀 LAZY LOAD SCENE CONTENT HOOK
 *
 * Only loads/parses scene content when expanded
 * Dramatically improves initial load time for BookDropdown
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./useAuth";
import * as TimelineAPIV2 from "../lib/api/timeline-api-v2";
import type { Scene } from "../lib/types";
import { SmartCache } from "../lib/dropdown-optimization-helpers";

// Global cache for parsed content
const contentCache = new SmartCache<any>(60000, 100);

interface UseLazyLoadSceneContentOptions {
  scene: Scene;
  isExpanded: boolean;
  enabled?: boolean;
}

/**
 * Parse TipTap JSON content and calculate word count
 */
function parseSceneContent(scene: Scene): { content: any; wordCount: number } {
  // Priority 1: Use wordCount from database (metadata->wordCount)
  if (
    scene.metadata?.wordCount !== undefined &&
    scene.metadata?.wordCount !== null
  ) {
    return {
      content: scene.content || null,
      wordCount: scene.metadata.wordCount,
    };
  }

  // Priority 2: Calculate from content
  const extractTextFromTiptap = (node: any): string => {
    if (!node) return "";
    let text = "";
    if (node.text) {
      text += node.text;
    }
    if (node.content && Array.isArray(node.content)) {
      node.content.forEach((child: any) => {
        text += extractTextFromTiptap(child);
        if (child.type === "paragraph" || child.type === "heading") {
          text += " ";
        }
      });
    }
    return text;
  };

  const contentSource = scene.content || scene.metadata?.content;

  if (contentSource && typeof contentSource === "string") {
    try {
      const parsed = JSON.parse(contentSource);
      const textContent = extractTextFromTiptap(parsed);
      const wordCount = textContent.trim()
        ? textContent
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0).length
        : 0;
      return { content: parsed, wordCount };
    } catch (e) {
      const textContent =
        typeof contentSource === "string" ? contentSource : "";
      const wordCount = textContent.trim()
        ? textContent
            .trim()
            .split(/\s+/)
            .filter((w) => w.length > 0).length
        : 0;
      return { content: contentSource, wordCount };
    }
  }

  return { content: null, wordCount: 0 };
}

export function useLazyLoadSceneContent({
  scene,
  isExpanded,
  enabled = true,
}: UseLazyLoadSceneContentOptions) {
  const [content, setContent] = useState<any>(null);
  const [wordCount, setWordCount] = useState<number>(scene.wordCount || 0);
  const [loading, setLoading] = useState(false);
  const loadedRef = useRef(false);

  const loadContent = useCallback(() => {
    if (!enabled || !isExpanded || loadedRef.current) {
      return;
    }

    // Check cache first
    const cacheKey = `scene-content:${scene.id}`;
    const cached = contentCache.get(cacheKey);
    if (cached) {
      console.log(
        `[useLazyLoadSceneContent] 💾 Using cached content for scene ${scene.id}`,
      );
      setContent(cached.content);
      setWordCount(cached.wordCount);
      loadedRef.current = true;
      return;
    }

    try {
      setLoading(true);
      console.log(
        `[useLazyLoadSceneContent] 🔄 Parsing content for scene ${scene.id}...`,
      );

      const parsed = parseSceneContent(scene);
      setContent(parsed.content);
      setWordCount(parsed.wordCount);
      loadedRef.current = true;

      // Cache the result
      contentCache.set(cacheKey, parsed);
      console.log(
        `[useLazyLoadSceneContent] ✅ Parsed ${parsed.wordCount} words for scene ${scene.id}`,
      );
    } catch (err) {
      console.error(
        `[useLazyLoadSceneContent] ❌ Error parsing content for scene ${scene.id}:`,
        err,
      );
      setContent(null);
      setWordCount(0);
    } finally {
      setLoading(false);
    }
  }, [scene, isExpanded, enabled]);

  useEffect(() => {
    if (isExpanded) {
      loadContent();
    }
  }, [isExpanded, loadContent]);

  const invalidate = useCallback(() => {
    loadedRef.current = false;
    contentCache.set(`scene-content:${scene.id}`, {
      content: null,
      wordCount: 0,
    });
    setContent(null);
    setWordCount(0);
  }, [scene.id]);

  return {
    content,
    wordCount,
    loading,
    loaded: loadedRef.current,
    invalidate,
    reload: loadContent,
  };
}
