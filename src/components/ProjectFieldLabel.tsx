/**
 * Reusable Label with Tooltip for Project Fields
 *
 * Provides consistent labeling across Create and Edit forms.
 * Uses centralized tooltip content from useProjectTooltips hook.
 *
 * Location: src/components/ProjectFieldLabel.tsx
 */

import { Info } from "lucide-react";
import { Label } from "./ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import {
  useProjectTooltips,
  type ProjectTooltipField,
} from "../hooks/useProjectTooltips";
import { cn } from "./ui/utils";

interface ProjectFieldLabelProps {
  /** The field key from ProjectTooltipField union */
  field: ProjectTooltipField;
  /** Optional custom label text (overrides default from hook) */
  label?: string;
  /** HTML for attribute */
  htmlFor?: string;
  /** Optional className for the wrapper */
  className?: string;
  /** Optional tooltip positioning */
  tooltipSide?: "top" | "right" | "bottom" | "left";
  /** Show tooltip icon (default: true) */
  showTooltip?: boolean;
  /** Custom children instead of label text */
  children?: React.ReactNode;
}

/**
 * Project Field Label with built-in tooltip
 *
 * @example
 * // Basic usage
 * <ProjectFieldLabel field="projectType" htmlFor="type" />
 *
 * // Custom label text
 * <ProjectFieldLabel field="beatTemplate" label="Story Template" htmlFor="template" />
 *
 * // With custom positioning
 * <ProjectFieldLabel field="logline" htmlFor="logline" tooltipSide="bottom" />
 *
 * // Without tooltip (just the label text from hook)
 * <ProjectFieldLabel field="duration" htmlFor="duration" showTooltip={false} />
 */
export function ProjectFieldLabel({
  field,
  label: customLabel,
  htmlFor,
  className,
  tooltipSide = "right",
  showTooltip = true,
  children,
}: ProjectFieldLabelProps) {
  const { getTooltip } = useProjectTooltips();
  const { label: defaultLabel, content } = getTooltip(field);

  const labelText = customLabel || defaultLabel;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Label htmlFor={htmlFor}>{children || labelText}</Label>
      {showTooltip && content && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="size-3.5 text-muted-foreground cursor-help" />
          </TooltipTrigger>
          <TooltipContent side={tooltipSide} className="max-w-xs">
            <p>{content}</p>
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

/**
 * Standalone Tooltip Info Icon for cases where you need
 * just the icon without the label (e.g., next to an existing label)
 */
interface ProjectFieldTooltipIconProps {
  field: ProjectTooltipField;
  tooltipSide?: "top" | "right" | "bottom" | "left";
  className?: string;
}

export function ProjectFieldTooltipIcon({
  field,
  tooltipSide = "right",
  className,
}: ProjectFieldTooltipIconProps) {
  const { getContent } = useProjectTooltips();
  const content = getContent(field);

  if (!content) return null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info
          className={cn(
            "size-3.5 text-muted-foreground cursor-help",
            className,
          )}
        />
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="max-w-xs">
        <p>{content}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** Re-export types for convenience */
export type { ProjectTooltipField } from "../hooks/useProjectTooltips";
export { useProjectTooltips } from "../hooks/useProjectTooltips";
