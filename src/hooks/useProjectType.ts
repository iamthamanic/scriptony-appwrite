/**
 * useProjectType — Hook zur Abfrage der Projekttyp-Registry.
 * Liefert Feature-Flags und Views basierend auf project.type.
 */

import { useMemo } from "react";
import {
  getProjectTypeConfig,
  hasFeature,
  isFeatureRequired,
  projectTypeRegistry,
} from "../lib/projectTypeRegistry";
import type {
  ProjectTypeConfig,
  ProjectFeatures,
} from "../lib/projectTypeRegistry";

export interface UseProjectTypeResult {
  config: ProjectTypeConfig;
  /** Prüft ob ein Feature verfügbar ist (true/required/optional → true). */
  hasFeature: (feature: keyof ProjectFeatures) => boolean;
  /** Prüft ob ein Feature zwingend erforderlich ist. */
  isRequired: (feature: keyof ProjectFeatures) => boolean;
  /** Liste aller registrierten Projekttypen. */
  allTypes: string[];
  /** Label für den aktuellen Typ. */
  label: string;
  /** Hierarchie-Ebenen. */
  hierarchy: string[];
}

export function useProjectType(
  projectType?: string | null,
): UseProjectTypeResult {
  const config = useMemo(
    () => getProjectTypeConfig(projectType ?? undefined),
    [projectType],
  );

  const allTypes = useMemo(() => Object.keys(projectTypeRegistry), []);

  return useMemo(
    () => ({
      config,
      hasFeature: (feature: keyof ProjectFeatures) =>
        hasFeature(projectType ?? "", feature),
      isRequired: (feature: keyof ProjectFeatures) =>
        isFeatureRequired(projectType ?? "", feature),
      allTypes,
      label: config.label,
      hierarchy: config.hierarchy,
    }),
    [config, projectType, allTypes],
  );
}

export default useProjectType;
