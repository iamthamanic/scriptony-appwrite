import { useState, useEffect } from "react";
import {
  Clock,
  Quote,
  ChevronRight,
  Film,
  Globe,
  Layers,
  Tv,
  Book,
  Headphones,
  List,
  LayoutGrid,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { LoadingSpinner } from "../LoadingSpinner";
import { HomeCarousel } from "../HomeCarousel";
import { projectsApi, worldsApi } from "../../utils/api";

interface HomePageProps {
  onNavigate: (page: string, id?: string) => void;
}

type RecentItem = {
  id: string;
  title: string;
  description: string;
  lastEdited: Date;
  type: "project" | "world";
  thumbnailUrl?: string;
  genre?: string;
  projectType?: string;
};

export function HomePage({ onNavigate }: HomePageProps) {
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"carousel" | "list">(() => {
    // 💾 Load from localStorage, default: list
    const saved = localStorage.getItem("scriptony_home_view_mode");
    if (saved === "carousel" || saved === "list") return saved;
    // Default: list (Desktop & Mobile)
    return "list";
  });

  useEffect(() => {
    loadRecentItems();
  }, []);

  // 💾 Save view mode to localStorage
  useEffect(() => {
    localStorage.setItem("scriptony_home_view_mode", viewMode);
  }, [viewMode]);

  const loadRecentItems = async () => {
    try {
      setLoading(true);
      const [projects, worlds] = await Promise.all([
        projectsApi.getAll(),
        worldsApi.getAll(),
      ]);

      // Combine and normalize projects and worlds
      const items: RecentItem[] = [];

      if (projects && Array.isArray(projects)) {
        projects.forEach((p: any) => {
          items.push({
            id: p.id,
            title: p.title,
            description: p.logline || "",
            lastEdited: new Date(p.last_edited || p.created_at),
            type: "project",
            thumbnailUrl: p.cover_image_url, // ✅ Map DB column to frontend property
            genre: p.genre,
            projectType: p.type,
          });
        });
      }

      if (worlds && Array.isArray(worlds)) {
        worlds.forEach((w: any) => {
          items.push({
            id: w.id,
            title: w.name,
            description: w.description || "",
            lastEdited: new Date(w.updated_at || w.created_at),
            type: "world",
            thumbnailUrl: w.cover_image_url, // ✅ Map DB column to frontend property
          });
        });
      }

      // Sort by lastEdited and take top 5
      const sorted = items
        .sort((a, b) => {
          return b.lastEdited.getTime() - a.lastEdited.getTime();
        })
        .slice(0, 5);

      setRecentItems(sorted);
    } catch (error) {
      console.error("Error loading recent items:", error);
      setRecentItems([]);
    } finally {
      setLoading(false);
    }
  };

  const quote = {
    text: "The scariest moment is always just before you start.",
    author: "Stephen King",
  };

  if (loading) {
    return (
      <div className="min-h-screen pb-24 flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header - Mobile optimiert */}
      <div className="px-4 py-6 bg-gradient-to-b from-primary/5 to-transparent">
        <p className="text-muted-foreground">Willkommen zurück! 👋</p>
      </div>

      {/* Recent Items */}
      <section className={viewMode === "list" ? "px-4 mb-8" : "mb-8"}>
        <div className="flex items-center justify-end mb-4 px-4">
          {/* View Toggle */}
          <div className="flex gap-1 border rounded-lg p-0.5 bg-background">
            <Button
              variant={viewMode === "carousel" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("carousel")}
              className="h-7 px-2.5 gap-1.5"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-3.5"
              >
                {/* Left rectangle - smaller */}
                <rect
                  x="1"
                  y="4"
                  width="3"
                  height="8"
                  rx="0.5"
                  fill="currentColor"
                  opacity="0.6"
                />
                {/* Center rectangle - larger */}
                <rect
                  x="6"
                  y="2"
                  width="4"
                  height="12"
                  rx="0.5"
                  fill="currentColor"
                />
                {/* Right rectangle - smaller */}
                <rect
                  x="12"
                  y="4"
                  width="3"
                  height="8"
                  rx="0.5"
                  fill="currentColor"
                  opacity="0.6"
                />
              </svg>
              <span className="text-xs hidden sm:inline">Carousel</span>
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-7 px-2.5 gap-1.5"
            >
              <List className="size-3.5" />
              <span className="text-xs hidden sm:inline">Liste</span>
            </Button>
          </div>
        </div>

        {recentItems.length === 0 ? (
          <Card className="mx-4">
            <CardContent className="p-8 text-center text-muted-foreground">
              Noch keine Inhalte. Erstelle dein erstes Projekt oder deine erste
              Welt!
            </CardContent>
          </Card>
        ) : viewMode === "carousel" ? (
          <HomeCarousel
            items={recentItems}
            onNavigate={(page, id) => onNavigate(page, id)}
            showLatestLabel={recentItems.length > 0}
          />
        ) : (
          <div className="space-y-3 px-4">
            {recentItems.map((item, index) => (
              <Card
                key={item.id}
                className="active:scale-[0.99] transition-transform cursor-pointer overflow-hidden hover:border-primary/30 relative"
                onClick={() =>
                  onNavigate(
                    item.type === "project" ? "projekte" : "worldbuilding",
                    item.id,
                  )
                }
              >
                {/* "Zuletzt bearbeitet" Badge - ONLY first item - TOP RIGHT */}
                {index === 0 && (
                  <Badge
                    variant="default"
                    className="absolute top-2 right-2 z-10 text-[9px] h-4 px-1.5 flex items-center gap-0.5 shadow-md"
                  >
                    <Clock className="size-2" />
                    Zuletzt bearbeitet
                  </Badge>
                )}

                <div className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-primary/20 border-2 border-transparent hover:border-primary/30">
                  {/* Thumbnail Left - Portrait 2:3 Ratio */}
                  <div
                    className="w-[67px] h-[100px] rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden shrink-0"
                    style={
                      item.thumbnailUrl
                        ? {
                            backgroundImage: `url(${item.thumbnailUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundBlendMode: "overlay",
                          }
                        : {}
                    }
                  >
                    {!item.thumbnailUrl && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {item.type === "project" ? (
                          // Show icon based on project type
                          item.projectType === "book" ? (
                            <Book className="size-5 text-primary/40" />
                          ) : item.projectType === "series" ? (
                            <Tv className="size-5 text-primary/40" />
                          ) : item.projectType === "audio" ? (
                            <Headphones className="size-5 text-primary/40" />
                          ) : (
                            <Film className="size-5 text-primary/40" />
                          )
                        ) : (
                          <Globe className="size-5 text-primary/40" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content Right */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm leading-snug line-clamp-1">
                        {item.title}
                      </h3>
                      <ChevronRight className="size-4 text-muted-foreground shrink-0 mt-0.5" />
                    </div>

                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                        {item.description}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant={
                          item.type === "project" ? "secondary" : "outline"
                        }
                        className="text-[10px] h-5 px-1.5 flex items-center gap-1"
                      >
                        {item.type === "project" ? (
                          <>
                            <Layers className="size-2.5" />
                            Projekt
                          </>
                        ) : (
                          <>
                            <Globe className="size-2.5" />
                            Welt
                          </>
                        )}
                      </Badge>
                      {item.projectType && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-1.5 flex items-center gap-1"
                        >
                          {(() => {
                            const typeMap: Record<
                              string,
                              { label: string; Icon: any }
                            > = {
                              film: { label: "Film", Icon: Film },
                              series: { label: "Serie", Icon: Tv },
                              book: { label: "Buch", Icon: Book },
                              audio: { label: "Hörspiel", Icon: Headphones },
                            };
                            const typeInfo = typeMap[item.projectType] || {
                              label:
                                item.projectType?.charAt(0).toUpperCase() +
                                  item.projectType?.slice(1) || "",
                              Icon: Film,
                            };
                            const Icon = typeInfo.Icon;
                            return (
                              <>
                                <Icon className="size-2.5" />
                                {typeInfo.label}
                              </>
                            );
                          })()}
                        </Badge>
                      )}
                      {item.genre && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-1.5"
                        >
                          {item.genre}
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Clock className="size-3" />
                        <span>
                          {item.lastEdited.toLocaleDateString("de-DE", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })}
                          ,{" "}
                          {item.lastEdited.toLocaleTimeString("de-DE", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Quote */}
      <section className="px-4">
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <Quote className="size-10 text-primary mb-4 opacity-50" />
              <p className="italic mb-3 text-sm leading-relaxed">
                &ldquo;{quote.text}&rdquo;
              </p>
              <p className="text-xs text-muted-foreground">— {quote.author}</p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
