import type { Character } from "../lib/types";
import { CharacterPicker } from "./CharacterPicker";

interface CharacterAutocompleteProps {
  characters: Character[];
  search: string;
  position: { top: number; left: number };
  onSelect: (characterName: string) => void;
}

/**
 * Character Autocomplete for @-mentions
 * This is a thin wrapper around CharacterPicker for backwards compatibility
 */
export function CharacterAutocomplete({
  characters,
  search,
  position,
  onSelect,
}: CharacterAutocompleteProps) {
  return (
    <CharacterPicker
      characters={characters}
      search={search}
      position={position}
      useFixedPosition={true}
      onSelect={(character) => onSelect(character.name)}
    />
  );
}
