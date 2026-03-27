/**
 * 🎬 SHOT CARD MODAL
 *
 * Opens a ShotCard inside a Dialog — usable from Timeline, Dropdown, or anywhere.
 * ShotCard itself stays unchanged; this wrapper provides:
 *   - Dialog container (full-screen on mobile, large on desktop)
 *   - Breadcrumb header (Act > Sequence > Scene > Shot)
 *   - All callback props wired to API calls + Context dispatch
 *
 * Usage:
 *   <ShotCardModal
 *     open={!!selectedShotId}
 *     onOpenChange={(open) => !open && setSelectedShotId(null)}
 *     shotId={selectedShotId}
 *     projectId={projectId}
 *   />
 */

import { useCallback, useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { ShotCard } from './ShotCard';
import { useTimelineState, useShotBreadcrumb } from '../contexts/TimelineStateContext';
import { useAuth } from '../hooks/useAuth';
import * as ShotsAPI from '../lib/api/shots-api';
import {
  validateImageFile,
  needsGifUserConfirmation,
  type ImageUploadGifMode,
} from '../lib/api/image-upload-api';
import { GifAnimationUploadDialog } from './GifAnimationUploadDialog';
import { toast } from 'sonner';
import type { Shot } from '../lib/types';

interface ShotCardModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shotId: string | null;
  projectId: string;
}

export function ShotCardModal({ open, onOpenChange, shotId, projectId }: ShotCardModalProps) {
  const { shots, characters, dispatch } = useTimelineState();
  const breadcrumb = useShotBreadcrumb(shotId || undefined);
  const { getAccessToken } = useAuth();

  // GIF confirmation dialog state
  const [gifPending, setGifPending] = useState<{ shotId: string; file: File } | null>(null);
  const [imageUploadingId, setImageUploadingId] = useState<string | null>(null);
  const imageUploadInFlightRef = useRef(false);

  const shot = shotId ? shots.find(s => s.id === shotId) : undefined;

  // ─── Shot Callbacks (mirror FilmDropdown handlers) ──────────────

  const handleUpdateShot = useCallback(async (id: string, updates: Partial<Shot>) => {
    // Optimistic update via context
    dispatch({ type: 'UPDATE_SHOT', id, payload: updates });

    try {
      const token = await getAccessToken();
      if (!token) return;
      await ShotsAPI.updateShot(id, updates, token);
    } catch (error) {
      console.error('Error updating shot:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  }, [dispatch, getAccessToken]);

  const handleDeleteShot = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_SHOT', id });
    onOpenChange(false); // Close modal after delete

    try {
      const token = await getAccessToken();
      if (!token) return;
      await ShotsAPI.deleteShot(id, token);
      toast.success('Shot gelöscht');
    } catch (error) {
      console.error('Error deleting shot:', error);
      toast.error('Fehler beim Löschen');
    }
  }, [dispatch, getAccessToken, onOpenChange]);

  const handleDuplicateShot = useCallback(async (id: string) => {
    const shotToDuplicate = shots.find(s => s.id === id);
    if (!shotToDuplicate) return;

    try {
      const token = await getAccessToken();
      if (!token) return;

      const newShot = await ShotsAPI.createShot(shotToDuplicate.sceneId, {
        shotNumber: `${shotToDuplicate.shotNumber} (Kopie)`,
        description: shotToDuplicate.description,
        cameraAngle: shotToDuplicate.cameraAngle,
        cameraMovement: shotToDuplicate.cameraMovement,
        framing: shotToDuplicate.framing,
        lens: shotToDuplicate.lens,
        duration: shotToDuplicate.duration,
        shotlengthMinutes: shotToDuplicate.shotlengthMinutes,
        shotlengthSeconds: shotToDuplicate.shotlengthSeconds,
        notes: shotToDuplicate.notes,
        dialog: shotToDuplicate.dialog,
        projectId,
      }, token);

      dispatch({ type: 'ADD_SHOT', payload: newShot });
      toast.success('Shot dupliziert');
    } catch (error) {
      console.error('Error duplicating shot:', error);
      toast.error('Fehler beim Duplizieren');
    }
  }, [shots, dispatch, getAccessToken, projectId]);

  const runShotImageUpload = useCallback(async (id: string, file: File, gifMode?: ImageUploadGifMode) => {
    imageUploadInFlightRef.current = true;
    setImageUploadingId(id);

    const previewUrl = URL.createObjectURL(file);
    dispatch({ type: 'UPDATE_SHOT', id, payload: { imageUrl: previewUrl } });
    toast.loading('Bild wird hochgeladen...');

    try {
      const token = await getAccessToken();
      if (!token) {
        toast.dismiss();
        toast.error('Nicht authentifiziert');
        URL.revokeObjectURL(previewUrl);
        dispatch({ type: 'UPDATE_SHOT', id, payload: { imageUrl: undefined } });
        return;
      }

      const imageUrl = await ShotsAPI.uploadShotImage(id, file, token, { gifMode });
      URL.revokeObjectURL(previewUrl);
      dispatch({ type: 'UPDATE_SHOT', id, payload: { imageUrl } });
      toast.dismiss();
      toast.success('Bild hochgeladen!');
    } catch (error) {
      console.error('Error uploading shot image:', error);
      URL.revokeObjectURL(previewUrl);
      dispatch({ type: 'UPDATE_SHOT', id, payload: { imageUrl: undefined } });
      toast.dismiss();
      toast.error(`Fehler beim Hochladen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    } finally {
      setImageUploadingId(null);
      imageUploadInFlightRef.current = false;
    }
  }, [dispatch, getAccessToken]);

  const handleImageUpload = useCallback(async (id: string, file: File) => {
    try {
      validateImageFile(file, 5);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Ungültiges Bild');
      return;
    }

    if (needsGifUserConfirmation(file)) {
      setImageUploadingId(id);
      setGifPending({ shotId: id, file });
      return;
    }

    await runShotImageUpload(id, file, undefined);
  }, [runShotImageUpload]);

  const handleAudioUpload = useCallback(async (
    id: string,
    file: File,
    type: 'music' | 'sfx',
    label?: string,
    startTime?: number,
    endTime?: number,
    fadeIn?: number,
    fadeOut?: number,
  ) => {
    try {
      const token = await getAccessToken();
      if (!token) return;

      await ShotsAPI.uploadShotAudio(id, file, type, token, label, startTime, endTime, fadeIn, fadeOut);
      const updatedShot = await ShotsAPI.getShot(id, token);
      dispatch({ type: 'UPDATE_SHOT', id, payload: { audioFiles: updatedShot.audioFiles } });
      toast.success('Audio hochgeladen');
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Fehler beim Hochladen');
    }
  }, [dispatch, getAccessToken]);

  const handleAudioDelete = useCallback(async (audioId: string) => {
    // Find which shot has this audio and update locally
    const parentShot = shots.find(s => s.audioFiles?.some(a => a.id === audioId));
    if (parentShot) {
      dispatch({
        type: 'UPDATE_SHOT',
        id: parentShot.id,
        payload: { audioFiles: parentShot.audioFiles?.filter(a => a.id !== audioId) },
      });
    }

    try {
      const token = await getAccessToken();
      if (!token) return;
      await ShotsAPI.deleteShotAudio(audioId, token);
      toast.success('Audio gelöscht');
    } catch (error) {
      console.error('Error deleting audio:', error);
      toast.error('Fehler beim Löschen');
    }
  }, [shots, dispatch, getAccessToken]);

  const handleAudioUpdate = useCallback(async (
    audioId: string,
    updates: { label?: string; startTime?: number; endTime?: number; fadeIn?: number; fadeOut?: number },
  ) => {
    // Optimistic: find parent shot and update audio in place
    const parentShot = shots.find(s => s.audioFiles?.some(a => a.id === audioId));
    if (parentShot) {
      dispatch({
        type: 'UPDATE_SHOT',
        id: parentShot.id,
        payload: {
          audioFiles: parentShot.audioFiles?.map(a =>
            a.id === audioId ? { ...a, ...updates } : a
          ),
        },
      });
    }

    try {
      const token = await getAccessToken();
      if (!token) return;
      await ShotsAPI.updateShotAudio(audioId, updates, token);
    } catch (error) {
      console.error('Error updating audio:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  }, [shots, dispatch, getAccessToken]);

  const handleCharacterAdd = useCallback(async (id: string, characterId: string) => {
    const shotData = shots.find(s => s.id === id);
    if (!shotData) return;

    const character = characters.find(c => c.id === characterId);
    if (!character) return;

    const currentCharacters = shotData.characters || [];
    if (currentCharacters.some(c => c.id === characterId)) {
      toast.error('Character bereits hinzugefügt');
      return;
    }

    dispatch({
      type: 'UPDATE_SHOT',
      id,
      payload: { characters: [...currentCharacters, character] },
    });

    try {
      const token = await getAccessToken();
      if (!token) return;
      const updatedShot = await ShotsAPI.addCharacterToShot(id, characterId, token);
      dispatch({ type: 'UPDATE_SHOT', id, payload: { characters: updatedShot.characters } });
      toast.success('Character hinzugefügt');
    } catch (error) {
      console.error('Error adding character:', error);
      toast.error('Fehler beim Hinzufügen');
      dispatch({ type: 'UPDATE_SHOT', id, payload: { characters: currentCharacters } });
    }
  }, [shots, characters, dispatch, getAccessToken]);

  const handleCharacterRemove = useCallback(async (id: string, characterId: string) => {
    const shotData = shots.find(s => s.id === id);
    if (!shotData) return;

    const currentCharacters = shotData.characters || [];
    dispatch({
      type: 'UPDATE_SHOT',
      id,
      payload: { characters: currentCharacters.filter(c => c.id !== characterId) },
    });

    try {
      const token = await getAccessToken();
      if (!token) return;
      await ShotsAPI.removeCharacterFromShot(id, characterId, token);
      toast.success('Character entfernt');
    } catch (error) {
      console.error('Error removing character:', error);
      toast.error('Fehler beim Entfernen');
      dispatch({ type: 'UPDATE_SHOT', id, payload: { characters: currentCharacters } });
    }
  }, [shots, dispatch, getAccessToken]);

  // No-op reorder in modal context (single shot view)
  const handleReorder = useCallback(() => {}, []);

  if (!shot || !shotId) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            {/* Breadcrumb: Act > Sequence > Scene > Shot */}
            {breadcrumb && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                {breadcrumb.act && (
                  <>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {breadcrumb.act.title || `Akt ${breadcrumb.act.actNumber}`}
                    </Badge>
                    <span className="text-muted-foreground/50">&gt;</span>
                  </>
                )}
                {breadcrumb.sequence && (
                  <>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {breadcrumb.sequence.title || `Sequenz ${breadcrumb.sequence.sequenceNumber}`}
                    </Badge>
                    <span className="text-muted-foreground/50">&gt;</span>
                  </>
                )}
                {breadcrumb.scene && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {breadcrumb.scene.title || `Szene ${breadcrumb.scene.sceneNumber}`}
                  </Badge>
                )}
              </div>
            )}
            <DialogTitle className="text-base">
              Shot {shot.shotNumber}
              {shot.description && (
                <span className="font-normal text-muted-foreground ml-2 text-sm">
                  {shot.description.length > 60 ? shot.description.slice(0, 60) + '...' : shot.description}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="px-2 pb-4">
            <ShotCard
              shot={shot}
              sceneId={shot.sceneId}
              projectId={projectId}
              projectCharacters={characters}
              isExpanded={true}
              imageUploadWaiting={imageUploadInFlightRef.current && imageUploadingId === shotId}
              onToggleExpand={() => {}} // Already expanded in modal
              onUpdate={handleUpdateShot}
              onDelete={handleDeleteShot}
              onDuplicate={handleDuplicateShot}
              onReorder={handleReorder}
              onImageUpload={handleImageUpload}
              onAudioUpload={handleAudioUpload}
              onAudioDelete={handleAudioDelete}
              onAudioUpdate={handleAudioUpdate}
              onCharacterAdd={handleCharacterAdd}
              onCharacterRemove={handleCharacterRemove}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* GIF Confirmation Dialog */}
      {gifPending && (
        <GifAnimationUploadDialog
          open={!!gifPending}
          onOpenChange={(open) => {
            if (!open) {
              setGifPending(null);
              setImageUploadingId(null);
            }
          }}
          onConfirm={async (mode) => {
            const { shotId: gShotId, file } = gifPending;
            setGifPending(null);
            await runShotImageUpload(gShotId, file, mode);
          }}
        />
      )}
    </>
  );
}
