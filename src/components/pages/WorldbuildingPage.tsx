import { useState, useRef, useEffect } from "react";
import { Globe, Plus, Mountain, Landmark, Users, Palette, Building, FileText, ArrowLeft, ChevronRight, ChevronDown, Upload, Search, Calendar as CalendarIcon, X, Camera, Edit2, Save, History, Zap, Coins, BookOpen, Languages, TreePine, Film, Trash2, AlertTriangle, Loader2, LayoutGrid, List, MoreVertical, Copy, BarChart3, Clock } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { projectsApi, worldsApi } from "../../utils/api";
import { getCharacters } from "../../lib/api/characters-api";
import { getAuthToken } from "../../lib/auth/getAuthToken";
import {
  uploadWorldImage,
  validateImageFile,
  needsGifUserConfirmation,
  type ImageUploadGifMode,
} from "../../lib/api/image-upload-api";
import { STORAGE_CONFIG } from "../../lib/config";
import { GifAnimationUploadDialog } from "../GifAnimationUploadDialog";
import { ImageUploadWaveOverlay } from "../ImageUploadWaveOverlay";
import { MapBuilder } from "../MapBuilder";
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../ui/dropdown-menu";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { EmptyState } from "../EmptyState";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { Calendar } from "../ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { useImagePreview } from "../hooks/useImagePreview";
import { WorldStatsLogsDialog } from "../WorldStatsLogsDialog";
import { WorldCarousel } from "../WorldCarousel";
import { toast } from "sonner@2.0.3";

interface WorldbuildingPageProps {
  selectedWorldId?: string;
  selectedCategoryId?: string;
  onNavigate: (page: string, worldId?: string, categoryId?: string) => void;
}

export function WorldbuildingPage({ selectedWorldId, onNavigate }: WorldbuildingPageProps) {
  const [showNewWorldDialog, setShowNewWorldDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [worldCoverImages, setWorldCoverImages] = useState<Record<string, string>>({});
  const [projects, setProjects] = useState<any[]>([]);
  const [worlds, setWorlds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Load view preference from localStorage, default to "carousel"
  const [viewMode, setViewMode] = useState<"carousel" | "list">(() => {
    const saved = localStorage.getItem("worlds_view_mode");
    return (saved === "carousel" || saved === "list") ? saved : "carousel";
  });
  
  // Delete World States
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedWorld, setSelectedWorld] = useState<string | null>(null);

  // Stats Dialog States
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [selectedStatsWorld, setSelectedStatsWorld] = useState<any | null>(null);

  // New World Form States
  const [newWorldName, setNewWorldName] = useState("");
  const [newWorldDescription, setNewWorldDescription] = useState("");
  const [newWorldLinkedProject, setNewWorldLinkedProject] = useState("none");
  const [createLoading, setCreateLoading] = useState(false);

  // Simple cache to avoid reloading on every mount
  const dataLoadedRef = useRef(false);

  // Load projects and worlds from API
  useEffect(() => {
    // Only load data once per session (simple cache)
    if (dataLoadedRef.current) return;

    async function loadData() {
      try {
        setLoading(true);
        
        // Load projects and worlds in parallel (NO characters yet - lazy load later)
        const [projectsData, worldsData] = await Promise.all([
          projectsApi.getAll(),
          worldsApi.getAll(),
        ]);
        
        // Set projects WITHOUT characters (lazy load when needed)
        setProjects(projectsData.map((project: any) => ({
          ...project,
          characters: [] // Empty array, will be loaded on-demand
        })));
        
        // Set worlds
        const worldsWithDates = worldsData.map((world: any) => ({
          ...world,
          lastEdited: new Date(world.updated_at || world.created_at)
        }));
        setWorlds(worldsWithDates);
        
        // 📸 Load cover images from DB into state
        const coverImages: Record<string, string> = {};
        worldsData.forEach((world: any) => {
          if (world.cover_image_url) {
            coverImages[world.id] = world.cover_image_url;
          }
        });
        setWorldCoverImages(coverImages);
        
        // Mark data as loaded (cache)
        dataLoadedRef.current = true;
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  const handleCreateWorld = async () => {
    if (!newWorldName.trim()) {
      toast.error("Bitte Namen eingeben");
      return;
    }

    setCreateLoading(true);

    try {
      const newWorld = await worldsApi.create({
        name: newWorldName,
        description: newWorldDescription,
        linkedProjectId: newWorldLinkedProject !== "none" ? newWorldLinkedProject : null,
      });

      // Add to local state with formatted date
      setWorlds([...worlds, {
        ...newWorld,
        lastEdited: new Date(newWorld.updated_at || new Date())
      }]);

      // Reset form
      setNewWorldName("");
      setNewWorldDescription("");
      setNewWorldLinkedProject("none");
      setShowNewWorldDialog(false);

      toast.success("Welt erfolgreich erstellt!");
    } catch (error: any) {
      console.error("Error creating world:", error);
      toast.error(error.message || "Fehler beim Erstellen der Welt");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteWorld = async () => {
    if (!deletePassword.trim()) {
      toast.error("Bitte Passwort eingeben");
      return;
    }

    const worldToDelete = selectedWorld || selectedWorldId;
    if (!worldToDelete) return;

    setDeleteLoading(true);

    try {
      await worldsApi.delete(worldToDelete, deletePassword);
      
      // Remove from local state
      setWorlds(worlds.filter(w => w.id !== worldToDelete));
      
      // Reset states
      setShowDeleteDialog(false);
      setDeletePassword("");
      setSelectedWorld(null);
      
      toast.success("Welt erfolgreich gelöscht");
      
      // Navigate back to worlds list only if we were in detail view
      if (selectedWorldId) {
        onNavigate("worldbuilding");
      }
    } catch (error: any) {
      console.error("Error deleting world:", error);
      toast.error(error.message || "Fehler beim Löschen der Welt");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleDuplicateWorld = async (worldId: string) => {
    try {
      const originalWorld = worlds.find(w => w.id === worldId);
      if (!originalWorld) return;

      const duplicated = await worldsApi.create({
        name: `${originalWorld.name} (Kopie)`,
        description: originalWorld.description,
        linkedProjectId: originalWorld.linkedProjectId,
      });

      setWorlds([...worlds, {
        ...duplicated,
        lastEdited: new Date(duplicated.updated_at || new Date())
      }]);
      
      // Copy cover image if exists
      if (worldCoverImages[worldId]) {
        setWorldCoverImages(prev => ({
          ...prev,
          [duplicated.id]: worldCoverImages[worldId]
        }));
      }

      toast.success("Welt erfolgreich dupliziert!");
    } catch (error) {
      console.error("Error duplicating world:", error);
      toast.error("Fehler beim Duplizieren der Welt");
    }
  };

  const handleUpdateWorld = async (worldId: string, updates: { name?: string; description?: string; linked_project_id?: string | null; cover_image_url?: string }) => {
    try {
      const updated = await worldsApi.update(worldId, updates);
      
      // Update local state
      setWorlds(worlds.map(w => w.id === worldId ? {
        ...w,
        ...updated,
        lastEdited: new Date(updated.updated_at || new Date())
      } : w));
      
      // Only show success toast if not just updating cover image (that has its own toast)
      if (!updates.cover_image_url || Object.keys(updates).length > 1) {
        toast.success("Welt erfolgreich aktualisiert!");
      }
    } catch (error) {
      console.error("Error updating world:", error);
      toast.error("Fehler beim Aktualisieren der Welt");
    }
  };

  const handleOpenStatsDialog = (world: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedStatsWorld(world);
    setShowStatsDialog(true);
  };

  // Save view mode preference to localStorage
  useEffect(() => {
    localStorage.setItem("worlds_view_mode", viewMode);
  }, [viewMode]);

  // Show world detail if world is selected
  if (selectedWorldId && worlds.length > 0) {
    const selectedWorldData = worlds.find(w => w.id === selectedWorldId);
    if (!selectedWorldData) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-muted-foreground">Welt nicht gefunden</p>
            <Button onClick={() => onNavigate("worldbuilding")} className="mt-4">
              Zurück zur Übersicht
            </Button>
          </div>
        </div>
      );
    }

    return (
      <WorldDetail 
        world={selectedWorldData} 
        onBack={() => onNavigate("worldbuilding")} 
        onUpdate={handleUpdateWorld}
        onDuplicate={() => handleDuplicateWorld(selectedWorldData.id)}
        onShowStats={() => {
          setSelectedStatsWorld(selectedWorldData);
          setShowStatsDialog(true);
        }}
        coverImage={worldCoverImages[selectedWorldData.id]}
        onCoverImageChange={async (imageUrl) => {
          // Update local state immediately (optimistic UI)
          setWorldCoverImages(prev => ({
            ...prev,
            [selectedWorldData.id]: imageUrl
          }));
          
          // Update in database
          try {
            await handleUpdateWorld(selectedWorldData.id, { 
              cover_image_url: imageUrl 
            });
          } catch (error) {
            console.error('Error saving image URL to database:', error);
            // Note: Toast already shown in handleFileChange
          }
        }}
        projects={projects}
        onDelete={handleDeleteWorld}
        showDeleteDialog={showDeleteDialog}
        setShowDeleteDialog={setShowDeleteDialog}
        deletePassword={deletePassword}
        setDeletePassword={setDeletePassword}
        deleteLoading={deleteLoading}
      />
    );
  }

  return (
    <div className="min-h-screen pb-24">
      {/* Header - Mobile optimiert */}
      <div className="px-4 py-6 bg-gradient-to-b from-primary/5 to-transparent">
        <div className="flex items-center gap-1.5 mb-4">
          <div className="flex-1 relative min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input 
              placeholder="Welten durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex border rounded-lg p-0.5 bg-muted/30 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("carousel")}
              className={`h-8 w-8 p-0 ${viewMode === "carousel" ? "bg-background shadow-sm" : ""}`}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="size-4"
              >
                {/* Left rectangle - smaller */}
                <rect x="1" y="4" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6" />
                {/* Center rectangle - larger */}
                <rect x="6" y="2" width="4" height="12" rx="0.5" fill="currentColor" />
                {/* Right rectangle - smaller */}
                <rect x="12" y="4" width="3" height="8" rx="0.5" fill="currentColor" opacity="0.6" />
              </svg>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("list")}
              className={`h-8 w-8 p-0 ${viewMode === "list" ? "bg-background shadow-sm" : ""}`}
            >
              <List className="size-4" />
            </Button>
          </div>
          
          {/* Date Filter - Ultra Compact */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-[70px] justify-center text-left font-normal px-1.5 shrink-0"
              >
                <CalendarIcon className="size-3.5 shrink-0" />
                {dateFrom ? (
                  <span className="ml-0.5 text-[11px] truncate">
                    {dateFrom.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                  </span>
                ) : (
                  <span className="ml-0.5 text-[11px] text-muted-foreground">Von</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-9 w-[70px] justify-center text-left font-normal px-1.5 shrink-0"
              >
                <CalendarIcon className="size-3.5 shrink-0" />
                {dateTo ? (
                  <span className="ml-0.5 text-[11px] truncate">
                    {dateTo.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })}
                  </span>
                ) : (
                  <span className="ml-0.5 text-[11px] text-muted-foreground">Bis</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {(dateFrom || dateTo) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
              className="h-9 w-9 p-0 shrink-0"
            >
              <X className="size-3.5" />
            </Button>
          )}
        </div>
        
        <Button 
          onClick={() => setShowNewWorldDialog(true)}
          size="sm"
          className="h-9 w-full"
        >
          <Plus className="size-4 mr-1.5" />
          Neue Welt erstellen
        </Button>
      </div>

      {/* Worlds List */}
      <div className={viewMode === "carousel" ? "" : "px-4"}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : worlds.length === 0 ? (
          <div className="px-4">
            <EmptyState
              icon={Globe}
              title="Keine Welten vorhanden"
              description="Erstelle deine erste Welt und füge Kategorien und Assets hinzu."
              actionLabel="Neue Welt erstellen"
              onAction={() => setShowNewWorldDialog(true)}
            />
          </div>
        ) : viewMode === "carousel" ? (
          // CAROUSEL VIEW
          <WorldCarousel
            worlds={worlds.filter(world => 
              searchQuery === "" || 
              world.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
              world.description.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            worldCoverImages={worldCoverImages}
            onNavigate={onNavigate}
            showLatestLabel={true}
          />
        ) : (
          <motion.div 
            className="space-y-2"
            layout
          >
            <AnimatePresence mode="popLayout">
              {worlds
                .filter(world => 
                  searchQuery === "" || 
                  world.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  world.description.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((world, index) => (
                  <motion.div
                    key={world.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* LIST VIEW */}
                      <Card
                        className="active:scale-[0.99] transition-transform cursor-pointer overflow-hidden hover:border-primary/30 relative"
                        onClick={() => onNavigate("worldbuilding", world.id)}
                      >
                        {/* "Zuletzt bearbeitet" Badge - ONLY first item - TOP RIGHT */}
                        {index === 0 && (
                          <Badge variant="default" className="absolute top-2 right-2 z-10 text-[9px] h-4 px-1.5 flex items-center gap-0.5 shadow-md">
                            <Clock className="size-2" />
                            Zuletzt bearbeitet
                          </Badge>
                        )}
                        
                        <div className="flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-primary/20 border-2 border-transparent hover:border-primary/30">
                          {/* Icon/Thumbnail Left - Portrait 2:3 Ratio */}
                          <div 
                            className="w-[56px] h-[84px] rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden shrink-0 flex items-center justify-center"
                            style={worldCoverImages[world.id] ? { 
                              backgroundImage: `url(${worldCoverImages[world.id]})`, 
                              backgroundSize: 'cover', 
                              backgroundPosition: 'center',
                              backgroundBlendMode: 'overlay'
                            } : {}}
                          >
                            {!worldCoverImages[world.id] && (
                              <Globe className="size-8 text-primary/40" />
                            )}
                          </div>

                          {/* Content Right */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h3 className="font-semibold text-sm leading-snug line-clamp-1">
                                {world.name}
                              </h3>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <MoreVertical className="size-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigate("worldbuilding", world.id);
                                  }}>
                                    <Edit2 className="size-3.5 mr-2" />
                                    Welt bearbeiten
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => {
                                    e.stopPropagation();
                                    handleDuplicateWorld(world.id);
                                  }}>
                                    <Copy className="size-3.5 mr-2" />
                                    Welt duplizieren
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={(e) => handleOpenStatsDialog(world, e)}>
                                    <BarChart3 className="size-3.5 mr-2" />
                                    Statistiken & Logs
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedWorld(world.id);
                                      setShowDeleteDialog(true);
                                    }}
                                    className="text-red-600 focus:text-red-600"
                                  >
                                    <Trash2 className="size-3.5 mr-2" />
                                    Welt löschen
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            
                            {world.description && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                                {world.description}
                              </p>
                            )}

                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] text-muted-foreground">
                                Zuletzt: {world.lastEdited.toLocaleDateString("de-DE", { 
                                  day: "2-digit", 
                                  month: "2-digit",
                                  year: "numeric"
                                })}, {world.lastEdited.toLocaleTimeString("de-DE", { 
                                  hour: "2-digit", 
                                  minute: "2-digit" 
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </Card>
                  </motion.div>
                ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      {/* New World Dialog */}
      <Dialog open={showNewWorldDialog} onOpenChange={setShowNewWorldDialog}>
        <DialogContent className="w-[95vw] max-w-2xl rounded-2xl max-h-[85vh] overflow-y-auto md:w-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Neue Welt erstellen</DialogTitle>
            <DialogDescription className="sr-only">Erstelle eine neue Welt für dein Worldbuilding</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name der Welt</Label>
              <Input 
                placeholder="z.B. Mittelerde, Westeros, Tatooine..." 
                className="h-11"
                value={newWorldName}
                onChange={(e) => setNewWorldName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea 
                placeholder="Eine kurze Beschreibung deiner Welt..." 
                rows={3}
                value={newWorldDescription}
                onChange={(e) => setNewWorldDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Verknüpftes Projekt (Optional)</Label>
              <Select value={newWorldLinkedProject} onValueChange={setNewWorldLinkedProject}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Kein Projekt verknüpft" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Kein Projekt</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Charaktere aus dem Projekt können auf der Karte platziert werden
              </p>
            </div>
            <div className="space-y-2">
              <Label>Cover-Bild (Optional)</Label>
              <button className="w-full border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary/50 transition-colors active:scale-[0.98] cursor-pointer bg-muted/10">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="size-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm mb-1">Bild hochladen</p>
                  <p className="text-xs text-muted-foreground">Empfohlen: 1200×630px</p>
                </div>
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowNewWorldDialog(false);
                setNewWorldName("");
                setNewWorldDescription("");
                setNewWorldLinkedProject("none");
              }} 
              className="h-11"
              disabled={createLoading}
            >
              Abbrechen
            </Button>
            <Button 
              onClick={handleCreateWorld} 
              className="h-11"
              disabled={createLoading}
            >
              {createLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Wird erstellt...
                </>
              ) : (
                "Welt erstellen"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* World Stats & Logs Dialog */}
      {selectedStatsWorld && (
        <WorldStatsLogsDialog
          open={showStatsDialog}
          onOpenChange={setShowStatsDialog}
          world={selectedStatsWorld}
        />
      )}

      {/* Delete World Dialog - Must be here for list delete! */}
      <AlertDialog open={showDeleteDialog && !selectedWorldId} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="size-10 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="size-5 text-red-500" />
              </div>
              <AlertDialogTitle>Welt wirklich löschen?</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden. 
                  Die Welt wird permanent gelöscht, inklusive aller:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Kategorien & Assets</li>
                  <li>Worldbuilding-Elemente</li>
                  <li>Kartendaten</li>
                  <li>Verknüpfungen</li>
                </ul>
                <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                  <Label htmlFor="delete-password" className="text-sm">
                    Passwort zur Bestätigung eingeben:
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Dein Passwort"
                    className="h-10"
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeletePassword("");
              setShowDeleteDialog(false);
              setSelectedWorld(null);
            }}>
              Abbrechen
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteWorld}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleteLoading}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  Welt löschen
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface WorldDetailProps {
  world: any;
  onBack: () => void;
  onUpdate: (worldId: string, updates: { name: string; description: string; linked_project_id?: string | null }) => Promise<void>;
  onDuplicate?: () => void;
  onShowStats?: () => void;
  coverImage?: string;
  onCoverImageChange: (imageUrl: string) => void;
  projects: Array<{
    id: string;
    title: string;
    characters: Array<{
      id: string;
      name: string;
      color: string;
      imageUrl?: string;
      image?: string; // Support both field names for compatibility
    }>;
  }>;
  onDelete: () => Promise<void>;
  showDeleteDialog: boolean;
  setShowDeleteDialog: (show: boolean) => void;
  deletePassword: string;
  setDeletePassword: (password: string) => void;
  deleteLoading: boolean;
}

function WorldDetail({ world, onBack, onUpdate, onDuplicate, onShowStats, coverImage, onCoverImageChange, projects: initialProjects, onDelete, showDeleteDialog, setShowDeleteDialog, deletePassword, setDeletePassword, deleteLoading }: WorldDetailProps) {
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [editedName, setEditedName] = useState(world.name);
  const [editedDescription, setEditedDescription] = useState(world.description);
  const [linkedProjectId, setLinkedProjectId] = useState(world.linkedProjectId || "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [gifCoverPending, setGifCoverPending] = useState<File | null>(null);
  const [worldCoverUploading, setWorldCoverUploading] = useState(false);
  const [projects, setProjects] = useState(initialProjects);

  // Reload project characters from localStorage
  useEffect(() => {
    const loadProjectCharacters = (projectId: string) => {
      const storageKey = `project-${projectId}-characters`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          return parsed.map((char: any) => ({
            id: char.id,
            name: char.name,
            color: "#3B82F6",
            imageUrl: char.image || undefined,
            image: char.image || undefined
          }));
        } catch (e) {
          console.error('Error loading project characters:', e);
        }
      }
      // Return fallback characters from initialProjects if available
      const project = initialProjects.find(p => p.id === projectId);
      return project?.characters || [];
    };

    const updatedProjects = initialProjects.map(proj => ({
      ...proj,
      characters: loadProjectCharacters(proj.id)
    }));
    
    setProjects(updatedProjects);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedProjectId]); // Reload when linkedProjectId changes
  
  // State for managing open categories and assets
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [openAssets, setOpenAssets] = useState<string[]>([]);
  const [showNewAssetDialog, setShowNewAssetDialog] = useState(false);
  const [showNewCategoryDialog, setShowNewCategoryDialog] = useState(false);
  const [selectedCategoryForNewAsset, setSelectedCategoryForNewAsset] = useState<string>("");
  const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
  const [editAssetData, setEditAssetData] = useState<{name: string; description: string}>({
    name: "",
    description: ""
  });
  const [assetImages, setAssetImages] = useState<Record<string, string>>({});
  const assetImageInputRef = useRef<HTMLInputElement>(null);
  const [currentUploadAssetId, setCurrentUploadAssetId] = useState<string | null>(null);
  const [customCategories, setCustomCategories] = useState<Array<{
    id: string;
    name: string;
    icon: typeof Mountain;
    description: string;
    assets: Array<{id: string; name: string; description: string}>;
  }>>([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryDescription, setNewCategoryDescription] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState<string>("building");

  // Image Preview Hook
  const { handleMouseEnter, handleMouseLeave, ImagePreviewOverlay } = useImagePreview();

  // Icon Mapping
  const iconMap: Record<string, typeof Mountain> = {
    mountain: Mountain,
    landmark: Landmark,
    users: Users,
    palette: Palette,
    building: Building,
    filetext: FileText,
    history: History,
    zap: Zap,
    coins: Coins,
    bookopen: BookOpen,
    languages: Languages,
    treepine: TreePine,
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    
    const newCategory = {
      id: `custom-${Date.now()}`,
      name: newCategoryName,
      icon: iconMap[newCategoryIcon] || Building,
      description: newCategoryDescription,
      assets: []
    };
    
    setCustomCategories(prev => [...prev, newCategory]);
    setShowNewCategoryDialog(false);
    setNewCategoryName("");
    setNewCategoryDescription("");
    setNewCategoryIcon("building");
  };

  // Demo: Set some example images for assets
  useEffect(() => {
    setAssetImages({
      "geo-1": "https://images.unsplash.com/photo-1604223190546-a43e4c7f29d7?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb3VudGFpbiUyMGxhbmRzY2FwZXxlbnwxfHx8fDE3NTkyNTY3MDF8MA&ixlib=rb-4.1.0&q=80&w=1080",
      "geo-2": "https://images.unsplash.com/photo-1621615786017-cb7fad00454f?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyaXZlciUyMG5hdHVyZXxlbnwxfHx8fDE3NTkzMjgzNDh8MA&ixlib=rb-4.1.0&q=80&w=1080",
      "geo-3": "https://images.unsplash.com/photo-1721696831930-b4be8f65ecda?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxjcnlzdGFsJTIwbGFrZXxlbnwxfHx8fDE3NTkzMjgzNDd8MA&ixlib=rb-4.1.0&q=80&w=1080",
    });
  }, []);

  const handleCoverClick = () => {
    fileInputRef.current?.click();
  };

  const uploadWorldCoverFile = async (file: File, gifMode?: ImageUploadGifMode) => {
    setWorldCoverUploading(true);
    toast.loading("Bild wird hochgeladen…");
    try {
      const imageUrl = await uploadWorldImage(world.id, file, { gifMode });
      onCoverImageChange(imageUrl);
      toast.dismiss();
      toast.success("Bild erfolgreich hochgeladen!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "Fehler beim Hochladen");
    } finally {
      setWorldCoverUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;

    try {
      validateImageFile(file, 5);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ungültiges Bild");
      return;
    }

    if (needsGifUserConfirmation(file)) {
      setGifCoverPending(file);
      return;
    }

    await uploadWorldCoverFile(file, undefined);
  };

  const handleAssetImageClick = (assetId: string) => {
    setCurrentUploadAssetId(assetId);
    assetImageInputRef.current?.click();
  };

  const handleAssetImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentUploadAssetId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        setAssetImages(prev => ({
          ...prev,
          [currentUploadAssetId]: imageUrl
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const toggleAsset = (assetId: string) => {
    setOpenAssets(prev => 
      prev.includes(assetId) 
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  // 10 Standard-Kategorien mit Standard-Assets
  const baseCategories = [
    {
      id: "geography",
      name: "Geographie",
      icon: Mountain,
      description: "Orte, Landschaften und geografische Besonderheiten",
      assets: [
        { id: "geo-1", name: "Nordberge", description: "Eine imposante Bergkette im Norden" },
        { id: "geo-2", name: "Silberfluss", description: "Ein glitzernder Fluss durch das Land" },
        { id: "geo-3", name: "Kristallsee", description: "Ein See mit kristallklarem Wasser" },
      ]
    },
    {
      id: "politics",
      name: "Politik",
      icon: Landmark,
      description: "Regierungssysteme, Machtstrukturen und Gesetze",
      assets: [
        { id: "pol-1", name: "Königsrat", description: "Das herrschende Gremium" },
        { id: "pol-2", name: "Verfassung", description: "Die grundlegenden Gesetze" },
      ]
    },
    {
      id: "society",
      name: "Gesellschaft",
      icon: Users,
      description: "Soziale Strukturen, Klassen und Hierarchien",
      assets: [
        { id: "soc-1", name: "Adelstand", description: "Die herrschende Klasse" },
        { id: "soc-2", name: "Gilden", description: "Handwerker-Vereinigungen" },
      ]
    },
    {
      id: "culture",
      name: "Kultur",
      icon: Palette,
      description: "Traditionen, Kunst, Bräuche und Feste",
      assets: []
    },
    {
      id: "history",
      name: "Geschichte",
      icon: History,
      description: "Wichtige Ereignisse, Epochen und Legenden",
      assets: []
    },
    {
      id: "technology",
      name: "Technologie & Magie",
      icon: Zap,
      description: "Erfindungen, Magie-Systeme und Wissenschaft",
      assets: []
    },
    {
      id: "economy",
      name: "Wirtschaft",
      icon: Coins,
      description: "Handel, Währung, Ressourcen und Berufe",
      assets: []
    },
    {
      id: "religion",
      name: "Religion & Mythologie",
      icon: BookOpen,
      description: "Götter, Glaubenssysteme und Rituale",
      assets: []
    },
    {
      id: "languages",
      name: "Sprachen",
      icon: Languages,
      description: "Dialekte, Schriften und Kommunikation",
      assets: []
    },
    {
      id: "flora-fauna",
      name: "Flora & Fauna",
      icon: TreePine,
      description: "Tiere, Pflanzen und Kreaturen",
      assets: []
    },
  ];

  // Kombiniere Base-Kategorien mit Custom-Kategorien
  const categories = [...baseCategories, ...customCategories];

  // Get characters from linked project
  const linkedProject = projects.find(p => p.id === linkedProjectId);
  // Map 'image' field to 'imageUrl' for compatibility with MapBuilder
  const projectCharacters = (linkedProject?.characters || []).map(char => ({
    ...char,
    imageUrl: char.imageUrl || char.image // Support both field names
  }));

  return (
    <div className="min-h-screen pb-24">
      {/* Back Button */}
      <Button 
        variant="ghost" 
        onClick={onBack} 
        className="absolute top-4 left-4 backdrop-blur-sm bg-background/80 rounded-full h-9 px-3 z-10"
      >
        <ArrowLeft className="size-4 mr-1.5" />
        Zurück
      </Button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <GifAnimationUploadDialog
        open={gifCoverPending !== null}
        onOpenChange={(open) => {
          if (!open) setGifCoverPending(null);
        }}
        fileName={gifCoverPending?.name}
        allowKeepGif={
          gifCoverPending ? gifCoverPending.size <= STORAGE_CONFIG.MAX_FILE_SIZE : true
        }
        onConvert={() => {
          const f = gifCoverPending;
          if (!f) return;
          setGifCoverPending(null);
          void uploadWorldCoverFile(f, "convert-static");
        }}
        onKeepGif={() => {
          const f = gifCoverPending;
          if (!f) return;
          if (f.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
            toast.error(
              `GIF ist größer als ${(STORAGE_CONFIG.MAX_FILE_SIZE / (1024 * 1024)).toFixed(0)} MB — bitte mit Konvertierung oder ein kleineres GIF wählen.`
            );
            return;
          }
          setGifCoverPending(null);
          void uploadWorldCoverFile(f, "keep-animation");
        }}
      />

      {/* MOBILE LAYOUT (<768px): Cover oben + Collapsible Info */}
      <div className="md:hidden">
        {/* Cover Top Centered */}
        <div className="pt-16 pb-4 flex justify-center bg-gradient-to-b from-primary/5 to-transparent">
          <div className="relative group">
            <div 
              onClick={() => !worldCoverUploading && handleCoverClick()}
              className={`w-[240px] aspect-[2/3] rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden shadow-lg ${
                worldCoverUploading ? "cursor-wait" : "cursor-pointer"
              }`}
              style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
            >
              {coverImage && <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded-full p-3 backdrop-blur-sm">
                  <Camera className="size-6 text-primary" />
                </div>
              </div>
              <ImageUploadWaveOverlay visible={worldCoverUploading} label="Cover wird hochgeladen…" />
            </div>
          </div>
        </div>

        {/* Collapsible Info - Default: CLOSED */}
        <div className="px-4">
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <Card className="mb-4 cursor-pointer hover:bg-muted/30 transition-colors">
                <CardHeader className="p-4 flex flex-row items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="size-4 text-primary" />
                    <CardTitle className="text-base">Basis-Informationen</CardTitle>
                  </div>
                  <ChevronDown className="size-4 text-muted-foreground transition-transform" />
                </CardHeader>
              </Card>
            </CollapsibleTrigger>
            
            <CollapsibleContent>
              <Card className="mb-4">
          <CardHeader className="p-4 flex flex-row items-center justify-between">
            <CardTitle className="text-base">Basis-Informationen</CardTitle>
            
            {/* SAVE BUTTON + 3-PUNKTE-MENÜ */}
            <div className="flex items-center gap-2">
              {/* SAVE BUTTON - nur im Edit-Modus sichtbar */}
              {isEditingInfo && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    await onUpdate(world.id, {
                      name: editedName,
                      description: editedDescription,
                      linked_project_id: linkedProjectId || null,
                    });
                    setIsEditingInfo(false);
                  }}
                  className="h-8 gap-1.5"
                >
                  <Save className="size-3.5" />
                  Speichern
                </Button>
              )}
              
              {/* 3-PUNKTE-MENÜ */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 w-8 p-0"
                  >
                    <MoreVertical className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {isEditingInfo ? (
                    <>
                      <DropdownMenuItem onClick={async () => {
                        await onUpdate(world.id, {
                          name: editedName,
                          description: editedDescription,
                          linked_project_id: linkedProjectId || null,
                        });
                        setIsEditingInfo(false);
                      }}>
                        <Save className="size-3.5 mr-2" />
                        Speichern
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        // Reset to original values
                        setIsEditingInfo(false);
                        setEditedName(world.name || "");
                        setEditedDescription(world.description || "");
                        setLinkedProjectId(world.linkedProjectId || "");
                      }}>
                        <X className="size-3.5 mr-2" />
                        Abbrechen
                      </DropdownMenuItem>
                    </>
                  ) : (
                    <>
                      <DropdownMenuItem onClick={() => setIsEditingInfo(true)}>
                        <Edit2 className="size-3.5 mr-2" />
                        Bearbeiten
                      </DropdownMenuItem>
                      {onDuplicate && (
                        <DropdownMenuItem onClick={onDuplicate}>
                          <Copy className="size-3.5 mr-2" />
                          Welt duplizieren
                        </DropdownMenuItem>
                      )}
                      {onShowStats && (
                        <DropdownMenuItem onClick={onShowStats}>
                          <BarChart3 className="size-3.5 mr-2" />
                          Statistiken & Logs
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem 
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="size-3.5 mr-2" />
                        Welt löschen
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0 space-y-4">
            {isEditingInfo ? (
              <>
                <div>
                  <Label htmlFor="world-name" className="text-sm mb-2 block">Name</Label>
                  <Input
                    id="world-name"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="world-description" className="text-sm mb-2 block">Beschreibung</Label>
                  <Textarea
                    id="world-description"
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    rows={4}
                  />
                </div>
                <div>
                  <Label htmlFor="linked-project" className="text-sm mb-2 block">Verknüpftes Projekt</Label>
                  <Select value={linkedProjectId || "none"} onValueChange={(value) => setLinkedProjectId(value === "none" ? "" : value)}>
                    <SelectTrigger id="linked-project" className="h-9">
                      <SelectValue placeholder="Kein Projekt verknüpft" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Kein Projekt</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {linkedProjectId && linkedProjectId !== "none" && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Charaktere aus diesem Projekt können auf der Karte platziert werden
                    </p>
                  )}
                </div>
              </>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Name</p>
                  <p className="text-sm">{editedName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Beschreibung</p>
                  <p className="text-sm text-muted-foreground">{editedDescription}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Verknüpftes Projekt</p>
                  {linkedProjectId ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <Film className="size-3 mr-1" />
                        {projects.find(p => p.id === linkedProjectId)?.title || "Nicht gefunden"}
                      </Badge>
                      {projectCharacters.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {projectCharacters.length} Charakter{projectCharacters.length !== 1 ? 'e' : ''}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Kein Projekt verknüpft</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* DESKTOP LAYOUT (≥768px): Info links + Cover rechts */}
      <div className="hidden md:block pt-16 px-6">
        <div className="flex gap-6 items-start">
          {/* Info Left - Same height as cover (360px) */}
          <div className="flex-1">
            <Card className="h-[360px] flex flex-col">
              <CardHeader className="p-4 flex flex-row items-center justify-between shrink-0">
                <CardTitle className="text-base">🌍 Basis-Informationen</CardTitle>
                
                {/* SAVE BUTTON + 3-PUNKTE-MENÜ */}
                <div className="flex items-center gap-2">
                  {/* SAVE BUTTON - nur im Edit-Modus sichtbar */}
                  {isEditingInfo && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={async () => {
                        await onUpdate(world.id, {
                          name: editedName,
                          description: editedDescription,
                          linked_project_id: linkedProjectId || null,
                        });
                        setIsEditingInfo(false);
                      }}
                      className="h-8 gap-1.5"
                    >
                      <Save className="size-3.5" />
                      Speichern
                    </Button>
                  )}
                  
                  {/* 3-PUNKTE-MENÜ */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0"
                      >
                        <MoreVertical className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {isEditingInfo ? (
                        <>
                          <DropdownMenuItem onClick={async () => {
                            await onUpdate(world.id, {
                              name: editedName,
                              description: editedDescription,
                              linked_project_id: linkedProjectId || null,
                            });
                            setIsEditingInfo(false);
                          }}>
                            <Save className="size-3.5 mr-2" />
                            Speichern
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => {
                            // Reset to original values
                            setIsEditingInfo(false);
                            setEditedName(world.name || "");
                            setEditedDescription(world.description || "");
                            setLinkedProjectId(world.linkedProjectId || "");
                          }}>
                            <X className="size-3.5 mr-2" />
                            Abbrechen
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuItem onClick={() => setIsEditingInfo(true)}>
                            <Edit2 className="size-3.5 mr-2" />
                            Bearbeiten
                          </DropdownMenuItem>
                          {onDuplicate && (
                            <DropdownMenuItem onClick={onDuplicate}>
                              <Copy className="size-3.5 mr-2" />
                              Welt duplizieren
                            </DropdownMenuItem>
                          )}
                          {onShowStats && (
                            <DropdownMenuItem onClick={onShowStats}>
                              <BarChart3 className="size-3.5 mr-2" />
                              Statistiken & Logs
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => setShowDeleteDialog(true)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            Welt löschen
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>

              <CardContent className="p-4 pt-0 flex-1 overflow-y-auto space-y-3">
                {isEditingInfo ? (
                  <>
                    {/* Edit form - compact for desktop */}
                    <div>
                      <Label htmlFor="world-name-desktop" className="text-xs mb-1 block">Name</Label>
                      <Input
                        id="world-name-desktop"
                        value={editedName}
                        onChange={(e) => setEditedName(e.target.value)}
                        className="h-9"
                      />
                    </div>
                    <Separator />
                    <div>
                      <Label htmlFor="world-description-desktop" className="text-xs mb-1 block">Beschreibung</Label>
                      <Textarea
                        id="world-description-desktop"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                    <Separator />
                    <div>
                      <Label htmlFor="linked-project-desktop" className="text-xs mb-1 block">Verknüpftes Projekt</Label>
                      <Select value={linkedProjectId || "none"} onValueChange={(value) => setLinkedProjectId(value === "none" ? "" : value)}>
                        <SelectTrigger id="linked-project-desktop" className="h-8 text-sm">
                          <SelectValue placeholder="Kein Projekt" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Kein Projekt</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Name</div>
                      <div>{editedName}</div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Beschreibung</div>
                      <div className="text-sm text-muted-foreground">{editedDescription || "Keine Beschreibung"}</div>
                    </div>
                    <Separator />
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Verknüpftes Projekt</div>
                      {linkedProjectId ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">
                            <Film className="size-3 mr-1" />
                            {projects.find(p => p.id === linkedProjectId)?.title || "Nicht gefunden"}
                          </Badge>
                          {projectCharacters.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {projectCharacters.length} Charakter{projectCharacters.length !== 1 ? 'e' : ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-muted-foreground">Kein Projekt verknüpft</div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Cover Right */}
          <div className="shrink-0">
            <div className="relative group">
              <div 
                onClick={() => !worldCoverUploading && handleCoverClick()}
                className={`w-[240px] aspect-[2/3] rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 relative overflow-hidden shadow-lg ${
                  worldCoverUploading ? "cursor-wait" : "cursor-pointer"
                }`}
                style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                {!coverImage && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Globe className="size-16 text-primary/30" />
                  </div>
                )}
                {coverImage && <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center pointer-events-none">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/90 rounded-full p-3 backdrop-blur-sm">
                    <Camera className="size-6 text-primary" />
                  </div>
                </div>
                <ImageUploadWaveOverlay visible={worldCoverUploading} label="Cover wird hochgeladen…" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shared Content Below (Categories, Map, etc.) */}
      <div className="px-4 py-6 md:px-6">

        {/* Tabs */}
        <Tabs defaultValue="categories" className="w-full">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="categories">Kategorien</TabsTrigger>
            <TabsTrigger value="map">Karte</TabsTrigger>
          </TabsList>

          <TabsContent value="categories" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2>Kategorien</h2>
                <p className="text-sm text-muted-foreground">{categories.length} Kategorien</p>
              </div>
              <Button
                size="sm"
                onClick={() => setShowNewCategoryDialog(true)}
                className="shrink-0"
              >
                <Plus className="size-3.5 mr-1.5" />
                Kategorie
              </Button>
            </div>

            {/* Kategorien als Collapsible List */}
            <div className="space-y-2">
              {categories.map((category) => {
                const Icon = category.icon;
                const isOpen = openCategories.includes(category.id);
                
                return (
                  <Card key={category.id} className="overflow-hidden">
                    <Collapsible open={isOpen} onOpenChange={() => toggleCategory(category.id)}>
                      <CollapsibleTrigger className="w-full">
                        <CardHeader className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="rounded-lg bg-primary/10 dark:bg-primary/20 p-2 shrink-0">
                              <Icon className="size-4 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                              <CardTitle className="text-sm mb-0.5 flex items-center gap-1.5">
                                <span className="text-asset-green">/{category.name}</span>
                              </CardTitle>
                              <CardDescription className="text-xs line-clamp-1">
                                {category.description}
                              </CardDescription>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Badge className="text-[10px] bg-primary/10 dark:bg-primary/20 text-primary hover:bg-primary/20 dark:hover:bg-primary/30 border-0 px-1.5 py-0.5">
                                {category.assets.length} Assets
                              </Badge>
                              <ChevronDown 
                                className={`size-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} 
                              />
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="p-4 pt-0 space-y-2">
                          {/* Assets in dieser Kategorie */}
                          {category.assets.map((asset) => {
                            const assetIsOpen = openAssets.includes(asset.id);
                            const isEditing = editingAssetId === asset.id;
                            
                            return (
                              <Card key={asset.id} className="bg-muted/30">
                                <Collapsible open={assetIsOpen} onOpenChange={() => toggleAsset(asset.id)}>
                                  <CollapsibleTrigger className="w-full">
                                    <CardHeader className="p-3 hover:bg-muted/50 transition-colors">
                                      <div className="flex items-center gap-2">
                                        {/* Small Thumbnail - only when collapsed */}
                                        {assetImages[asset.id] && !assetIsOpen && (
                                          <div 
                                            className="shrink-0 w-6 h-6 rounded overflow-hidden border border-asset-green-light cursor-pointer"
                                            onMouseEnter={(e) => handleMouseEnter(e, assetImages[asset.id])}
                                            onMouseLeave={handleMouseLeave}
                                          >
                                            <img src={assetImages[asset.id]} alt={asset.name} className="w-full h-full object-cover" />
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0 text-left">
                                          <CardTitle className="text-xs text-asset-green">
                                            /{asset.name}
                                          </CardTitle>
                                        </div>
                                        <ChevronRight 
                                          className={`size-3.5 text-muted-foreground transition-transform shrink-0 ${assetIsOpen ? 'rotate-90' : ''}`} 
                                        />
                                      </div>
                                    </CardHeader>
                                  </CollapsibleTrigger>
                                  
                                  <CollapsibleContent>
                                    <CardContent className="p-3 pt-0">
                                      <div className="flex items-start gap-3">
                                        {/* Asset Image - Always visible */}
                                        <div className="shrink-0">
                                          {assetImages[asset.id] ? (
                                            isEditing ? (
                                              <button 
                                                onClick={() => handleAssetImageClick(asset.id)}
                                                className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-asset-green-light hover:border-asset-green transition-colors cursor-pointer group"
                                              >
                                                <img src={assetImages[asset.id]} alt={asset.name} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                  <Camera className="size-3.5 text-white" />
                                                </div>
                                              </button>
                                            ) : (
                                              <div className="w-12 h-12 rounded-lg overflow-hidden border-2 border-asset-green-light">
                                                <img src={assetImages[asset.id]} alt={asset.name} className="w-full h-full object-cover" />
                                              </div>
                                            )
                                          ) : (
                                            isEditing ? (
                                              <button 
                                                onClick={() => handleAssetImageClick(asset.id)}
                                                className="w-12 h-12 rounded-lg border-2 border-dashed border-border hover:border-asset-green/50 transition-colors cursor-pointer flex items-center justify-center bg-muted/10"
                                              >
                                                <Camera className="size-4 text-muted-foreground" />
                                              </button>
                                            ) : (
                                              <div className="w-12 h-12 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/10">
                                                <Camera className="size-4 text-muted-foreground" />
                                              </div>
                                            )
                                          )}
                                        </div>

                                        {/* Asset Content */}
                                        <div className="flex-1 min-w-0">
                                          {isEditing ? (
                                            <div className="space-y-2">
                                              <Input
                                                value={editAssetData.name}
                                                onChange={(e) => setEditAssetData({...editAssetData, name: e.target.value})}
                                                className="h-7 text-xs"
                                                placeholder="Asset-Name"
                                              />
                                              <Textarea
                                                value={editAssetData.description}
                                                onChange={(e) => setEditAssetData({...editAssetData, description: e.target.value})}
                                                rows={2}
                                                className="text-xs"
                                                placeholder="Beschreibung..."
                                              />
                                            </div>
                                          ) : (
                                            <CardDescription className="text-xs">
                                              {asset.description}
                                            </CardDescription>
                                          )}
                                        </div>

                                        {/* Edit Button */}
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (isEditing) {
                                              // Save changes
                                              setEditingAssetId(null);
                                            } else {
                                              setEditingAssetId(asset.id);
                                              setEditAssetData({
                                                name: asset.name,
                                                description: asset.description
                                              });
                                            }
                                          }}
                                          className="h-7 px-2.5 shrink-0 rounded-[10px] bg-[#e4e6ea] dark:bg-muted hover:bg-gray-300 dark:hover:bg-muted/80 text-[#646567] dark:text-foreground"
                                        >
                                          {isEditing ? (
                                            <>
                                              <Save className="size-3 mr-1" />
                                              <span className="text-xs">Speichern</span>
                                            </>
                                          ) : (
                                            <>
                                              <Edit2 className="size-3 mr-1" />
                                              <span className="text-xs">Bearbeiten</span>
                                            </>
                                          )}
                                        </Button>
                                      </div>
                                    </CardContent>
                                  </CollapsibleContent>
                                </Collapsible>
                              </Card>
                            );
                          })}
                          
                          {/* Button zum Hinzufügen neuer Assets */}
                          <Button
                            size="sm"
                            className="w-full h-8 mt-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                            onClick={() => {
                              setSelectedCategoryForNewAsset(category.id);
                              setShowNewAssetDialog(true);
                            }}
                          >
                            <Plus className="size-3 mr-1.5" />
                            Asset hinzufügen
                          </Button>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="map" className="mt-6">
            <MapBuilder
              worldId={world.id}
              worldName={world.name}
              onSave={(mapData) => {
                console.log("Map saved:", mapData);
                // TODO: Implement actual save functionality
              }}
              projectCharacters={projectCharacters}
              linkedProjectId={linkedProjectId}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Hidden file input for asset images */}
      <input
        ref={assetImageInputRef}
        type="file"
        accept="image/*"
        onChange={handleAssetImageChange}
        className="hidden"
      />

      {/* New Asset Dialog */}
      <Dialog open={showNewAssetDialog} onOpenChange={setShowNewAssetDialog}>
        <DialogContent className="w-[95vw] max-w-xl rounded-2xl md:w-auto">
          <DialogHeader>
            <DialogTitle className="text-asset-green">Neues Asset hinzufügen</DialogTitle>
            <DialogDescription>
              Füge ein neues Asset zur Kategorie {categories.find(c => c.id === selectedCategoryForNewAsset)?.name} hinzu
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input placeholder="z.B. Nordberge, Silberfluss..." className="h-11" />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea placeholder="Beschreibe dieses Asset..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Bild (Optional)</Label>
              <button className="w-full border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors active:scale-[0.98] cursor-pointer bg-muted/10">
                <div className="flex flex-col items-center justify-center">
                  <Upload className="size-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-xs mb-1">Bild hochladen</p>
                  <p className="text-xs text-muted-foreground">Optional</p>
                </div>
              </button>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowNewAssetDialog(false)} className="h-11">
              Abbrechen
            </Button>
            <Button onClick={() => setShowNewAssetDialog(false)} className="h-11">
              Asset hinzufügen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Category Dialog */}
      <Dialog open={showNewCategoryDialog} onOpenChange={setShowNewCategoryDialog}>
        <DialogContent className="w-[95vw] max-w-xl rounded-2xl md:w-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">Neue Kategorie hinzufügen</DialogTitle>
            <DialogDescription>
              Erstelle eine eigene Kategorie für deine Weltbuilding-Inhalte
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kategoriename</Label>
              <Input 
                placeholder="z.B. Architektur, Militär, Astronomie..." 
                className="h-11"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung</Label>
              <Textarea 
                placeholder="Beschreibe diese Kategorie..." 
                rows={3}
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={newCategoryIcon} onValueChange={setNewCategoryIcon}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Icon auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mountain">
                    <div className="flex items-center gap-2">
                      <Mountain className="size-4 text-primary" />
                      <span>Berg</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="landmark">
                    <div className="flex items-center gap-2">
                      <Landmark className="size-4 text-primary" />
                      <span>Monument</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="users">
                    <div className="flex items-center gap-2">
                      <Users className="size-4 text-primary" />
                      <span>Personen</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="palette">
                    <div className="flex items-center gap-2">
                      <Palette className="size-4 text-primary" />
                      <span>Palette</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="building">
                    <div className="flex items-center gap-2">
                      <Building className="size-4 text-primary" />
                      <span>Gebäude</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="filetext">
                    <div className="flex items-center gap-2">
                      <FileText className="size-4 text-primary" />
                      <span>Dokument</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="history">
                    <div className="flex items-center gap-2">
                      <History className="size-4 text-primary" />
                      <span>Geschichte</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="zap">
                    <div className="flex items-center gap-2">
                      <Zap className="size-4 text-primary" />
                      <span>Blitz</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="coins">
                    <div className="flex items-center gap-2">
                      <Coins className="size-4 text-primary" />
                      <span>Münzen</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="bookopen">
                    <div className="flex items-center gap-2">
                      <BookOpen className="size-4 text-primary" />
                      <span>Buch</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="languages">
                    <div className="flex items-center gap-2">
                      <Languages className="size-4 text-primary" />
                      <span>Sprachen</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="treepine">
                    <div className="flex items-center gap-2">
                      <TreePine className="size-4 text-primary" />
                      <span>Baum</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => {
              setShowNewCategoryDialog(false);
              setNewCategoryName("");
              setNewCategoryDescription("");
              setNewCategoryIcon("building");
            }} className="h-11">
              Abbrechen
            </Button>
            <Button 
              onClick={handleCreateCategory} 
              className="h-11"
              disabled={!newCategoryName.trim()}
            >
              Kategorie erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Preview Overlay */}
      <ImagePreviewOverlay />

      {/* Delete World Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-full bg-destructive/10">
                <Trash2 className="size-5 text-destructive" />
              </div>
              <AlertDialogTitle>Welt wirklich löschen?</AlertDialogTitle>
            </div>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Diese Aktion kann <strong>nicht rückgängig</strong> gemacht werden. 
                  Die Welt <strong>"{world.name}"</strong> wird permanent gelöscht, 
                  inklusive aller:
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Kategorien</li>
                  <li>Items & Assets</li>
                  <li>Kartendaten</li>
                  <li>Verknüpfungen</li>
                </ul>
                <div className="pt-2 space-y-2">
                  <Label htmlFor="delete-password" className="text-foreground">
                    Gib dein Passwort ein, um zu bestätigen:
                  </Label>
                  <Input
                    id="delete-password"
                    type="password"
                    placeholder="Dein Passwort"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    disabled={deleteLoading}
                    className="h-11"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && deletePassword.trim()) {
                        onDelete();
                      }
                    }}
                    autoFocus
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={() => {
                setDeletePassword("");
              }}
              disabled={deleteLoading}
            >
              Abbrechen
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={deleteLoading || !deletePassword.trim()}
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="size-4 mr-2 animate-spin" />
                  Wird gelöscht...
                </>
              ) : (
                <>
                  <Trash2 className="size-4 mr-2" />
                  Welt löschen
                </>
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}