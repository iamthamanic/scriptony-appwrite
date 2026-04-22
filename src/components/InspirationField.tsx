/**
 * InspirationField - Smart input for inspirations with URL support
 * Automatically detects URLs and makes them clickable
 * Supports both text and link inspirations
 */

import { useState, useCallback } from "react";
import { ExternalLink, Link2, Type } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { cn } from "./ui/utils";

interface InspirationItem {
  text: string;
  isUrl?: boolean;
}

interface InspirationFieldProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  className?: string;
}

const URL_REGEX =
  /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*(\?[^\s]*)?$/i;

function isValidUrl(str: string): boolean {
  // First try regex
  if (!URL_REGEX.test(str.trim())) return false;

  // Additional validation with URL constructor if available
  try {
    const trimmed = str.trim();
    const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

function formatUrl(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function InspirationField({
  items,
  onChange,
  placeholder = "Inspiration",
  className,
}: InspirationFieldProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const addItem = () => {
    onChange([...items, ""]);
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const renderItem = (item: string, index: number) => {
    const trimmed = item.trim();
    const isUrl = isValidUrl(trimmed);
    const displayUrl = isUrl ? formatUrl(trimmed) : trimmed;

    // If not editing and it's a URL, show as clickable link
    if (isUrl && editingIndex !== index && trimmed) {
      return (
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <a
            href={displayUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline truncate flex-1"
            onClick={(e) => e.stopPropagation()}
          >
            <Link2 className="size-4 shrink-0" />
            <span className="truncate">{trimmed}</span>
            <ExternalLink className="size-3 shrink-0 opacity-50" />
          </a>
        </div>
      );
    }

    return (
      <Input
        value={item}
        onChange={(e) => updateItem(index, e.target.value)}
        onFocus={() => setEditingIndex(index)}
        onBlur={() => setEditingIndex(null)}
        placeholder={`${placeholder} ${index + 1}`}
        className="h-11 flex-1"
      />
    );
  };

  return (
    <div className={cn("space-y-2", className)}>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-center">
          {renderItem(item, index)}

          {/* URL indicator */}
          {isValidUrl(item.trim()) && editingIndex !== index && (
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 text-muted-foreground"
              onClick={() => setEditingIndex(index)}
              title="Edit"
            >
              <Type className="size-4" />
            </Button>
          )}

          {/* Remove button */}
          {items.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => removeItem(index)}
              className="h-11 w-11 shrink-0"
            >
              ×
            </Button>
          )}
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addItem} className="w-full">
        + Inspiration hinzufügen
      </Button>
    </div>
  );
}

/**
 * Read-only version for displaying inspirations with clickable links
 */
interface InspirationListProps {
  items: string[];
  className?: string;
}

export function InspirationList({ items, className }: InspirationListProps) {
  const validItems = items.filter((item) => item.trim());

  if (validItems.length === 0) {
    return (
      <span className="text-muted-foreground text-sm italic">
        Keine Inspirations
      </span>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {validItems.map((item, index) => {
        const trimmed = item.trim();
        const isUrl = isValidUrl(trimmed);
        const displayUrl = isUrl ? formatUrl(trimmed) : trimmed;

        if (isUrl) {
          return (
            <a
              key={index}
              href={displayUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:underline text-sm"
            >
              <Link2 className="size-3.5" />
              <span className="truncate">{trimmed}</span>
              <ExternalLink className="size-3 opacity-50" />
            </a>
          );
        }

        return (
          <p key={index} className="text-sm text-muted-foreground">
            • {trimmed}
          </p>
        );
      })}
    </div>
  );
}

export default InspirationField;
