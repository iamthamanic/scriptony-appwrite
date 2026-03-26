/**
 * ProjectSectionFrame
 * Purpose: Provides a consistent bordered "frame" container for Project Detail sections (e.g. Characters, Inspiration),
 * matching the visual structure used in the Structure & Beats area.
 * Location: src/components/ProjectSectionFrame.tsx
 */

import type { ReactNode } from "react";
import { cn } from "./ui/utils";

type ProjectSectionFrameProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function ProjectSectionFrame({ children, className, contentClassName }: ProjectSectionFrameProps) {
  return (
    <div className={cn("flex border border-border rounded-lg overflow-hidden bg-background", className)}>
      <div className="flex-1 overflow-y-auto h-full">
        <div className={cn("flex flex-col gap-1.5 p-4", contentClassName)}>{children}</div>
      </div>
    </div>
  );
}

