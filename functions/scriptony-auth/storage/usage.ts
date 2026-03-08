/**
 * Storage usage endpoint for the Nhost-backed auth compatibility layer.
 */

import {
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  type RequestLike,
  type ResponseLike,
} from "../../_shared/http";
import { requireUserBootstrap } from "../../_shared/auth";
import { requestGraphql } from "../../_shared/hasura";

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  if (req.method !== "GET") {
    sendMethodNotAllowed(res, ["GET"]);
    return;
  }

  const bootstrap = await requireUserBootstrap(req.headers.authorization);
  if (!bootstrap) {
    sendUnauthorized(res);
    return;
  }

  const data = await requestGraphql<{
    shot_audio: Array<{ file_name: string; file_size: number | null; created_at: string }>;
    projects: Array<{ cover_image_url: string | null }>;
    worlds: Array<{ cover_image_url: string | null }>;
    shots: Array<{ image_url: string | null; storyboard_url: string | null }>;
  }>(
    `
      query GetStorageUsage($organizationId: uuid!) {
        shot_audio(where: { shot: { project: { organization_id: { _eq: $organizationId } } } }) {
          file_name
          file_size
          created_at
        }
        projects(where: { organization_id: { _eq: $organizationId } }) {
          cover_image_url
        }
        worlds(where: { organization_id: { _eq: $organizationId } }) {
          cover_image_url
        }
        shots(where: { project: { organization_id: { _eq: $organizationId } } }) {
          image_url
          storyboard_url
        }
      }
    `,
    { organizationId: bootstrap.organizationId }
  );

  const audioFiles = data.shot_audio.map((entry) => ({
    name: entry.file_name,
    size: entry.file_size || 0,
    createdAt: entry.created_at,
  }));
  const imageCount =
    data.projects.filter((entry) => entry.cover_image_url).length +
    data.worlds.filter((entry) => entry.cover_image_url).length +
    data.shots.filter((entry) => entry.image_url || entry.storyboard_url).length;

  sendJson(res, 200, {
    totalSize: audioFiles.reduce((sum, file) => sum + file.size, 0),
    fileCount: audioFiles.length + imageCount,
    files: audioFiles,
  });
}
