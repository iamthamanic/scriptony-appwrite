/**
 * ProjectDropdown — Router je nach Projekttyp.
 * Nutzt die projectTypeRegistry (Epic 2).
 * Lazy-Loads die passende Dropdown-View.
 */

import { Suspense } from "react";
import { getProjectTypeConfig } from "../lib/projectTypeRegistry";
import type { Character } from "../lib/types";

interface ProjectDropdownProps {
  projectId: string;
  projectType?: string;
  /** Optional pre-loaded timeline data from parent. */
  initialData?: unknown;
  /** Characters passed from parent to avoid double-loading. */
  characters?: Character[];
  /** Callback when data changes (used by film/series/book). */
  onDataChange?: (data: unknown) => void;
  /** Ref for scroll/beats sync (used by film/series/book). */
  containerRef?: React.RefObject<HTMLDivElement | null>;
  /** For film/series: shot expansion from timeline. */
  expandShotId?: string | null;
  /** For film/series: callback when expand shot is consumed. */
  onExpandShotIdConsumed?: () => void;
  /** For film/series: narrative structure preset. */
  narrativeStructure?: string | null;
}

export function ProjectDropdown({
  projectId,
  projectType,
  initialData,
  characters,
  onDataChange,
  containerRef,
  expandShotId,
  onExpandShotIdConsumed,
  narrativeStructure,
}: ProjectDropdownProps) {
  const config = getProjectTypeConfig(projectType);
  const DropdownView = config.views.dropdown as React.ComponentType<
    Record<string, unknown>
  >;

  const fallback = (
    <div className="p-8 text-center text-muted-foreground">
      Lade {config.label}-Ansicht…
    </div>
  );

  // Props vary by project type; cast as needed.
  const commonProps = {
    projectId,
    projectType,
    characters,
  };

  return (
    <Suspense fallback={fallback}>
      <DropdownView
        {...commonProps}
        initialData={initialData}
        onDataChange={onDataChange}
        containerRef={containerRef}
        expandShotId={expandShotId}
        onExpandShotIdConsumed={onExpandShotIdConsumed}
        narrativeStructure={narrativeStructure}
      />
    </Suspense>
  );
}

export default ProjectDropdown;
