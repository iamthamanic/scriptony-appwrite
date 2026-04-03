import { useState, useRef, useEffect, useCallback } from "react";

interface ImagePreviewPosition {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function useImagePreview() {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<ImagePreviewPosition | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>, imageUrl: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Maximale Größe für das Vorschaubild
    const maxWidth = Math.min(400, viewportWidth - 32);
    const maxHeight = Math.min(400, viewportHeight - 32);
    
    // Position berechnen (versuche rechts vom Element zu positionieren)
    let left = rect.right + 12;
    let top = rect.top;
    
    // Wenn nicht genug Platz rechts, zeige links
    if (left + maxWidth > viewportWidth - 16) {
      left = rect.left - maxWidth - 12;
    }
    
    // Wenn nicht genug Platz links, zentriere horizontal
    if (left < 16) {
      left = Math.max(16, (viewportWidth - maxWidth) / 2);
    }
    
    // Vertikale Position anpassen wenn nötig
    if (top + maxHeight > viewportHeight - 16) {
      top = Math.max(16, viewportHeight - maxHeight - 16);
    }
    
    // Kleine Verzögerung für bessere UX
    timeoutRef.current = setTimeout(() => {
      setCurrentImage(imageUrl);
      setPreviewPosition({
        top,
        left,
        width: maxWidth,
        height: maxHeight,
      });
      setIsPreviewOpen(true);
    }, 300);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsPreviewOpen(false);
    setCurrentImage(null);
    setPreviewPosition(null);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  /** Programmatic preview (e.g. map pins) — centers in the viewport. */
  const openPreview = useCallback((imageUrl: string) => {
    if (typeof window === "undefined") return;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const maxWidth = Math.min(400, viewportWidth - 32);
    const maxHeight = Math.min(400, viewportHeight - 32);
    setCurrentImage(imageUrl);
    setPreviewPosition({
      top: Math.max(16, (viewportHeight - maxHeight) / 2),
      left: Math.max(16, (viewportWidth - maxWidth) / 2),
      width: maxWidth,
      height: maxHeight,
    });
    setIsPreviewOpen(true);
  }, []);

  const ImagePreviewOverlay = () => {
    if (!isPreviewOpen || !previewPosition || !currentImage) return null;

    return (
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          top: `${previewPosition.top}px`,
          left: `${previewPosition.left}px`,
        }}
      >
        <div className="relative rounded-lg overflow-hidden shadow-2xl border-2 border-primary/20 bg-card animate-in fade-in zoom-in-95 duration-200">
          <img
            src={currentImage}
            alt="Preview"
            className="object-contain"
            style={{
              maxWidth: `${previewPosition.width}px`,
              maxHeight: `${previewPosition.height}px`,
            }}
          />
          {/* Subtle gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />
        </div>
      </div>
    );
  };

  return {
    handleMouseEnter,
    handleMouseLeave,
    openPreview,
    ImagePreviewOverlay,
    isPreviewOpen,
  };
}
