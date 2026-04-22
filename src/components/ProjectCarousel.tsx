import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "./ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "./ui/carousel";
import { ProjectCardWithPrefetch } from "./ProjectCardWithPrefetch";

interface Project {
  id: string;
  title: string;
  logline?: string;
  type: string;
  genre?: string;
  last_edited?: string;
  [key: string]: any;
}

interface ProjectCarouselProps {
  projects: Project[];
  projectCoverImages: Record<string, string>;
  onNavigate: (page: string, id: string) => void;
  getProjectTypeInfo: (type: string) => { label: string; Icon: any };
  showLatestLabel?: boolean;
}

export function ProjectCarousel({
  projects,
  projectCoverImages,
  onNavigate,
  getProjectTypeInfo,
  showLatestLabel = false,
}: ProjectCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const hasInitialized = useRef(false);

  // 🚀 PERFORMANCE: Prefetch manager for each project
  const prefetchRefs = useRef<Map<string, () => void>>(new Map());

  // Cleanup prefetch listeners on unmount
  useEffect(() => {
    return () => {
      prefetchRefs.current.forEach((cleanup) => cleanup());
      prefetchRefs.current.clear();
    };
  }, []);

  // Initialize: Scroll to first element (center it) on mount
  useEffect(() => {
    if (!api) return;

    // Initial scroll to center first element (only once)
    if (!hasInitialized.current) {
      setTimeout(() => {
        console.log("🎯 Initial scroll to index 0 (latest project)");
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

  // Reset to first project when component remounts (e.g., coming back from detail page)
  useEffect(() => {
    if (api && hasInitialized.current) {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        console.log("🔄 Resetting to index 0 (latest project)");
        api.scrollTo(0, true);
      }, 100);
    }
  }, [projects.length]); // Re-run when projects change (e.g., filter applied)

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

  return (
    <div className="relative px-0 py-3 md:py-6 pb-12 md:pb-8">
      <style>{`
        /* Custom carousel styling for center focus effect */
        .project-carousel-item {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        /* Side items: slightly faded with subtle blur */
        .project-carousel-item:not(.is-center) {
          opacity: 0.5;
          filter: blur(2px);
        }
        
        .project-carousel-item:not(.is-center) > div {
          transform: scale(0.92);
        }
        
        /* Center item: sharp and prominent */
        .project-carousel-item.is-center {
          opacity: 1;
          filter: blur(0);
          z-index: 10;
        }
        
        .project-carousel-item.is-center > div {
          transform: scale(1);
        }
        
        /* Carousel dots styling */
        .carousel-dots {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-top: 16px;
        }
        
        .carousel-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: hsl(var(--primary));
          opacity: 0.3;
          transition: opacity 0.3s ease;
          cursor: pointer;
        }
        
        .carousel-dot.active {
          opacity: 1;
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
        
        /* Navigation buttons container - FIXED: Full height */
        .carousel-nav-buttons {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1000;
        }
        
        .carousel-nav-button {
          pointer-events: auto;
          position: absolute;
          cursor: pointer;
          user-select: none;
        }
        
        .carousel-nav-button:active {
          transform: scale(0.95) !important;
        }
      `}</style>

      {/* "Zuletzt bearbeitet" Label - ONLY when first project is centered */}
      {showLatestLabel && current === 0 && (
        <div className="latest-label text-center mb-2 text-xs text-muted-foreground/60">
          Zuletzt bearbeitet
        </div>
      )}

      <Carousel
        setApi={setApi}
        opts={{
          align: "center",
          loop: true, // Enable loop so buttons are never disabled
          skipSnaps: false,
          dragFree: false,
          containScroll: "trimSnaps",
          duration: 25,
        }}
        className="w-full"
      >
        <CarouselContent
          className={projects.length === 1 ? "" : "-ml-4 md:-ml-0"}
        >
          {projects.map((project, index) => (
            <CarouselItem
              key={project.id}
              className={`${projects.length === 1 ? "" : "pl-4 md:pl-0 basis-[85%] sm:basis-[70%] md:basis-[38%] lg:basis-[36%]"} project-carousel-item ${
                index === current ? "is-center" : ""
              }`}
            >
              <div className="transition-all duration-300 flex justify-center">
                <ProjectCardWithPrefetch
                  project={project}
                  coverImage={projectCoverImages[project.id]}
                  onClick={() => {
                    if (index === current) {
                      // Click on center project → Navigate
                      onNavigate("projekte", project.id);
                    } else {
                      // Click on side project → Scroll to center
                      api?.scrollTo(index);
                    }
                  }}
                  getProjectTypeInfo={getProjectTypeInfo}
                  isCenter={index === current}
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* CUSTOM NAVIGATION BUTTONS - OUTSIDE CAROUSEL */}
      {projects.length > 1 && (
        <div className="carousel-nav-buttons">
          {/* Previous Button - Vertically centered on cover only */}
          <Button
            variant="outline"
            size="icon"
            className="carousel-nav-button top-[38%] md:top-[35%] left-1 md:left-4 h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/95 backdrop-blur-sm hover:bg-background shadow-xl border-2 transition-transform hover:scale-110"
            onClick={handlePrevious}
            onPointerDown={(e) => {
              e.preventDefault();
              console.log("🖱️ PREV POINTER DOWN");
            }}
          >
            <ChevronLeft className="size-5 md:size-6" />
          </Button>

          {/* Next Button - Vertically centered on cover only */}
          <Button
            variant="outline"
            size="icon"
            className="carousel-nav-button top-[38%] md:top-[35%] right-1 md:right-4 h-10 w-10 md:h-12 md:w-12 rounded-full bg-background/95 backdrop-blur-sm hover:bg-background shadow-xl border-2 transition-transform hover:scale-110"
            onClick={handleNext}
            onPointerDown={(e) => {
              e.preventDefault();
              console.log("🖱️ NEXT POINTER DOWN");
            }}
          >
            <ChevronRight className="size-5 md:size-6" />
          </Button>
        </div>
      )}

      {/* Dots Navigation */}
      {projects.length > 1 && (
        <div className="carousel-dots">
          {projects.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot ${index === current ? "active" : ""}`}
              onClick={() => {
                console.log("🔘 DOT CLICKED:", index);
                api?.scrollTo(index);
              }}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
