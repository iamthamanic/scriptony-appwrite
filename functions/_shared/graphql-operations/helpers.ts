/**
 * Shared query helpers for GraphQL-to-Appwrite operation handlers.
 */

import { Query, ID } from "node-appwrite";
import {
  C,
  createDocument,
  getDocument,
  listDocumentsFull,
} from "../appwrite-db";

export function queriesForUserProjects(organizationId: string, userId: string): string[] {
  return [
    Query.and([
      Query.or([
        Query.equal("organization_id", organizationId),
        Query.equal("user_id", userId),
      ]),
      Query.or([Query.equal("is_deleted", false), Query.isNull("is_deleted")]),
    ]),
    Query.orderDesc("$createdAt"),
  ];
}

export async function hydrateShot(shot: Record<string, any>): Promise<Record<string, any>> {
  const links = await listDocumentsFull(C.shot_characters, [Query.equal("shot_id", shot.id)]);
  const shot_characters: Array<{ character: Record<string, any> }> = [];
  for (const link of links) {
    const ch = await getDocument(C.characters, link.character_id as string);
    if (ch) {
      shot_characters.push({ character: ch });
    }
  }
  const shot_audio = await listDocumentsFull(C.shot_audio, [
    Query.equal("shot_id", shot.id),
    Query.orderAsc("$createdAt"),
  ]);
  return { ...shot, shot_characters, shot_audio };
}

export async function hydrateShots(shots: Record<string, any>[]): Promise<Record<string, any>[]> {
  return Promise.all(shots.map((s) => hydrateShot(s)));
}

export { ID, Query, C, createDocument, getDocument, listDocumentsFull };
