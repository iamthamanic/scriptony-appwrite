import { FilmDropdown, type TimelineData } from "./FilmDropdown";
import type { Character } from "../lib/types";

/**
 * 🎯 CONTROLLED FILM DROPDOWN WRAPPER
 *
 * Wrapper um FilmDropdown mit controlled collapse states.
 * Wird von StructureBeatsSection verwendet für dynamisches Beat-Alignment.
 */

interface FilmDropdownControlledProps {
  projectId: string;
  characters?: Character[];
  initialData?: TimelineData;
  onDataChange?: (data: TimelineData) => void;
  containerRef?: React.RefObject<HTMLDivElement>;
  // Controlled collapse states
  expandedActs: Set<string>;
  expandedSequences: Set<string>;
  expandedScenes: Set<string>;
  onExpandedActsChange: (expanded: Set<string>) => void;
  onExpandedSequencesChange: (expanded: Set<string>) => void;
  onExpandedScenesChange: (expanded: Set<string>) => void;
}

export function FilmDropdownControlled({
  projectId,
  characters,
  initialData,
  onDataChange,
  containerRef,
  expandedActs,
  expandedSequences,
  expandedScenes,
  onExpandedActsChange,
  onExpandedSequencesChange,
  onExpandedScenesChange,
}: FilmDropdownControlledProps) {
  // For now, just pass through to FilmDropdown
  // In the future, we can add controlled state logic here
  return (
    <FilmDropdown
      projectId={projectId}
      characters={characters}
      initialData={initialData}
      onDataChange={onDataChange}
      containerRef={containerRef}
      expandedActs={expandedActs}
      expandedSequences={expandedSequences}
      expandedScenes={expandedScenes}
      onExpandedActsChange={onExpandedActsChange}
      onExpandedSequencesChange={onExpandedSequencesChange}
      onExpandedScenesChange={onExpandedScenesChange}
    />
  );
}
