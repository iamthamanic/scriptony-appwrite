import { useRef, useEffect } from "react";
import { Film, Calendar as CalendarIcon } from "lucide-react";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { useTimelineCache } from "../hooks/useTimelineCache";
import { queryClient } from "../lib/react-query";
import { prefetchProjectTimeline } from "../hooks/useProjectTimeline";
import { getAuthToken } from "../lib/auth/getAuthToken";

interface ProjectCardWithPrefetchProps {
  project: {
    id: string;
    title: string;
    logline?: string;
    type: string;
    genre?: string;
    last_edited?: string;
    [key: string]: any;
  };
  coverImage?: string;
  onClick: () => void;
  getProjectTypeInfo: (type: string) => { label: string; Icon: any };
  className?: string;
  isCenter?: boolean;
}

/**
 * 🚀 PERFORMANCE-OPTIMIZED Project Card
 * 
 * Features:
 * - Hover-based prefetching (McMaster-Carr style)
 * - Timeline data preloaded on hover (100ms delay)
 * - Characters & beats also prefetched
 */
export function ProjectCardWithPrefetch({
  project,
  coverImage,
  onClick,
  getProjectTypeInfo,
  className = "",
  isCenter = false,
}: ProjectCardWithPrefetchProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const { prefetchTimeline, prefetchCharacters, prefetchBeats } = useTimelineCache(project.id);

  useEffect(() => {
    if (!cardRef.current) return;

    const cleanupTimeline = prefetchTimeline(cardRef.current);
    const cleanupCharacters = prefetchCharacters(cardRef.current);
    const cleanupBeats = prefetchBeats(cardRef.current);

    const el = cardRef.current;
    const onEnter = () => {
      void prefetchProjectTimeline(queryClient, project.id, project.type, getAuthToken);
    };
    el.addEventListener("mouseenter", onEnter);

    return () => {
      cleanupTimeline();
      cleanupCharacters();
      cleanupBeats();
      el.removeEventListener("mouseenter", onEnter);
    };
  }, [project.id, project.type, prefetchTimeline, prefetchCharacters, prefetchBeats]);

  const { label: typeLabel, Icon: TypeIcon } = getProjectTypeInfo(project.type);

  return (
    <Card
      ref={cardRef}
      className={`cursor-pointer transition-all duration-300 overflow-hidden hover:shadow-xl w-full max-w-[240px] sm:max-w-[260px] md:max-w-[280px] lg:max-w-[300px] ${
        isCenter ? "border-primary/50 shadow-lg" : ""
      } ${className}`}
      onClick={onClick}
    >
      {/* Cover Image - Portrait 2:3 */}
      <div
        className="aspect-[2/3] bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden w-full"
        style={
          coverImage
            ? {
                backgroundImage: `url(${coverImage})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundBlendMode: "overlay",
              }
            : {}
        }
      >
        {!coverImage && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="size-10 md:size-8 text-primary/40" />
          </div>
        )}

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
      </div>

      {/* Project Info */}
      <CardHeader className="p-2.5 md:p-3 space-y-1.5">
        <CardTitle className="text-xs md:text-sm leading-tight line-clamp-2">
          {project.title}
        </CardTitle>

        {project.logline && (
          <p className="text-[10px] md:text-xs text-muted-foreground line-clamp-1">
            {project.logline}
          </p>
        )}

        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="secondary" className="text-[9px] h-4 px-1 flex items-center gap-0.5">
            <TypeIcon className="size-2" />
            {typeLabel}
          </Badge>
          {project.genre && (
            <Badge variant="outline" className="text-[9px] h-4 px-1">
              {project.genre}
            </Badge>
          )}
          {project.last_edited && (
            <div className="flex items-center gap-0.5 text-[8px] md:text-[9px] text-muted-foreground mt-0.5 w-full">
              <CalendarIcon className="size-2" />
              <span>
                {new Date(project.last_edited).toLocaleDateString("de-DE", {
                  day: "2-digit",
                  month: "2-digit",
                })}
                ,{" "}
                {new Date(project.last_edited).toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
        </div>
      </CardHeader>
    </Card>
  );
}
