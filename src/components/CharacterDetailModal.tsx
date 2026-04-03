import { useState, useRef, useEffect } from 'react';
import { X, Save, Edit2, Camera, User } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { ImageCropDialog } from './ImageCropDialog';
import { ScrollArea } from './ui/scroll-area';
import type { Character } from '../lib/types';

interface CharacterDetailModalProps {
  character: Character | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate?: (characterId: string, updates: Partial<Character>) => void;
  onImageUpload?: (characterId: string, imageUrl: string) => void;
}

export function CharacterDetailModal({
  character,
  open,
  onOpenChange,
  onUpdate,
  onImageUpload,
}: CharacterDetailModalProps) {
  const characterImageInputRef = useRef<HTMLInputElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [tempImageForCrop, setTempImageForCrop] = useState<string | undefined>(undefined);
  const [showImageCropDialog, setShowImageCropDialog] = useState(false);

  // Edit state
  const [editedName, setEditedName] = useState('');
  const [editedRole, setEditedRole] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [editedAge, setEditedAge] = useState('');
  const [editedGender, setEditedGender] = useState('');
  const [editedSpecies, setEditedSpecies] = useState('');
  const [editedBackgroundStory, setEditedBackgroundStory] = useState('');
  const [editedSkills, setEditedSkills] = useState('');
  const [editedStrengths, setEditedStrengths] = useState('');
  const [editedWeaknesses, setEditedWeaknesses] = useState('');
  const [editedCharacterTraits, setEditedCharacterTraits] = useState('');

  // Reset state when character changes or modal opens
  useEffect(() => {
    if (character && open) {
      setEditedName(character.name || '');
      setEditedRole((character.role as string) || '');
      setEditedDescription(character.description || '');
      setEditedAge(character.age?.toString() || '');
      setEditedGender(''); // TODO: Add to Character type
      setEditedSpecies(''); // TODO: Add to Character type
      setEditedBackgroundStory(character.backstory || '');
      setEditedSkills(''); // TODO: Add to Character type
      setEditedStrengths(''); // TODO: Add to Character type
      setEditedWeaknesses(''); // TODO: Add to Character type
      setIsEditing(false);
    }
  }, [character, open]);

  if (!character) return null;

  // Toggle edit mode
  const handleEditClick = () => {
    if (isEditing) {
      // Save
      if (onUpdate) {
        onUpdate(character.id, {
          name: editedName,
          role: editedRole as any,
          description: editedDescription,
          age: editedAge ? parseInt(editedAge) : undefined,
          backstory: editedBackgroundStory,
          // Note: These fields may need to be added to Character type
          // skills: editedSkills,
          // strengths: editedStrengths,
          // weaknesses: editedWeaknesses,
          // characterTraits: editedCharacterTraits,
        });
      }
      setIsEditing(false);
    } else {
      // Enter edit mode (values already initialized via useEffect)
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleImageClick = () => {
    if (isEditing) {
      characterImageInputRef.current?.click();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempImageForCrop(reader.result as string);
        setShowImageCropDialog(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCroppedImage = (croppedImage: string) => {
    if (onImageUpload) {
      onImageUpload(character.id, croppedImage);
    }
    setShowImageCropDialog(false);
    setTempImageForCrop(undefined);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] p-0 md:w-auto">
          <DialogHeader className="p-6 pb-4 border-b border-border/40 pr-14">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl">Character Details</DialogTitle>
              <div className="flex items-center gap-2">
                {isEditing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEdit}
                    className="h-8 px-3 rounded-[10px] bg-muted hover:bg-muted/80"
                  >
                    <X className="size-3 mr-1" />
                    <span className="text-xs">Abbrechen</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEditClick}
                  className="h-8 px-3 rounded-[10px] bg-[#6E59A5] hover:bg-[#5a4887] text-white"
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
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-80px)]">
            <div className="p-6 space-y-6">
              {/* Profile and Name Row */}
              <div className="flex items-center gap-3">
                {/* Profile Image */}
                <div className="shrink-0">
                  {character.imageUrl ? (
                    isEditing ? (
                      <button 
                        onClick={handleImageClick}
                        className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-character-blue-light hover:border-character-blue transition-colors cursor-pointer group"
                      >
                        <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="size-6 text-white" />
                        </div>
                      </button>
                    ) : (
                      <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-character-blue-light">
                        <img src={character.imageUrl} alt={character.name} className="w-full h-full object-cover" />
                      </div>
                    )
                  ) : (
                    isEditing ? (
                      <button 
                        onClick={handleImageClick}
                        className="w-20 h-20 rounded-full border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer flex items-center justify-center bg-muted/10"
                      >
                        <Camera className="size-8 text-muted-foreground" />
                      </button>
                    ) : (
                      <div className="w-20 h-20 rounded-full border-2 border-character-blue-light flex items-center justify-center bg-muted/10">
                        <User className="size-10 text-muted-foreground" />
                      </div>
                    )
                  )}
                  {isEditing && (
                    <input
                      ref={characterImageInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      {/* @ Symbol Box */}
                      <div className="shrink-0 rounded-lg border border-border bg-card flex items-center justify-center px-3 h-10">
                        <span className="text-base text-character-blue">@</span>
                      </div>
                      {/* Name Input Box */}
                      <div className="flex-1 rounded-lg border border-border bg-character-blue-light flex items-center h-10 overflow-hidden">
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="h-full border-0 rounded-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 text-character-blue px-3"
                          placeholder="Charakter-Name"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {/* @ Symbol Box */}
                      <div className="shrink-0 rounded-lg border border-border bg-card flex items-center justify-center px-3 h-10">
                        <span className="text-base text-character-blue">@</span>
                      </div>
                      {/* Name Display Box */}
                      <div className="flex-1 rounded-lg border border-border bg-character-blue-light flex items-center px-3 h-10">
                        <p className="text-base text-character-blue">{character.name}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Fields Section */}
              <div className="space-y-4">
                {/* Rolle */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Rolle</Label>
                  {isEditing ? (
                    <Input
                      value={editedRole}
                      onChange={(e) => setEditedRole(e.target.value)}
                      className="h-9 border-2"
                      placeholder="z.B. Protagonist, Antagonist, Unterstützer"
                    />
                  ) : (
                    <div className="h-9 rounded-lg border border-border bg-muted/10 flex items-center px-3">
                      <p className="text-sm">{character.role || '—'}</p>
                    </div>
                  )}
                </div>

                {/* Beschreibung */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Beschreibung</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedDescription}
                      onChange={(e) => setEditedDescription(e.target.value)}
                      rows={2}
                      className="border-2 resize-none"
                      placeholder="Kurze Zusammenfassung des Charakters..."
                    />
                  ) : (
                    <div className="min-h-[60px] rounded-lg border border-border bg-muted/10 p-3">
                      <p className="text-sm whitespace-pre-wrap">{character.description || '—'}</p>
                    </div>
                  )}
                </div>

                {/* Alter, Geschlecht, Spezies (Grid) */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Alter</Label>
                    {isEditing ? (
                      <Input
                        value={editedAge}
                        onChange={(e) => setEditedAge(e.target.value)}
                        className="h-9 border-2"
                        placeholder="35"
                        type="number"
                      />
                    ) : (
                      <div className="h-9 rounded-lg border border-border bg-muted/10 flex items-center px-3">
                        <p className="text-sm">{character.age || '—'}</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Geschlecht</Label>
                    {isEditing ? (
                      <Input
                        value={editedGender}
                        onChange={(e) => setEditedGender(e.target.value)}
                        className="h-9 border-2"
                        placeholder="Female"
                      />
                    ) : (
                      <div className="h-9 rounded-lg border border-border bg-muted/10 flex items-center px-3">
                        <p className="text-sm">—</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground uppercase tracking-wider">Spezies</Label>
                    {isEditing ? (
                      <Input
                        value={editedSpecies}
                        onChange={(e) => setEditedSpecies(e.target.value)}
                        className="h-9 border-2"
                        placeholder="Human"
                      />
                    ) : (
                      <div className="h-9 rounded-lg border border-border bg-muted/10 flex items-center px-3">
                        <p className="text-sm">—</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Background Story */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Background Story</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedBackgroundStory}
                      onChange={(e) => setEditedBackgroundStory(e.target.value)}
                      rows={3}
                      className="border-2 resize-none"
                      placeholder="Die Hintergrundgeschichte des Charakters - Herkunft, wichtige Ereignisse, Motivation..."
                    />
                  ) : (
                    <div className="min-h-[80px] rounded-lg border border-border bg-muted/10 p-3">
                      <p className="text-sm whitespace-pre-wrap">{character.backstory || '—'}</p>
                    </div>
                  )}
                </div>

                {/* Skills */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Skills</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedSkills}
                      onChange={(e) => setEditedSkills(e.target.value)}
                      rows={2}
                      className="border-2 resize-none"
                      placeholder="Fähigkeiten kommagetrennt (z.B. Piloting, Schwertkampf, Hacking)"
                    />
                  ) : (
                    <div className="min-h-[60px] rounded-lg border border-border bg-muted/10 p-3">
                      <p className="text-sm">—</p>
                    </div>
                  )}
                </div>

                {/* Stärken */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Stärken</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedStrengths}
                      onChange={(e) => setEditedStrengths(e.target.value)}
                      rows={2}
                      className="border-2 resize-none"
                      placeholder="Was macht den Charakter stark? (z.B. Entscheidungsfreudig, Mutig, Intelligent)"
                    />
                  ) : (
                    <div className="min-h-[60px] rounded-lg border border-border bg-muted/10 p-3">
                      <p className="text-sm">—</p>
                    </div>
                  )}
                </div>

                {/* Schwächen */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Schwächen</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedWeaknesses}
                      onChange={(e) => setEditedWeaknesses(e.target.value)}
                      rows={2}
                      className="border-2 resize-none"
                      placeholder="Schwachstellen und Verletzlichkeiten (z.B. Impulsiv, Vertrauensselig, Sturköpfig)"
                    />
                  ) : (
                    <div className="min-h-[60px] rounded-lg border border-border bg-muted/10 p-3">
                      <p className="text-sm">—</p>
                    </div>
                  )}
                </div>

                {/* Charakter Traits */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Charakter Traits</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedCharacterTraits}
                      onChange={(e) => setEditedCharacterTraits(e.target.value)}
                      rows={2}
                      className="border-2 resize-none"
                      placeholder="Persönlichkeitsmerkmale (z.B. Mutig, Sarkastisch, Mitfühlend, Neugierig)"
                    />
                  ) : (
                    <div className="min-h-[60px] rounded-lg border border-border bg-muted/10 p-3">
                      <p className="text-sm">—</p>
                    </div>
                  )}
                </div>

                {/* Last Edited Badge */}
                {character.updatedAt && (
                  <Badge className="text-xs bg-primary/10 text-primary hover:bg-primary/15 border-0 w-fit">
                    {new Date(character.updatedAt).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric"
                    })}, {new Date(character.updatedAt).toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })} Uhr
                  </Badge>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Image Crop Dialog */}
      {tempImageForCrop && showImageCropDialog && (
        <ImageCropDialog
          image={tempImageForCrop}
          onComplete={(cropped) => {
            handleCroppedImage(cropped);
            setShowImageCropDialog(false);
            setTempImageForCrop(undefined);
          }}
          onCancel={() => {
            setShowImageCropDialog(false);
            setTempImageForCrop(undefined);
          }}
        />
      )}
    </>
  );
}