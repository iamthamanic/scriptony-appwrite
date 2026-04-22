import { useState, useEffect } from "react";
import { Plus, X, Tag as TagIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import type { ProjectInspiration } from "./InspirationCard";

interface AddInspirationDialogProps {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: InspirationData) => Promise<void>;
  editInspiration?: ProjectInspiration | null;
}

export interface InspirationData {
  imageUrl: string;
  title?: string;
  description?: string;
  source?: string;
  tags?: string[];
}

export function AddInspirationDialog({
  projectId,
  open,
  onOpenChange,
  onSave,
  editInspiration,
}: AddInspirationDialogProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [source, setSource] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [imagePreviewError, setImagePreviewError] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (editInspiration) {
      setImageUrl(editInspiration.imageUrl || "");
      setTitle(editInspiration.title || "");
      setDescription(editInspiration.description || "");
      setSource(editInspiration.source || "");
      setTags(editInspiration.tags || []);
    } else {
      // Reset form when creating new
      setImageUrl("");
      setTitle("");
      setDescription("");
      setSource("");
      setTags([]);
    }
    setImagePreviewError(false);
  }, [editInspiration, open]);

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!imageUrl.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSave({
        imageUrl: imageUrl.trim(),
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        source: source.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });

      // Reset form
      setImageUrl("");
      setTitle("");
      setDescription("");
      setSource("");
      setTags([]);
      setTagInput("");
      setImagePreviewError(false);

      onOpenChange(false);
    } catch (error) {
      console.error("Error saving inspiration:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto md:w-auto">
        <DialogHeader>
          <DialogTitle>
            {editInspiration ? "Edit Inspiration" : "Add Inspiration"}
          </DialogTitle>
          <DialogDescription>
            Add visual references for your project - screenshots, concept art,
            color palettes, etc.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image URL */}
          <div>
            <Label htmlFor="imageUrl">
              Image URL <span className="text-red-500">*</span>
            </Label>
            <Input
              id="imageUrl"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={(e) => {
                setImageUrl(e.target.value);
                setImagePreviewError(false);
              }}
              className="mt-1"
            />
          </div>

          {/* Image Preview */}
          {imageUrl && (
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-4">
              <Label className="text-xs text-slate-600 mb-2 block">
                Preview
              </Label>
              {!imagePreviewError ? (
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-full h-48 object-cover rounded"
                  onError={() => setImagePreviewError(true)}
                />
              ) : (
                <div className="w-full h-48 bg-slate-100 rounded flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <TagIcon className="w-8 h-8 mx-auto mb-2" />
                    <p className="text-sm">Invalid image URL</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Title */}
          <div>
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              placeholder="e.g., Opening shot color palette"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1"
            />
          </div>

          {/* Source */}
          <div>
            <Label htmlFor="source">Source (optional)</Label>
            <Input
              id="source"
              placeholder="e.g., Blade Runner 2049, Mad Max: Fury Road"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-slate-500 mt-1">
              Film, series, or source material name
            </p>
          </div>

          {/* Tags */}
          <div>
            <Label htmlFor="tags">Tags (optional)</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="tags"
                placeholder="e.g., color-grading, composition, lighting"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Tag List */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="pl-2 pr-1 py-1 gap-1"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:bg-slate-300 rounded p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <p className="text-xs text-slate-500 mt-1">
              Press Enter or click + to add tags
            </p>
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Notes (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add notes about this inspiration..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!imageUrl.trim() || saving}>
            {saving
              ? "Saving..."
              : editInspiration
                ? "Update"
                : "Add Inspiration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
