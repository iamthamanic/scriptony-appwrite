import { useMemo } from "react";

interface TaggableItem {
  id: string;
  name: string;
}

interface UseColoredTagsProps {
  characters: TaggableItem[];
  assets: TaggableItem[];
  scenes: TaggableItem[];
}

export function useColoredTags({
  characters,
  assets,
  scenes,
}: UseColoredTagsProps) {
  // Create a regex pattern that matches @, /, or # followed by any of the known names
  const pattern = useMemo(() => {
    const allNames = [
      ...characters.map((c) => ({ type: "character" as const, name: c.name })),
      ...assets.map((a) => ({ type: "asset" as const, name: a.name })),
      ...scenes.map((s) => ({ type: "scene" as const, name: s.name })),
    ];

    if (allNames.length === 0) {
      // Fallback to simple word matching if no names are available
      return /@[^\s@/#]+|\/[^\s@/#]+|#[^\s@/#]+/g;
    }

    // Sort by length descending to match longer names first
    const sortedNames = allNames.sort((a, b) => b.name.length - a.name.length);

    // Escape special regex characters and create pattern
    const characterNames = characters
      .map((c) => c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    const assetNames = assets
      .map((a) => a.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    const sceneNames = scenes
      .map((s) => s.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|");

    const patterns: string[] = [];

    if (characterNames) {
      patterns.push(`@(?:${characterNames})`);
    }

    if (assetNames) {
      patterns.push(`/(?:${assetNames})`);
    }

    if (sceneNames) {
      patterns.push(`#(?:${sceneNames})`);
    }

    // Fallback patterns for partial matches (while typing)
    patterns.push("@[^\\s@/#]+", "/[^\\s@/#]+", "#[^\\s@/#]+");

    return new RegExp(patterns.join("|"), "g");
  }, [characters, assets, scenes]);

  const colorizeText = (text: string) => {
    if (!text) return [{ text: "", type: "normal" as const }];

    const parts: Array<{
      text: string;
      type: "character" | "asset" | "scene" | "normal";
    }> = [];
    let lastIndex = 0;

    // First, find all exact matches with known names
    const exactMatches: Array<{
      start: number;
      end: number;
      type: "character" | "asset" | "scene";
      text: string;
    }> = [];

    // Check for character matches
    characters.forEach((character) => {
      const pattern = new RegExp(
        `@${character.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`,
        "g",
      );
      let match;
      while ((match = pattern.exec(text)) !== null) {
        exactMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: "character",
          text: match[0],
        });
      }
    });

    // Check for asset matches
    assets.forEach((asset) => {
      const pattern = new RegExp(
        `/${asset.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`,
        "g",
      );
      let match;
      while ((match = pattern.exec(text)) !== null) {
        exactMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: "asset",
          text: match[0],
        });
      }
    });

    // Check for scene matches
    scenes.forEach((scene) => {
      const pattern = new RegExp(
        `#${scene.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?=\\s|$)`,
        "g",
      );
      let match;
      while ((match = pattern.exec(text)) !== null) {
        exactMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          type: "scene",
          text: match[0],
        });
      }
    });

    // Sort by position
    exactMatches.sort((a, b) => a.start - b.start);

    // Remove overlapping matches (keep the first/longest match)
    const filteredMatches = exactMatches.filter((match, index) => {
      if (index === 0) return true;
      const prevMatch = exactMatches[index - 1];
      return match.start >= prevMatch.end;
    });

    // Build the parts array
    filteredMatches.forEach((match) => {
      // Add text before match
      if (match.start > lastIndex) {
        const beforeText = text.slice(lastIndex, match.start);
        // Check for partial matches in the before text
        const partialParts = beforeText.split(
          /(@[^\s@/#]+|\/[^\s@/#]+|#[^\s@/#]+)/g,
        );
        partialParts.forEach((part) => {
          if (part) {
            if (part.startsWith("@")) {
              parts.push({ text: part, type: "character" });
            } else if (part.startsWith("/")) {
              parts.push({ text: part, type: "asset" });
            } else if (part.startsWith("#")) {
              parts.push({ text: part, type: "scene" });
            } else if (part) {
              parts.push({ text: part, type: "normal" });
            }
          }
        });
      }

      // Add the match
      parts.push({ text: match.text, type: match.type });
      lastIndex = match.end;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      const remainingText = text.slice(lastIndex);
      // Check for partial matches in the remaining text
      const partialParts = remainingText.split(
        /(@[^\s@/#]+|\/[^\s@/#]+|#[^\s@/#]+)/g,
      );
      partialParts.forEach((part) => {
        if (part) {
          if (part.startsWith("@")) {
            parts.push({ text: part, type: "character" });
          } else if (part.startsWith("/")) {
            parts.push({ text: part, type: "asset" });
          } else if (part.startsWith("#")) {
            parts.push({ text: part, type: "scene" });
          } else if (part) {
            parts.push({ text: part, type: "normal" });
          }
        }
      });
    }

    return parts;
  };

  return { colorizeText, pattern };
}
