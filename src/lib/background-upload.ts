/**
 * Fire-and-forget background image upload manager.
 *
 * Uploads continue even when the initiating component unmounts.
 * Progress/completion is communicated via sonner toasts and an optional callback.
 */

import { toast } from 'sonner';
import { uploadProjectImage, uploadWorldImage, type ClientImageUploadPrepOptions } from './api/image-upload-api';

type UploadTarget =
  | { kind: 'project-cover'; projectId: string }
  | { kind: 'world-cover'; worldId: string };

interface BackgroundUploadOptions {
  file: File;
  target: UploadTarget;
  prepOptions?: ClientImageUploadPrepOptions;
  /** Called with the resulting URL when the upload succeeds (if component is still mounted). */
  onSuccess?: (imageUrl: string) => void;
}

const activeUploads = new Map<string, AbortController>();

function uploadKey(target: UploadTarget): string {
  return target.kind === 'project-cover'
    ? `project-cover:${target.projectId}`
    : `world-cover:${target.worldId}`;
}

export function isBackgroundUploadActive(target: UploadTarget): boolean {
  return activeUploads.has(uploadKey(target));
}

export function startBackgroundUpload(options: BackgroundUploadOptions): void {
  const { file, target, prepOptions, onSuccess } = options;
  const key = uploadKey(target);

  // Cancel any existing upload for the same target
  activeUploads.get(key)?.abort();

  const controller = new AbortController();
  activeUploads.set(key, controller);

  const toastId = toast.loading('Bild wird im Hintergrund hochgeladen…');

  (async () => {
    try {
      let imageUrl: string;

      if (target.kind === 'project-cover') {
        imageUrl = await uploadProjectImage(target.projectId, file, prepOptions);
      } else {
        imageUrl = await uploadWorldImage(target.worldId, file, prepOptions);
      }

      if (controller.signal.aborted) return;

      toast.success('Bild erfolgreich hochgeladen!', { id: toastId });
      onSuccess?.(imageUrl);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('[background-upload] Failed:', err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Hochladen', { id: toastId });
    } finally {
      activeUploads.delete(key);
    }
  })();
}
