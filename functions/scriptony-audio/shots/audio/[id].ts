/**
 * Shot audio item routes for the Scriptony HTTP API.
 *
 * T09 LEGACY: Shot-Audio-Verwaltung ist Asset-/Timeline-Kontext,
 * keine technische Audiofaehigkeit.
 * Neue Shot-Audio-Uploads sollten ueber scriptony-assets laufen.
 *
 * T09 Schema-Mismatch (dokumentiert):
 *   Appwrite-Schema (provision-appwrite-schema.mjs):
 *     shot_id, file_name, file_size, bucket_file_id, mime_type, duration_ms,
 *     user_id, storage_path
 *   GraphQL-Schema (Route-Handler):
 *     file_url, start_time, end_time, fade_in, fade_out, waveform_data,
 *     audio_duration
 *   → Fast keine gemeinsamen Felder. Beide Schemas existieren parallel.
 *
 * T09 Delegation:
 *   Synchronisiert Aenderungen/Loeschungen mit dem zugehoerigen
 *   Asset-Dokument in scriptony-assets.
 */

import { requireUserBootstrap } from "../../../_shared/auth";
import { getDatabases, dbId, C } from "../../../_shared/appwrite-db";
import { requestGraphql } from "../../../_shared/graphql-compat";
import {
  getParam,
  readJsonBody,
  type RequestLike,
  type ResponseLike,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendServerError,
  sendUnauthorized,
} from "../../../_shared/http";
import {
  deleteStorageFileByUrl,
  extractStorageFileId,
} from "../../../_shared/storage";
import { mapShotAudio } from "../../../_shared/timeline";
import { Query } from "node-appwrite";

async function syncAssetFromUrl(
  fileUrl: string | null | undefined,
  updates: Record<string, unknown>,
): Promise<void> {
  const fileId = extractStorageFileId(fileUrl);
  if (!fileId) return;
  const database = await getDatabases();
  const { documents } = await database.listDocuments(dbId(), C.assets, [
    Query.equal("file_id", fileId),
    Query.limit(1),
  ]);
  if (documents.length > 0) {
    await database.updateDocument(
      dbId(),
      C.assets,
      documents[0].$id,
      updates,
    );
  }
}

async function deleteAssetFromUrl(
  fileUrl: string | null | undefined,
): Promise<void> {
  const fileId = extractStorageFileId(fileUrl);
  if (!fileId) return;
  const database = await getDatabases();
  const { documents } = await database.listDocuments(dbId(), C.assets, [
    Query.equal("file_id", fileId),
    Query.limit(1),
  ]);
  if (documents.length > 0) {
    await database.deleteDocument(dbId(), C.assets, documents[0].$id);
  }
}

export default async function handler(
  req: RequestLike,
  res: ResponseLike,
): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    const audioId = getParam(req, "id");
    if (!audioId) {
      sendBadRequest(res, "id is required");
      return;
    }

    if (req.method === "PATCH") {
      const body = await readJsonBody<Record<string, any>>(req);
      const changes = {
        label: body.label,
        start_time: body.startTime ?? body.start_time,
        end_time: body.endTime ?? body.end_time,
        fade_in: body.fadeIn ?? body.fade_in,
        fade_out: body.fadeOut ?? body.fade_out,
        waveform_data: body.peaks ?? body.waveform_data,
        audio_duration: body.duration ?? body.audio_duration,
      };

      const cleanedChanges = Object.fromEntries(
        Object.entries(changes).filter(([, value]) => value !== undefined),
      );

      const updated = await requestGraphql<{
        update_shot_audio_by_pk: Record<string, any> | null;
      }>(
        `
          mutation UpdateShotAudio($id: uuid!, $changes: shot_audio_set_input!) {
            update_shot_audio_by_pk(pk_columns: { id: $id }, _set: $changes) {
              id
              shot_id
              type
              file_url
              file_name
              label
              file_size
              start_time
              end_time
              fade_in
              fade_out
              waveform_data
              audio_duration
              created_at
            }
          }
        `,
        {
          id: audioId,
          changes: cleanedChanges,
        },
      );

      // T09: Asset-Metadaten synchronisieren
      void syncAssetFromUrl(
        updated.update_shot_audio_by_pk?.file_url,
        {
          updated_at: new Date().toISOString(),
          metadata: JSON.stringify({
            ...cleanedChanges,
            updated_by: "legacy-patch",
          }),
        },
      ).catch((err) => {
        console.error("[Shot Audio] Asset sync failed:", err);
      });

      sendJson(res, 200, {
        audio: updated.update_shot_audio_by_pk
          ? mapShotAudio(updated.update_shot_audio_by_pk)
          : null,
      });
      return;
    }

    if (req.method === "DELETE") {
      const existing = await requestGraphql<{
        shot_audio_by_pk: { id: string; file_url: string | null } | null;
      }>(
        `
          query GetShotAudioFile($id: uuid!) {
            shot_audio_by_pk(id: $id) {
              id
              file_url
            }
          }
        `,
        { id: audioId },
      );

      await requestGraphql(
        `
          mutation DeleteShotAudio($id: uuid!) {
            delete_shot_audio_by_pk(id: $id) {
              id
            }
          }
        `,
        { id: audioId },
      );

      const fileUrl = existing.shot_audio_by_pk?.file_url;
      await deleteStorageFileByUrl(fileUrl);

      // T09: zugehoeriges Asset loeschen
      void deleteAssetFromUrl(fileUrl).catch((err) => {
        console.error("[Shot Audio] Asset delete failed:", err);
      });

      sendJson(res, 200, { success: true });
      return;
    }

    sendMethodNotAllowed(res, ["PATCH", "DELETE"]);
  } catch (error) {
    sendServerError(res, error);
  }
}
