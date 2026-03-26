import { useState, useRef, useEffect, useMemo, memo } from 'react';
import { Upload, Trash2, X, Music, Volume2, MoreVertical, Copy, ChevronDown, ChevronRight, Plus, GripVertical, Edit, Camera, Info } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { toast } from 'sonner@2.0.3';
import shotPlaceholder from 'figma:asset/5bbfb6c934162456ce6c992c152322cee414939e.png';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { CharacterAutocomplete } from './CharacterAutocomplete';
import { CharacterPicker } from './CharacterPicker';
import { CharacterDetailModal } from './CharacterDetailModal';
import { HighlightedTextarea } from './HighlightedTextarea';
import { RichTextEditorModal } from './RichTextEditorModal';
import { ReadonlyTiptapView } from './ReadonlyTiptapView';
import { ShotImageCropDialog } from './ShotImageCropDialog';
import { ImageUploadWaveOverlay } from './ImageUploadWaveOverlay';
import { useAuth } from '../hooks/useAuth';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from './ui/collapsible';
import { Avatar, AvatarImage, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { cn } from './ui/utils';
import type { Shot, Character, ShotAudio } from '../lib/types';
import { AudioFileList } from './AudioFileList';
import { AudioLabelDialog } from './AudioLabelDialog';
import { AudioEditDialog } from './AudioEditDialog';

const ItemTypes = {
  SHOT: 'shot',
};

// =============================================================================
// CINEMATOGRAPHY OPTIONS
// =============================================================================

export const CAMERA_ANGLES = [
  { value: 'Eye Level', label: 'Eye Level (Augenhöhe)' },
  { value: 'High Angle', label: 'High Angle (Aufsicht)' },
  { value: 'Low Angle', label: 'Low Angle (Untersicht)' },
  { value: "Bird's Eye View", label: "Bird's Eye View (Vogelperspektive)" },
  { value: 'Dutch Angle', label: 'Dutch Angle (Schräg)' },
  { value: 'Over-the-Shoulder', label: 'Over-the-Shoulder (Über Schulter)' },
  { value: 'POV', label: 'POV (Point of View)' },
];

export const FRAMING_OPTIONS = [
  { value: 'ECU', label: 'ECU - Extreme Close-Up' },
  { value: 'CU', label: 'CU - Close-Up' },
  { value: 'MCU', label: 'MCU - Medium Close-Up' },
  { value: 'MS', label: 'MS - Medium Shot (Halbnah)' },
  { value: 'MWS', label: 'MWS - Medium Wide Shot (Amerikanische)' },
  { value: 'WS', label: 'WS - Wide Shot (Totale)' },
  { value: 'EWS', label: 'EWS - Extreme Wide Shot (Supertotale)' },
  { value: 'TWO_SHOT', label: 'TWO SHOT - Zwei Personen' },
  { value: 'OTS', label: 'OTS - Over-the-Shoulder' },
];

export const MOVEMENT_OPTIONS = [
  { value: 'Static', label: 'Static (Statisch)' },
  { value: 'Pan', label: 'Pan (Schwenk horizontal)' },
  { value: 'Tilt', label: 'Tilt (Schwenk vertikal)' },
  { value: 'Dolly In', label: 'Dolly In (Heranfahrt)' },
  { value: 'Dolly Out', label: 'Dolly Out (Wegfahrt)' },
  { value: 'Truck', label: 'Truck (Seitwärtsfahrt)' },
  { value: 'Pedestal', label: 'Pedestal (Hoch/Runter)' },
  { value: 'Zoom In', label: 'Zoom In' },
  { value: 'Zoom Out', label: 'Zoom Out' },
  { value: 'Handheld', label: 'Handheld (Handkamera)' },
  { value: 'Steadicam', label: 'Steadicam' },
  { value: 'Crane', label: 'Crane (Kran)' },
  { value: 'Drone', label: 'Drone (Drohne)' },
  { value: 'Whip Pan', label: 'Whip Pan (Schneller Schwenk)' },
];

export const LENS_OPTIONS = [
  { value: '14mm', label: '14mm - Ultra Wide' },
  { value: '24mm', label: '24mm - Wide Angle' },
  { value: '35mm', label: '35mm - Standard Wide' },
  { value: '50mm', label: '50mm - Normal' },
  { value: '85mm', label: '85mm - Portrait' },
  { value: '100mm', label: '100mm - Telephoto' },
  { value: '200mm', label: '200mm - Super Telephoto' },
  { value: 'Fisheye', label: 'Fisheye (Fischauge)' },
  { value: 'Anamorphic', label: 'Anamorphic (Cinemascope)' },
];

// =============================================================================
// SHOT CARD COMPONENT
// =============================================================================

interface ShotCardProps {
  shot: Shot;
  sceneId: string;
  projectId: string;
  projectCharacters?: Character[]; // All characters in project for @-mention
  isExpanded?: boolean;
  isPending?: boolean; // 🚀 Optimistic UI: Show pending state
  /** Parent-driven upload (e.g. GIF confirmation dialog); keeps overlay after child await returns */
  imageUploadWaiting?: boolean;
  onToggleExpand?: () => void;
  onUpdate: (shotId: string, updates: Partial<Shot>) => void;
  onDelete: (shotId: string) => void;
  onDuplicate?: (shotId: string) => void;
  onShowInfo?: (shotId: string) => void; // 📊 Show info dialog
  onReorder: (draggedId: string, targetId: string) => void;
  onImageUpload: (shotId: string, file: File) => Promise<void>;
  onAudioUpload: (shotId: string, file: File, type: 'music' | 'sfx', label?: string, startTime?: number, endTime?: number, fadeIn?: number, fadeOut?: number) => Promise<void>;
  onAudioDelete: (audioId: string) => void;
  onAudioUpdate: (audioId: string, updates: { label?: string; startTime?: number; endTime?: number; fadeIn?: number; fadeOut?: number }) => void;
  onCharacterAdd: (shotId: string, characterId: string) => void;
  onCharacterRemove: (shotId: string, characterId: string) => void;
}

export const ShotCard = memo(function ShotCard({
  shot,
  sceneId,
  projectId,
  projectCharacters = [],
  isExpanded = false,
  isPending = false,
  imageUploadWaiting = false,
  onToggleExpand,
  onUpdate,
  onDelete,
  onDuplicate,
  onShowInfo,
  onReorder,
  onImageUpload,
  onAudioUpload,
  onAudioDelete,
  onAudioUpdate,
  onCharacterAdd,
  onCharacterRemove,
}: ShotCardProps) {
  // Auth context for user info
  const { user } = useAuth();
  
  // Unified edit state like Scene
  const [isEditing, setIsEditing] = useState(false);
  const [editValues, setEditValues] = useState({ shotNumber: String(shot.shotNumber), notes: shot.notes || '' });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const showImageUploadBusy = isUploadingImage || imageUploadWaiting;

  // Character Add Picker (for adding characters to shot)
  const [showCharacterAddPicker, setShowCharacterAddPicker] = useState(false);
  
  // Character Autocomplete (for @-mentions in dialog)
  const [showCharacterAutocomplete, setShowCharacterAutocomplete] = useState(false);
  const [characterSearch, setCharacterSearch] = useState('');
  const [characterPickerPosition, setCharacterPickerPosition] = useState({ top: 0, left: 0 });
  const dialogRef = useRef<HTMLTextAreaElement>(null);

  // Rich Text Editor Modals
  const [showDialogModal, setShowDialogModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Debug modal state
  useEffect(() => {
    console.log('[ShotCard] 📝 showDialogModal:', showDialogModal);
    console.log('[ShotCard] 📝 showNotesModal:', showNotesModal);
  }, [showDialogModal, showNotesModal]);

  // Debug: Log autocomplete state
  useEffect(() => {
    console.log('[ShotCard] 🎯 showCharacterAutocomplete:', showCharacterAutocomplete);
    console.log('[ShotCard] 🎯 characterSearch:', characterSearch);
    console.log('[ShotCard] 🎯 characterPickerPosition:', characterPickerPosition);
    console.log('[ShotCard] 🎯 projectCharacters:', projectCharacters.length);
  }, [showCharacterAutocomplete, characterSearch, characterPickerPosition, projectCharacters]);

  // Details collapsible state (default open)
  const [detailsOpen, setDetailsOpen] = useState(true);
  
  // Dialog & Notes collapsible state (default open)
  const [dialogNotesOpen, setDialogNotesOpen] = useState(true);

  // Save edited values
  const handleSaveEdit = () => {
    const numValue = parseInt(editValues.shotNumber);
    onUpdate(shot.id, { 
      shotNumber: isNaN(numValue) ? editValues.shotNumber : numValue,
      description: editValues.description 
    });
    setIsEditing(false);
  };
  
  // Audio upload state
  const [pendingAudioFile, setPendingAudioFile] = useState<{ file: File; type: 'music' | 'sfx'; url?: string } | null>(null);
  const [showAudioLabelDialog, setShowAudioLabelDialog] = useState(false);
  const [pendingAudioTrimming, setPendingAudioTrimming] = useState<{ startTime?: number; endTime?: number; fadeIn?: number; fadeOut?: number } | null>(null);
  
  // Audio edit state
  const [editingAudio, setEditingAudio] = useState<ShotAudio | null>(null);
  const [showAudioEditDialog, setShowAudioEditDialog] = useState(false);

  // Character Detail Modal state
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showCharacterModal, setShowCharacterModal] = useState(false);

  // Image Crop Dialog state
  const [showImageCropDialog, setShowImageCropDialog] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState<string>('');

  // CRITICAL: Parse dialog JSON only when shot.dialog changes (not every render)
  const dialogContent = useMemo(() => {
    if (!shot.dialog) return { type: 'doc', content: [{ type: 'paragraph' }] };
    if (typeof shot.dialog === 'string') {
      try {
        return JSON.parse(shot.dialog);
      } catch {
        // Fallback for legacy plain text
        return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: shot.dialog }] }] };
      }
    }
    return shot.dialog;
  }, [shot.dialog]);

  // CRITICAL: Parse notes JSON only when shot.notes changes (not every render)
  const notesContent = useMemo(() => {
    if (!shot.notes) return { type: 'doc', content: [{ type: 'paragraph' }] };
    if (typeof shot.notes === 'string') {
      try {
        return JSON.parse(shot.notes);
      } catch {
        // Fallback for legacy plain text
        return { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: shot.notes }] }] };
      }
    }
    return shot.notes;
  }, [shot.notes]);

  // Drag & Drop
  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.SHOT,
    item: { id: shot.id, type: ItemTypes.SHOT },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: ItemTypes.SHOT,
    drop: (item: { id: string }) => {
      if (item.id !== shot.id) {
        onReorder(item.id, shot.id);
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  // Combine drag and drop refs
  const combinedRef = (node: HTMLDivElement | null) => {
    drag(node);
    drop(node);
  };

  // Update character picker position based on cursor/dialog field
  const updateCharacterPickerPosition = () => {
    if (dialogRef.current) {
      const rect = dialogRef.current.getBoundingClientRect();
      // Note: CharacterAutocomplete uses position:fixed, so we use viewport coordinates
      setCharacterPickerPosition({
        top: rect.bottom + 4, // 4px below textarea
        left: rect.left
      });
      console.log('[ShotCard] 📍 Updated picker position:', { top: rect.bottom + 4, left: rect.left });
    }
  };

  // Close character autocomplete on click outside
  useEffect(() => {
    if (!showCharacterAutocomplete) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Don't close if clicking on the autocomplete itself or the dialog textarea
      if (
        dialogRef.current?.contains(target) ||
        target.closest('[role="listbox"]') || // Autocomplete dropdown
        target.closest('.character-autocomplete') // Custom class if needed
      ) {
        return;
      }
      setShowCharacterAutocomplete(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCharacterAutocomplete]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('[ShotCard] 📤 Image selected:', file.name, file.size, 'bytes');
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Bitte wähle eine Bilddatei aus');
        e.target.value = '';
        return;
      }
      
      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Bild zu groß (max 10MB)');
        e.target.value = '';
        return;
      }
      
      // Convert to base64 for crop preview
      const reader = new FileReader();
      reader.onload = () => {
        console.log('[ShotCard] ✅ Image converted to base64');
        setTempImageForCrop(reader.result as string);
        setShowImageCropDialog(true);
      };
      reader.onerror = () => {
        console.error('[ShotCard] ❌ Failed to read file');
        toast.error('Fehler beim Laden des Bildes');
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be re-uploaded
    e.target.value = '';
  };

  const handleImageCropComplete = async (croppedImageBase64: string) => {
    console.log('[ShotCard] ⚡ OPTIMISTIC UI: Image appears INSTANTLY!');
    
    // 🚀 OPTIMISTIC UI: Zeige Bild SOFORT an!
    const previousImageUrl = shot.imageUrl;
    onUpdate(shot.id, { imageUrl: croppedImageBase64 });
    
    // Dialog sofort schließen
    setShowImageCropDialog(false);
    setTempImageForCrop('');
    
    // Upload im Hintergrund
    setIsUploadingImage(true);
    
    try {
      // Convert base64 to blob
      const base64Data = croppedImageBase64.split(',')[1];
      if (!base64Data) {
        throw new Error('Invalid base64 data');
      }
      
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });
      
      // Convert blob to file
      const file = new File([blob], `shot-${shot.id}-image.jpg`, { type: 'image/jpeg' });
      
      // Upload cropped image im Hintergrund
      console.log('[ShotCard] 🌐 Background upload starting...');
      await onImageUpload(shot.id, file);
      
      console.log('[ShotCard] ✅ Background upload complete!');
    } catch (error) {
      console.error('[ShotCard] ❌ Background upload failed:', error);
      
      // ROLLBACK bei Fehler
      if (previousImageUrl) {
        onUpdate(shot.id, { imageUrl: previousImageUrl });
      } else {
        onUpdate(shot.id, { imageUrl: undefined });
      }
      
      toast.error('Upload fehlgeschlagen - Bild entfernt');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageCropCancel = () => {
    console.log('[ShotCard] ❌ Image crop cancelled');
    setShowImageCropDialog(false);
    setTempImageForCrop('');
    setIsUploadingImage(false);
  };

  const handleAudioUpload = async (
    type: 'music' | 'sfx',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (Supabase Free Tier limit: 50 MB)
      const maxSizeMB = 50;
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      
      if (file.size > maxSizeBytes) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
        toast.error(`Audio-Datei zu groß: ${fileSizeMB} MB (Max: ${maxSizeMB} MB)`);
        e.target.value = '';
        return;
      }
      
      // Create temporary URL for preview/editing
      const tempUrl = URL.createObjectURL(file);
      
      // Open label dialog
      setPendingAudioFile({ file, type, url: tempUrl });
      setShowAudioLabelDialog(true);
    }
    // Reset input so same file can be uploaded again
    e.target.value = '';
  };

  const handleAudioLabelConfirm = async (label: string, trimming?: { startTime?: number; endTime?: number }) => {
    if (pendingAudioFile) {
      // Upload with optional trimming and fade
      const finalTrimming = trimming || pendingAudioTrimming;
      await onAudioUpload(
        shot.id, 
        pendingAudioFile.file, 
        pendingAudioFile.type, 
        label, 
        finalTrimming?.startTime, 
        finalTrimming?.endTime,
        finalTrimming?.fadeIn,
        finalTrimming?.fadeOut
      );
      
      // Clean up temp URL
      if (pendingAudioFile.url) {
        URL.revokeObjectURL(pendingAudioFile.url);
      }
      
      setPendingAudioFile(null);
      setShowAudioLabelDialog(false);
      setPendingAudioTrimming(null);
    }
  };

  const handleAudioLabelCancel = () => {
    // Clean up temp URL
    if (pendingAudioFile?.url) {
      URL.revokeObjectURL(pendingAudioFile.url);
    }
    
    setPendingAudioFile(null);
    setShowAudioLabelDialog(false);
    setPendingAudioTrimming(null);
  };

  const handleAudioEdit = (audioId: string) => {
    const audio = shot.audioFiles?.find(a => a.id === audioId);
    if (audio) {
      setEditingAudio(audio);
      setShowAudioEditDialog(true);
    }
  };

  // Handle "Trim Audio" button click in upload dialog
  const handleUploadAudioEdit = () => {
    if (!pendingAudioFile) return;
    
    // Close label dialog
    setShowAudioLabelDialog(false);
    
    // Open edit dialog with pending file
    setEditingAudio({
      id: 'temp-upload', // Temporary ID for upload
      fileName: pendingAudioFile.file.name,
      label: pendingAudioFile.file.name.replace(/\.[^/.]+$/, ''),
      url: pendingAudioFile.url || '',
      type: pendingAudioFile.type,
      startTime: pendingAudioTrimming?.startTime,
      endTime: pendingAudioTrimming?.endTime,
    } as ShotAudio);
    setShowAudioEditDialog(true);
  };

  // Handle Dialog changes with @-mention detection
  const handleDialogChange = (value: string) => {
    onUpdate(shot.id, { dialog: value });

    // Check for @ character for character mentions
    const cursorPosition = dialogRef.current?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');

    if (atIndex !== -1 && atIndex === textBeforeCursor.length - 1) {
      // Just typed @, show all characters
      console.log('[ShotCard] 🔵 @ detected! Opening autocomplete');
      setCharacterSearch('');
      setShowCharacterAutocomplete(true);
      updateCharacterPickerPosition();
    } else if (atIndex !== -1) {
      // Check if we're still in the @-mention
      const afterAt = textBeforeCursor.substring(atIndex + 1);
      const hasSpace = afterAt.includes(' ');
      
      if (!hasSpace) {
        // Still typing the mention
        console.log('[ShotCard] 🔵 Still in @-mention, search:', afterAt);
        setCharacterSearch(afterAt);
        setShowCharacterAutocomplete(true);
        updateCharacterPickerPosition();
      } else {
        // Space after @ means we finished the mention
        setShowCharacterAutocomplete(false);
      }
    } else {
      // No @ before cursor
      setShowCharacterAutocomplete(false);
    }
  };

  const insertCharacterMention = (characterName: string) => {
    if (!dialogRef.current) return;

    const currentValue = shot.dialog || '';
    const cursorPosition = dialogRef.current.selectionStart || 0;
    const textBeforeCursor = currentValue.substring(0, cursorPosition);
    const textAfterCursor = currentValue.substring(cursorPosition);

    // Find the @ symbol before cursor
    const atIndex = textBeforeCursor.lastIndexOf('@');
    
    if (atIndex !== -1) {
      const beforeAt = textBeforeCursor.substring(0, atIndex);
      const newValue = `${beforeAt}@${characterName} ${textAfterCursor}`;
      
      onUpdate(shot.id, { dialog: newValue });
      setShowCharacterAutocomplete(false);
      
      // Set cursor position after the inserted mention
      setTimeout(() => {
        if (dialogRef.current) {
          const newPosition = atIndex + characterName.length + 2;
          dialogRef.current.setSelectionRange(newPosition, newPosition);
          dialogRef.current.focus();
        }
      }, 0);
    }
  };

  const handleAudioEditSave = (audioId: string, updates: { label?: string; startTime?: number; endTime?: number; fadeIn?: number; fadeOut?: number }) => {
    // Check if this is an upload edit (temp ID)
    if (audioId === 'temp-upload' && pendingAudioFile) {
      // Save trimming and fade for upload
      setPendingAudioTrimming({
        startTime: updates.startTime,
        endTime: updates.endTime,
        fadeIn: updates.fadeIn,
        fadeOut: updates.fadeOut,
      });
      
      // Re-open label dialog to confirm upload
      setShowAudioEditDialog(false);
      setEditingAudio(null);
      setShowAudioLabelDialog(true);
      
      // Update pending audio file label if changed
      if (updates.label) {
        // Label will be passed in handleAudioLabelConfirm
      }
      
      return;
    }
    
    // Normal edit flow
    onAudioUpdate(audioId, updates);
    setShowAudioEditDialog(false);
    setEditingAudio(null);
  };

  // ============================================================================
  // SHOT CONTAINER - GLEICHE STRUKTUR WIE SCENE
  // ============================================================================
  return (
    <div 
      ref={combinedRef} 
      className="relative group"
      data-shot-id={shot.id}
      style={{
        cursor: isDragging ? 'grabbing' : 'move',
      }}
    >
      {/* Shot Box - IMMER GLEICH IM COLLAPSED UND EXPANDED ZUSTAND */}
      <div
        className={cn(
          'rounded-lg transition-all duration-200 bg-yellow-50 border-2 border-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-600 relative overflow-hidden',
          isDragging && 'opacity-50',
          isOver && 'ring-2 ring-yellow-500 ring-offset-2',
          isPending && 'opacity-90 animate-pulse'
        )}
      >
        {/* Animated noise/grain background pattern - OPTIMIZED FOR YELLOW */}
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none z-0 dark:opacity-30"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundSize: '80px 80px',
            opacity: 0.08,
            mixBlendMode: 'darken',
            animation: 'grain 8s steps(10) infinite',
          }}
        />
        
        {/* Subtle hover background glow effect */}
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-lg bg-white/0 group-hover:bg-white/10 dark:group-hover:bg-white/5 transition-all duration-300 pointer-events-none"
        />
        {/* Shot Header */}
        <div className={cn(
          "flex items-center gap-2 transition-all",
          isExpanded ? "p-2" : "p-2 min-h-[56px]"
        )}>
          <GripVertical className="size-3 text-muted-foreground cursor-move flex-shrink-0" />
          
          <button onClick={onToggleExpand} className="flex-shrink-0">
            {isExpanded ? (
              <ChevronDown className="size-3.5" />
            ) : (
              <ChevronRight className="size-3.5" />
            )}
          </button>

          {isEditing ? (
            <>
              <Input
                type="text"
                value={editValues.shotNumber}
                onChange={(e) => setEditValues(prev => ({ ...prev, shotNumber: e.target.value }))}
                className="h-6 flex-1 bg-white text-xs border-yellow-400 dark:border-yellow-600 focus:border-yellow-500 dark:focus:border-yellow-500 focus-visible:ring-yellow-400/20"
                placeholder="Shot Number"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSaveEdit}
                className="h-6 px-2 text-xs"
              >
                Speichern
              </Button>
            </>
          ) : (
            <>
              <div 
                className="flex-1 cursor-pointer min-w-0"
                onClick={onToggleExpand}
              >
                <div className="text-xs font-semibold text-[14px] text-[rgb(208,135,0)]">
                  {shot.shotNumber}
                </div>
                {!isExpanded && shot.description && (
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {shot.description}
                  </div>
                )}
              </div>
              
              {/* Thumbnail - ONLY in collapsed state - AFTER text */}
              {!isExpanded && (
                <div 
                  className="relative w-[64px] h-[40px] flex-shrink-0 rounded overflow-hidden border border-yellow-400/50 cursor-pointer bg-gradient-to-br from-primary/20 to-accent/20"
                  onClick={onToggleExpand}
                  style={shot.imageUrl ? { 
                    backgroundImage: `url(${shot.imageUrl})`, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center',
                    backgroundBlendMode: 'overlay'
                  } : {}}
                >
                  {!shot.imageUrl && !showImageUploadBusy && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Camera className="size-4 text-primary/40" />
                    </div>
                  )}
                  <ImageUploadWaveOverlay visible={showImageUploadBusy} compact />
                </div>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="size-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onShowInfo && (
                    <DropdownMenuItem onClick={() => onShowInfo(shot.id)}>
                      <Info className="size-3 mr-2" />
                      Informationen
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => {
                      setIsEditing(true);
                      setEditValues({ shotNumber: String(shot.shotNumber), notes: shot.notes || '' });
                    }}
                  >
                    <Edit className="size-3 mr-2" />
                    Edit Shot
                  </DropdownMenuItem>
                  {onDuplicate && (
                    <DropdownMenuItem onClick={() => onDuplicate(shot.id)}>
                      <Copy className="size-3 mr-2" />
                      Duplicate Shot
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem 
                    onClick={() => onDelete(shot.id)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="size-3 mr-2" />
                    Delete Shot
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>

        {/* Shot Description */}
        {isExpanded && (
          <div className="px-2 pb-2 space-y-2">
            {isEditing ? (
              <Textarea
                value={editValues.description}
                onChange={(e) => setEditValues(prev => ({ ...prev, description: e.target.value }))}
                className="bg-white text-xs border-yellow-400 dark:border-yellow-600 focus:border-yellow-500 dark:focus:border-yellow-500 focus-visible:ring-yellow-400/20"
                placeholder="Beschreibung"
                rows={2}
              />
            ) : (
              <div
                onClick={() => {
                  setIsEditing(true);
                  setEditValues({ shotNumber: String(shot.shotNumber), description: shot.description || '' });
                }}
                className="text-xs text-[rgb(208,135,0)] cursor-pointer hover:text-foreground transition-colors min-h-[1.5rem] flex items-center"
              >
                {shot.description || '+ Beschreibung'}
              </div>
            )}
          </div>
        )}

        {/* EXPANDED CONTENT - Innerhalb derselben Box */}
        {isExpanded && (
          <div className="relative px-2 pb-2">
            <div className="max-h-[400px] md:max-h-[500px] overflow-y-auto overflow-x-hidden">
              <div className="space-y-2">
              {/* Image + Characters + Details */}
              <div className="space-y-1.5">
              {/* Hero Image - SMALLER */}
              <label className="block">
                <div 
                  className="relative rounded-[5px] w-full flex items-center justify-center cursor-pointer aspect-[16/9] md:aspect-[21/9] bg-gradient-to-br from-primary/20 to-accent/20 overflow-hidden"
                  style={shot.imageUrl ? { 
                    backgroundImage: `url(${shot.imageUrl})`, 
                    backgroundSize: 'cover', 
                    backgroundPosition: 'center',
                    backgroundBlendMode: 'overlay'
                  } : {}}
                >
                  {!shot.imageUrl && !showImageUploadBusy && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <Camera className="size-12 text-primary/40" />
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-xs text-primary/60">Bild hochladen</span>
                        <span className="text-[10px] text-primary/40">Empfohlen: 1920×1080 (16:9)</span>
                      </div>
                    </div>
                  )}
                  <ImageUploadWaveOverlay visible={showImageUploadBusy} label="Wird hochgeladen…" />
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
              </label>

              {/* Characters */}
              <div>
                <label className="text-neutral-400 text-[10px] block mb-0.5 leading-[10px]">Charakter</label>
                <div className="flex gap-1 flex-wrap">
                  {shot.characters?.map((character) => (
                    <div key={character.id} className="relative group">
                      <Avatar 
                        className="w-8 h-8 cursor-pointer hover:ring-2 hover:ring-[#6E59A5] transition-all"
                        onClick={() => {
                          setSelectedCharacter(character);
                          setShowCharacterModal(true);
                        }}
                      >
                        <AvatarImage src={character.imageUrl} loading="lazy" />
                        <AvatarFallback className="text-xs">{character.name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onCharacterRemove(shot.id, character.id);
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowCharacterAddPicker(!showCharacterAddPicker)}
                    className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-500 hover:border-purple-500 hover:text-purple-500 dark:hover:border-purple-400 dark:hover:text-purple-400 text-xs transition-colors"
                    title="Charakter hinzufügen"
                  >
                    +
                  </button>
                </div>
                
                {/* Character Add Picker */}
                {showCharacterAddPicker && (
                  <CharacterPicker
                    characters={projectCharacters}
                    filterIds={shot.characters?.map(c => c.id) || []}
                    onSelect={(character) => {
                      onCharacterAdd(shot.id, character.id);
                      setShowCharacterAddPicker(false);
                    }}
                    onClose={() => setShowCharacterAddPicker(false)}
                    className="mt-1 relative z-10"
                  />
                )}
              </div>

              {/* Details Collapsible */}
              <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="mt-2">
                <CollapsibleTrigger className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors w-full">
                      {detailsOpen ? (
                        <ChevronDown className="size-4" />
                      ) : (
                        <ChevronRight className="size-4" />
                      )}
                  <span className="text-xs">Details</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid grid-cols-[60px_1fr] md:grid-cols-[75px_1fr] gap-x-1.5 gap-y-1 items-center">
                      {/* Camera Angle */}
              <label className="text-neutral-400 text-[10px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">Camera Angle</label>
              <Select
                value={shot.cameraAngle || ''}
                onValueChange={(value) => onUpdate(shot.id, { cameraAngle: value })}
              >
                <SelectTrigger 
                  className="border border-yellow-400 bg-white/70 dark:bg-slate-800/70 !h-[20px] text-[9px] rounded-[5px] !px-1.5 !py-0 !min-h-0 min-w-0 w-full"
                >
                  <SelectValue placeholder="Front" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {CAMERA_ANGLES.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Framing */}
              <label className="text-neutral-400 text-[10px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">Framing</label>
              <Select
                value={shot.framing || ''}
                onValueChange={(value) => onUpdate(shot.id, { framing: value })}
              >
                <SelectTrigger 
                  className="border border-yellow-400 bg-white/70 dark:bg-slate-800/70 !h-[20px] text-[9px] rounded-[5px] !px-1.5 !py-0 !min-h-0 min-w-0 w-full"
                >
                  <SelectValue placeholder="MS Halbnah" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {FRAMING_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Movement */}
              <label className="text-neutral-400 text-[10px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">Movement</label>
              <Select
                value={shot.cameraMovement || ''}
                onValueChange={(value) => onUpdate(shot.id, { cameraMovement: value })}
              >
                <SelectTrigger 
                  className="border border-yellow-400 bg-white/70 dark:bg-slate-800/70 !h-[20px] text-[9px] rounded-[5px] !px-1.5 !py-0 !min-h-0 min-w-0 w-full"
                >
                  <SelectValue placeholder="Static" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Lens */}
              <label className="text-neutral-400 text-[10px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">Lens</label>
              <Select
                value={shot.lens || ''}
                onValueChange={(value) => onUpdate(shot.id, { lens: value })}
              >
                <SelectTrigger 
                  className="border border-yellow-400 bg-white/70 dark:bg-slate-800/70 !h-[20px] text-[9px] rounded-[5px] !px-1.5 !py-0 !min-h-0 min-w-0 w-full"
                >
                  <SelectValue placeholder="35mm" className="truncate" />
                </SelectTrigger>
                <SelectContent>
                  {LENS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Shotlength */}
              <label className="text-neutral-400 text-[10px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">Shotlength</label>
              <div className="flex gap-1 items-center">
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    min="0"
                    max="999"
                    value={shot.shotlengthMinutes || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdate(shot.id, { shotlengthMinutes: val === '' ? null : parseInt(val) });
                    }}
                    className="border border-yellow-400 bg-white/70 h-[20px] text-[9px] rounded-[5px] flex-1 px-1.5"
                    placeholder="00"
                  />
                  <span className="text-[9px] text-neutral-400 whitespace-nowrap">Min</span>
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={shot.shotlengthSeconds || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onUpdate(shot.id, { shotlengthSeconds: val === '' ? null : parseInt(val) });
                    }}
                    className="border border-yellow-400 bg-white/70 h-[20px] text-[9px] rounded-[5px] flex-1 px-1.5"
                    placeholder="00"
                  />
                  <span className="text-[9px] text-neutral-400 whitespace-nowrap">Sec</span>
                </div>
              </div>

              {/* Audio - Musik */}
              <label className="text-neutral-400 text-[10px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">Musik</label>
              <div className="flex gap-1 items-start">
                <div className="flex-1 border border-yellow-400 bg-white/70 dark:bg-slate-800/70 rounded-[5px] min-h-[20px] max-h-[80px] overflow-y-auto px-1.5 py-1 text-[9px] text-gray-500">
                  {shot.audioFiles?.filter(a => a.type === 'music').length === 0 ? (
                    <span className="opacity-50">Keine Datei</span>
                  ) : (
                    <AudioFileList
                      files={shot.audioFiles?.filter(a => a.type === 'music').map(a => ({
                        id: a.id,
                        fileName: a.fileName,
                        label: a.label,
                        url: a.fileUrl,
                        type: 'music' as const,
                        startTime: a.startTime,
                        endTime: a.endTime,
                      })) || []}
                      type="music"
                      onDelete={onAudioDelete}
                      onEdit={handleAudioEdit}
                    />
                  )}
                </div>
                <label 
                  className="border border-yellow-400 bg-white/70 dark:bg-slate-800/70 rounded-[5px] h-[20px] w-[28px] flex items-center justify-center cursor-pointer hover:opacity-70 flex-shrink-0"
                  title="Upload Music"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleAudioUpload('music', e)}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Audio - SFX */}
              <label className="text-neutral-400 text-[10px] leading-[20px] whitespace-nowrap overflow-hidden text-ellipsis">SFX</label>
              <div className="flex gap-1 items-start">
                <div className="flex-1 border border-yellow-400 bg-white/70 dark:bg-slate-800/70 rounded-[5px] min-h-[20px] max-h-[80px] overflow-y-auto px-1.5 py-1 text-[9px] text-gray-500">
                  {shot.audioFiles?.filter(a => a.type === 'sfx').length === 0 ? (
                    <span className="opacity-50">Keine Datei</span>
                  ) : (
                    <AudioFileList
                      files={shot.audioFiles?.filter(a => a.type === 'sfx').map(a => ({
                        id: a.id,
                        fileName: a.fileName,
                        label: a.label,
                        url: a.fileUrl,
                        type: 'sfx' as const,
                        startTime: a.startTime,
                        endTime: a.endTime,
                      })) || []}
                      type="sfx"
                      onDelete={onAudioDelete}
                      onEdit={handleAudioEdit}
                    />
                  )}
                </div>
                <label 
                  className="border border-yellow-400 bg-white/70 dark:bg-slate-800/70 rounded-[5px] h-[20px] w-[28px] flex items-center justify-center cursor-pointer hover:opacity-70 flex-shrink-0"
                  title="Upload SFX"
                >
                  <Plus className="w-3.5 h-3.5 text-gray-500" />
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={(e) => handleAudioUpload('sfx', e)}
                    className="hidden"
                  />
                </label>
              </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              </div>

              {/* Dialog & Notes Collapsible */}
              <Collapsible open={dialogNotesOpen} onOpenChange={setDialogNotesOpen} className="mt-2">
                <CollapsibleTrigger className="flex items-center gap-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors w-full">
                  {dialogNotesOpen ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  <span className="text-xs">Dialog & Notes</span>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Dialog */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-neutral-400 text-[10px]">Dialog</label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            console.log('[ShotCard] 🚀 Opening Dialog Modal');
                            setShowDialogModal(true);
                          }}
                          className="h-4 px-1 text-[9px] text-purple-600 hover:text-purple-700"
                        >
                          Maximize
                        </Button>
                      </div>
                      <div 
                        className="border border-yellow-400 bg-white/70 rounded-[5px] h-[80px] text-[13px] p-2 cursor-pointer overflow-y-auto"
                        onClick={() => setShowDialogModal(true)}
                      >
                        {dialogContent?.content?.[0]?.content?.length > 0 ? (
                          <ReadonlyTiptapView 
                            content={dialogContent} 
                            className="text-[13px] leading-tight"
                          />
                        ) : (
                          <span className="text-gray-400 text-[13px]">@Charakter erwähnen...</span>
                        )}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[rgb(161,161,161)] text-[10px]">Notes</label>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            console.log('[ShotCard] 🚀 Opening Notes Modal');
                            setShowNotesModal(true);
                          }}
                          className="h-4 px-1 text-[9px] text-purple-600 hover:text-purple-700"
                        >
                          Maximize
                        </Button>
                      </div>
                      <div 
                        className="border border-yellow-400 bg-white/70 rounded-[5px] h-[80px] text-[13px] p-2 cursor-pointer overflow-y-auto"
                        onClick={() => setShowNotesModal(true)}
                      >
                        {notesContent?.content?.[0]?.content?.length > 0 ? (
                          <ReadonlyTiptapView 
                            content={notesContent} 
                            className="text-[13px] leading-tight"
                          />
                        ) : (
                          <span className="text-gray-400 text-[13px]">Notizen...</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Character Autocomplete (for @-mentions) */}
      {showCharacterAutocomplete && (
        <CharacterAutocomplete
          characters={projectCharacters}
          search={characterSearch}
          position={characterPickerPosition}
          onSelect={insertCharacterMention}
        />
      )}

      {/* Audio Label Dialog */}
      {pendingAudioFile && (
        <AudioLabelDialog
          isOpen={showAudioLabelDialog}
          fileName={pendingAudioFile.file.name}
          type={pendingAudioFile.type}
          audioUrl={pendingAudioFile.url}
          onConfirm={handleAudioLabelConfirm}
          onCancel={handleAudioLabelCancel}
          onEdit={handleUploadAudioEdit}
        />
      )}

      {/* Audio Edit Dialog */}
      <AudioEditDialog
        open={showAudioEditDialog}
        onOpenChange={setShowAudioEditDialog}
        audioFile={editingAudio ? {
          id: editingAudio.id,
          fileName: editingAudio.fileName,
          label: editingAudio.label,
          startTime: editingAudio.startTime,
          endTime: editingAudio.endTime,
          url: editingAudio.fileUrl, // FIX: Use fileUrl from ShotAudio type
        } : null}
        onSave={handleAudioEditSave}
      />

      {/* Dialog Rich Text Editor Modal */}
      <RichTextEditorModal
        isOpen={showDialogModal}
        onClose={() => setShowDialogModal(false)}
        value={dialogContent}
        onChange={(jsonDoc) => {
          // ✅ Save as JSON object directly (not string!)
          const now = new Date().toISOString();
          console.log('[ShotCard] 💾 Saving dialog as JSON object:', jsonDoc);
          console.log('[ShotCard] 🕐 Updating timestamp:', now);
          onUpdate(shot.id, { 
            dialog: jsonDoc,
            updated_at: now  // ✅ Send timestamp to backend
          });
        }}
        title="Dialog Editor"
        characters={projectCharacters}
        lastModified={shot.updatedAt ? {
          timestamp: shot.updatedAt,
          userName: user?.name // TODO: Backend should track updatedBy user ID
        } : undefined}
      />

      {/* Notes Rich Text Editor Modal */}
      <RichTextEditorModal
        isOpen={showNotesModal}
        onClose={() => setShowNotesModal(false)}
        value={notesContent}
        onChange={(jsonDoc) => {
          // ✅ Save as JSON object directly (not string!)
          const now = new Date().toISOString();
          console.log('[ShotCard] 💾 Saving notes as JSON object:', jsonDoc);
          console.log('[ShotCard] 🕐 Updating timestamp:', now);
          onUpdate(shot.id, { 
            notes: jsonDoc,
            updated_at: now  // ✅ Send timestamp to backend
          });
        }}
        title="Notes Editor"
        characters={projectCharacters}
        lastModified={shot.updatedAt ? {
          timestamp: shot.updatedAt,
          userName: user?.name // TODO: Backend should track updatedBy user ID
        } : undefined}
      />

      {/* Character Detail Modal */}
      <CharacterDetailModal
        character={selectedCharacter}
        open={showCharacterModal}
        onOpenChange={setShowCharacterModal}
        onUpdate={(characterId, updates) => {
          // TODO: Implement character update via API
          toast.success('Character Update coming soon!');
          console.log('Update character:', characterId, updates);
        }}
        onImageUpload={(characterId, imageUrl) => {
          // TODO: Implement character image upload via API
          toast.success('Image Upload coming soon!');
          console.log('Upload image for character:', characterId, imageUrl);
        }}
      />

      {/* Shot Image Crop Dialog */}
      {showImageCropDialog && tempImageForCrop && (
        <ShotImageCropDialog
          image={tempImageForCrop}
          onComplete={handleImageCropComplete}
          onCancel={handleImageCropCancel}
        />
      )}
    </div>
  );
});
