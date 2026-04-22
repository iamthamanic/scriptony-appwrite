import { useState } from "react";
import { User, Search, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import { Input } from "./ui/input";
import type { Character } from "../lib/types";

interface CharacterPickerProps {
  characters: Character[];
  search?: string;
  position?: { top: number; left: number };
  onSelect: (character: Character) => void;
  onClose?: () => void; // Optional close handler
  filterIds?: string[]; // IDs to exclude from list
  useFixedPosition?: boolean; // Whether to use position:fixed (for autocomplete) or relative (for inline picker)
  className?: string;
}

/**
 * Unified Character Picker Component
 * Can be used for:
 * - @-mention autocomplete (fixed position, filter by search)
 * - Add character to shot (relative position, filter by already added)
 */
export function CharacterPicker({
  characters,
  search = "",
  position,
  onSelect,
  onClose,
  filterIds = [],
  useFixedPosition = false,
  className = "",
}: CharacterPickerProps) {
  // Local search state for the inline search bar
  const [localSearch, setLocalSearch] = useState("");

  // Combine external search (from @-mention) and local search (from search bar)
  const combinedSearch = search || localSearch;

  // Filter by search (name AND role match) and exclude filterIds
  const filtered = characters.filter((char) => {
    const searchLower = combinedSearch.toLowerCase();
    const matchesName = char.name.toLowerCase().includes(searchLower);
    const matchesRole = char.role?.toLowerCase().includes(searchLower) || false;
    const matchesSearch = matchesName || matchesRole;
    const notFiltered = !filterIds.includes(char.id);
    return matchesSearch && notFiltered;
  });

  // Debug: Log character images in detail
  if (filtered.length > 0) {
    console.log("[CharacterPicker] 🔍 Character Details:");
    filtered.forEach((c) => {
      console.log(`  - ${c.name}:`, {
        id: c.id,
        imageUrl: c.imageUrl,
        hasImage: !!c.imageUrl,
        role: c.role,
      });
    });
  }

  const hasNoResults = filtered.length === 0;

  return (
    <div
      className={`bg-popover border border-border rounded-lg shadow-lg overflow-hidden character-picker ${className}`}
      role="listbox"
      style={
        useFixedPosition && position
          ? {
              position: "fixed",
              top: `${position.top}px`,
              left: `${position.left}px`,
              minWidth: "280px",
              maxWidth: "350px",
              zIndex: 50,
            }
          : undefined
      }
    >
      {/* Header with Title and Close Button */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-purple-50/50 dark:bg-purple-900/10">
        <div className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400">
          <User className="size-3.5" />
          <span className="font-semibold">Characters</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="size-5 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <X className="size-3.5 text-muted-foreground hover:text-foreground" />
          </button>
        )}
      </div>

      {/* Search Bar - always visible for manual filtering */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={
              search
                ? `Filtern (aktuell: @${search})...`
                : "Suche nach Name oder Rolle..."
            }
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="pl-8 h-8 text-sm"
            autoFocus={!search}
          />
        </div>
      </div>

      {/* Character List */}
      <div className="max-h-[280px] overflow-y-auto p-1">
        {hasNoResults ? (
          <div className="text-xs text-muted-foreground text-center py-6">
            {combinedSearch
              ? "Kein Charakter gefunden"
              : "Keine Charaktere verfügbar"}
          </div>
        ) : (
          filtered.slice(0, 12).map((char) => (
            <button
              key={char.id}
              onMouseDown={(e) => {
                e.preventDefault();
                onSelect(char);
              }}
              className="w-full text-left px-3 py-2 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-md flex items-center gap-2 transition-colors"
            >
              <Avatar className="size-8 shrink-0">
                <AvatarImage src={char.imageUrl} />
                <AvatarFallback className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
                  {char.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-[#1D4ED8]">
                  {search ? "@" : ""}
                  {char.name}
                </p>
                {char.role && (
                  <p className="text-xs text-muted-foreground truncate">
                    {char.role}
                  </p>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
