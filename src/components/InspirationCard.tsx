import { useState } from "react";
import { Edit2, Trash2, Tag } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { motion } from "motion/react";

export interface ProjectInspiration {
  id: string;
  projectId: string;
  userId: string;
  imageUrl: string;
  title?: string;
  description?: string;
  source?: string;
  tags?: string[];
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

interface InspirationCardProps {
  inspiration: ProjectInspiration;
  onEdit?: (inspiration: ProjectInspiration) => void;
  onDelete?: (id: string) => void;
}

export function InspirationCard({
  inspiration,
  onEdit,
  onDelete,
}: InspirationCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="group relative overflow-hidden h-48 hover:shadow-lg transition-shadow">
        {/* Image */}
        <div className="relative w-full h-full bg-slate-100">
          {!imageError ? (
            <img
              src={inspiration.imageUrl}
              alt={inspiration.title || "Inspiration"}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                imageLoaded ? "opacity-100" : "opacity-0"
              }`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(true);
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Tag className="w-8 h-8 mx-auto mb-2" />
                <p className="text-xs">Image failed to load</p>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {!imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-slate-200 animate-pulse" />
          )}
        </div>

        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          {/* Content */}
          <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
            {inspiration.title && (
              <p className="text-sm mb-1 line-clamp-1">{inspiration.title}</p>
            )}

            {inspiration.source && (
              <p className="text-xs text-white/80 mb-2 line-clamp-1">
                {inspiration.source}
              </p>
            )}

            {/* Tags */}
            {inspiration.tags && inspiration.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {inspiration.tags.slice(0, 3).map((tag, index) => (
                  <Badge
                    key={`${tag}-${index}`}
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-5 bg-white/20 text-white border-white/30"
                  >
                    {tag}
                  </Badge>
                ))}
                {inspiration.tags.length > 3 && (
                  <Badge
                    variant="secondary"
                    className="text-xs px-1.5 py-0 h-5 bg-white/20 text-white border-white/30"
                  >
                    +{inspiration.tags.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Description (on hover) */}
            {inspiration.description && (
              <p className="text-xs text-white/70 line-clamp-2 mb-2">
                {inspiration.description}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="absolute top-2 right-2 flex gap-1">
            {onEdit && (
              <Button
                size="sm"
                variant="secondary"
                className="h-7 w-7 p-0 bg-white/90 hover:bg-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(inspiration);
                }}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </Button>
            )}

            {onDelete && (
              <Button
                size="sm"
                variant="destructive"
                className="h-7 w-7 p-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(inspiration.id);
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
