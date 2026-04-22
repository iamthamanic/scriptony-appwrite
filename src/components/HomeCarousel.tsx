import { useState, useEffect, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Film,
  Globe,
  Calendar as CalendarIcon,
  Layers,
  Tv,
  Book,
  Headphones,
} from "lucide-react";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "./ui/carousel";

interface RecentItem {
  id: string;
  title: string;
  description: string;
  lastEdited: Date;
  type: "project" | "world";
  thumbnailUrl?: string;
  genre?: string;
  projectType?: string;
}

interface HomeCarouselProps {
  items: RecentItem[];
  onNavigate: (page: string, id: string) => void;
  showLatestLabel?: boolean;
}

export function HomeCarousel({
  items,
  onNavigate,
  showLatestLabel = false,
}: HomeCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const hasInitialized = useRef(false);

  // Initialize: Scroll to first element (center it) on mount
  useEffect(() => {
    if (!api) return;

    // Initial scroll to center first element (only once)
    if (!hasInitialized.current) {
      setTimeout(() => {
        console.log("🎯 Initial scroll to index 0 (latest item)");
        api.scrollTo(0, true); // true = instant, no animation
        hasInitialized.current = true;
      }, 100);
    }

    // Update current slide
    const updateState = () => {
      setCurrent(api.selectedScrollSnap());
      console.log("📍 Current slide:", api.selectedScrollSnap());
    };

    updateState();
    api.on("select", updateState);
    api.on("reInit", updateState);

    return () => {
      api.off("select", updateState);
    };
  }, [api]);

  // Reset to first item when component remounts
  useEffect(() => {
    if (api && hasInitialized.current) {
      setTimeout(() => {
        console.log("🔄 Resetting to index 0 (latest item)");
        api.scrollTo(0, true);
      }, 100);
    }
  }, [items.length]);

  const handlePrevious = () => {
    console.log("⬅️ PREV CLICKED - Current:", current);
    if (api) {
      api.scrollPrev();
    }
  };

  const handleNext = () => {
    console.log("➡️ NEXT CLICKED - Current:", current);
    if (api) {
      api.scrollNext();
    }
  };

  const getProjectTypeInfo = (type: string) => {
    const typeMap: Record<string, { label: string; Icon: any }> = {
      film: { label: "Film", Icon: Film },
      series: { label: "Serie", Icon: Tv },
      book: { label: "Buch", Icon: Book },
      audio: { label: "Hörspiel", Icon: Headphones },
    };
    return (
      typeMap[type] || {
        label: type.charAt(0).toUpperCase() + type.slice(1),
        Icon: Film,
      }
    );
  };

  return (
    <div className="relative px-0 py-3 md:py-6 pb-12 md:pb-8">
      <style>{`
        /* Custom carousel styling for center focus effect */
        .home-carousel-item {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          opacity: 0.4;
          transform: scale(0.88);
        }

        .home-carousel-item.is-center {
          opacity: 1;
          transform: scale(1);
          z-index: 10;
        }

        /* Mobile: Don't fade as much */
        @media (max-width: 767px) {
          .home-carousel-item {
            opacity: 0.6;
            transform: scale(0.92);
          }
        }

        /* Smooth scrolling */
        .embla__container {
          will-change: transform;
        }

        /* Latest label animation */
        .latest-label {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* "Zuletzt bearbeitet" Label - ONLY when first item is centered */}
      {showLatestLabel && current === 0 && (
        <div className="latest-label text-center mb-2 text-xs text-muted-foreground/60">
          Zuletzt bearbeitet
        </div>
      )}

      {/* Navigation Buttons - Floating */}
      <Button
        variant="outline"
        size="icon"
        onClick={handlePrevious}
        className="absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-20 size-10 md:size-12 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-primary hover:text-primary-foreground"
      >
        <ChevronLeft className="size-5 md:size-6" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        onClick={handleNext}
        className="absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-20 size-10 md:size-12 rounded-full bg-background/80 backdrop-blur-sm shadow-lg hover:bg-primary hover:text-primary-foreground"
      >
        <ChevronRight className="size-5 md:size-6" />
      </Button>

      <Carousel
        setApi={setApi}
        opts={{
          align: "center",
          loop: true,
          skipSnaps: false,
          dragFree: false,
          containScroll: "trimSnaps",
          duration: 25,
        }}
        className="w-full"
      >
        <CarouselContent className={items.length === 1 ? "" : "-ml-4 md:-ml-0"}>
          {items.map((item, index) => (
            <CarouselItem
              key={item.id}
              className={`${items.length === 1 ? "" : "pl-4 md:pl-0 basis-[85%] sm:basis-[70%] md:basis-[38%] lg:basis-[36%]"} home-carousel-item ${
                index === current ? "is-center" : ""
              }`}
            >
              <div className="transition-all duration-300 flex justify-center">
                <Card
                  className={`cursor-pointer transition-all duration-300 overflow-hidden hover:shadow-xl w-full max-w-[240px] sm:max-w-[260px] md:max-w-[280px] lg:max-w-[300px] ${
                    index === current ? "border-primary/50 shadow-lg" : ""
                  }`}
                  onClick={() => {
                    if (index === current) {
                      // Click on center item → Navigate
                      onNavigate(
                        item.type === "project" ? "projekte" : "worldbuilding",
                        item.id,
                      );
                    } else {
                      // Click on side item → Scroll to center
                      api?.scrollTo(index);
                    }
                  }}
                >
                  {/* Thumbnail - Portrait 2:3 Ratio */}
                  <div
                    className="w-full aspect-[2/3] bg-gradient-to-br from-primary/20 to-accent/20 relative"
                    style={
                      item.thumbnailUrl
                        ? {
                            backgroundImage: `url(${item.thumbnailUrl})`,
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                          }
                        : {}
                    }
                  >
                    {!item.thumbnailUrl && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        {item.type === "project" ? (
                          <Film className="size-16 text-primary/30" />
                        ) : (
                          <Globe className="size-16 text-primary/30" />
                        )}
                      </div>
                    )}
                  </div>

                  <CardHeader className="p-4">
                    <CardTitle className="text-base line-clamp-2 mb-2">
                      {item.title}
                    </CardTitle>

                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                        {item.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5">
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
                      {item.projectType &&
                        (() => {
                          const typeInfo = getProjectTypeInfo(item.projectType);
                          const Icon = typeInfo.Icon;
                          return (
                            <Badge
                              variant="outline"
                              className="text-[10px] h-5 px-1.5 flex items-center gap-1"
                            >
                              <Icon className="size-2.5" />
                              {typeInfo.label}
                            </Badge>
                          );
                        })()}
                      {item.genre && (
                        <Badge
                          variant="outline"
                          className="text-[10px] h-5 px-1.5"
                        >
                          {item.genre}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-2">
                      <CalendarIcon className="size-3" />
                      <span>
                        {item.lastEdited.toLocaleDateString("de-DE", {
                          day: "2-digit",
                          month: "2-digit",
                        })}
                        ,{" "}
                        {item.lastEdited.toLocaleTimeString("de-DE", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
