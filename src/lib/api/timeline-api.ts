/**
 * Timeline API Client
 *
 * 🚀 MIGRATED TO V2 NODES API
 *
 * This file now wraps the V2 Nodes API and provides backward-compatible
 * functions for Acts, Sequences, and Scenes using the generic Nodes system.
 *
 * The Nodes API works with ALL templates (Film, Serie, Buch, Theater, Game)
 * without requiring backend changes for new templates!
 */

import * as NodesAPI from "./timeline-api-v2";
import type { Act, Sequence, Scene } from "../types";
import type { TimelineNode } from "./timeline-api-v2";

// Re-export V2 types and functions for new code
export type {
  TimelineNode,
  CreateNodeRequest,
  UpdateNodeRequest,
} from "./timeline-api-v2";
export {
  getNodes,
  getNode,
  getNodeChildren,
  getNodePath,
  createNode,
  updateNode,
  deleteNode,
  reorderNodes,
  bulkCreateNodes,
  initializeProject,
  buildNodeTree,
  flattenNodeTree,
  getAllProjectNodes,
  getRootNodes,
} from "./timeline-api-v2";

// =============================================================================
// HELPER FUNCTIONS - Node to Legacy Type Conversion
// =============================================================================

/**
 * Convert TimelineNode (level 1) to Act
 */
export function nodeToAct(node: TimelineNode): Act {
  return {
    id: node.id,
    projectId: node.projectId,
    actNumber: node.nodeNumber,
    title: node.title,
    description: node.description || "",
    orderIndex: node.orderIndex,
    metadata: node.metadata,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

/**
 * Convert TimelineNode (level 2) to Sequence
 */
export function nodeToSequence(node: TimelineNode): Sequence {
  return {
    id: node.id,
    projectId: node.projectId,
    actId: node.parentId!,
    sequenceNumber: node.nodeNumber,
    title: node.title,
    description: node.description || "",
    color: node.color,
    orderIndex: node.orderIndex,
    metadata: node.metadata,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

/**
 * Convert TimelineNode (level 3) to Scene
 */
export function nodeToScene(node: TimelineNode): Scene {
  return {
    id: node.id,
    projectId: node.projectId,
    sequenceId: node.parentId!,
    sceneNumber: node.nodeNumber,
    title: node.title,
    description: node.description || "",
    color: node.color,
    orderIndex: node.orderIndex,
    location: node.metadata?.location,
    timeOfDay: node.metadata?.timeOfDay,
    characters: node.metadata?.characters || [],
    content: node.metadata?.content, // 📚 Support for book content
    metadata: node.metadata,
    createdAt: node.createdAt,
    updatedAt: node.updatedAt,
  };
}

// =============================================================================
// ACTS - Backward Compatible Wrapper Functions
// =============================================================================

export async function getActs(
  projectId: string,
  token?: string,
): Promise<Act[]> {
  const nodes = await NodesAPI.getActs(projectId);
  return nodes.map(nodeToAct);
}

export async function createAct(
  projectId: string,
  actData: Partial<Act>,
  token?: string,
): Promise<Act> {
  const node = await NodesAPI.createNode({
    projectId,
    templateId: "film-3-act", // TODO: Get from project
    level: 1,
    parentId: null,
    nodeNumber: actData.actNumber!,
    title: actData.title || `Akt ${actData.actNumber}`,
    description: actData.description,
  });

  return nodeToAct(node);
}

export async function updateAct(
  actId: string,
  updates: Partial<Act>,
  token: string,
): Promise<Act> {
  const currentNode = await NodesAPI.getNode(actId);
  const metadata: Record<string, any> = { ...(currentNode.metadata || {}) };
  if (updates.metadata) {
    Object.assign(metadata, updates.metadata);
  }

  const node = await NodesAPI.updateNode(actId, {
    nodeNumber: updates.actNumber,
    title: updates.title,
    description: updates.description,
    orderIndex: updates.orderIndex,
    metadata,
  });

  return nodeToAct(node);
}

export async function deleteAct(actId: string, token: string): Promise<void> {
  await NodesAPI.deleteNode(actId);
}

export async function reorderActs(
  projectId: string,
  actIds: string[],
  token: string,
): Promise<void> {
  await NodesAPI.reorderNodes(actIds);
}

// =============================================================================
// SEQUENCES - Backward Compatible Wrapper Functions
// =============================================================================

export async function getSequences(
  actId: string,
  token: string,
): Promise<Sequence[]> {
  const nodes = await NodesAPI.getNodeChildren(actId);
  return nodes.map(nodeToSequence);
}

export async function createSequence(
  actId: string,
  sequenceData: Partial<Sequence>,
  token: string,
): Promise<Sequence> {
  // Get act to get projectId
  const act = await NodesAPI.getNode(actId);

  const node = await NodesAPI.createNode({
    projectId: act.projectId,
    templateId: act.templateId,
    level: 2,
    parentId: actId,
    nodeNumber: sequenceData.sequenceNumber!,
    title: sequenceData.title || `Sequenz ${sequenceData.sequenceNumber}`,
    description: sequenceData.description,
    color: sequenceData.color,
  });

  return nodeToSequence(node);
}

export async function updateSequence(
  sequenceId: string,
  updates: Partial<Sequence>,
  token: string,
): Promise<Sequence> {
  const currentNode = await NodesAPI.getNode(sequenceId);
  const metadata: Record<string, any> = { ...(currentNode.metadata || {}) };
  if (updates.metadata) {
    Object.assign(metadata, updates.metadata);
  }

  const node = await NodesAPI.updateNode(sequenceId, {
    nodeNumber: updates.sequenceNumber,
    title: updates.title,
    description: updates.description,
    color: updates.color,
    orderIndex: updates.orderIndex,
    parentId: updates.actId, // Support moving to different Act
    metadata,
  });

  return nodeToSequence(node);
}

export async function deleteSequence(
  sequenceId: string,
  token: string,
): Promise<void> {
  await NodesAPI.deleteNode(sequenceId);
}

export async function reorderSequences(
  actId: string,
  sequenceIds: string[],
  token: string,
): Promise<void> {
  await NodesAPI.reorderNodes(sequenceIds);
}

// =============================================================================
// SCENES - Backward Compatible Wrapper Functions
// =============================================================================

export async function getScenes(
  sequenceId: string,
  token: string,
): Promise<Scene[]> {
  const nodes = await NodesAPI.getNodeChildren(sequenceId);
  return nodes.map(nodeToScene);
}

export async function createScene(
  sequenceId: string,
  sceneData: Partial<Scene>,
  token: string,
): Promise<Scene> {
  // Get sequence to get projectId
  const sequence = await NodesAPI.getNode(sequenceId);

  const node = await NodesAPI.createNode({
    projectId: sequence.projectId,
    templateId: sequence.templateId,
    level: 3,
    parentId: sequenceId,
    nodeNumber: sceneData.sceneNumber!,
    title: sceneData.title || `Szene ${sceneData.sceneNumber}`,
    description: sceneData.description,
    color: sceneData.color,
    metadata: {
      location: sceneData.location,
      timeOfDay: sceneData.timeOfDay,
      characters: sceneData.characters || [],
      content: sceneData.content, // 📚 Support for book content
    },
  });

  return nodeToScene(node);
}

export async function updateScene(
  sceneId: string,
  updates: Partial<Scene>,
  token: string,
): Promise<Scene> {
  // Get current scene to preserve metadata
  const currentNode = await NodesAPI.getNode(sceneId);

  const metadata: any = { ...currentNode.metadata };
  if (updates.location !== undefined) metadata.location = updates.location;
  if (updates.timeOfDay !== undefined) metadata.timeOfDay = updates.timeOfDay;
  if (updates.characters !== undefined)
    metadata.characters = updates.characters;
  if (updates.content !== undefined) metadata.content = updates.content; // 📚 Support for book content
  if (updates.metadata) {
    Object.assign(metadata, updates.metadata);
  }

  const node = await NodesAPI.updateNode(sceneId, {
    nodeNumber: updates.sceneNumber,
    title: updates.title,
    description: updates.description,
    color: updates.color,
    orderIndex: updates.orderIndex,
    parentId: updates.sequenceId, // Support moving to different Sequence
    metadata,
    wordCount: updates.wordCount, // 📊 Pass word count to database
  });

  return nodeToScene(node);
}

export async function deleteScene(
  sceneId: string,
  token: string,
): Promise<void> {
  await NodesAPI.deleteNode(sceneId);
}

export async function reorderScenes(
  sequenceId: string,
  sceneIds: string[],
  token: string,
): Promise<void> {
  await NodesAPI.reorderNodes(sceneIds);
}

// =============================================================================
// BULK LOADERS - Performance Optimized 🚀
// =============================================================================

/**
 * Get ALL sequences for a project in ONE API call (Level 2 nodes)
 */
export async function getAllSequencesByProject(
  projectId: string,
  token: string,
): Promise<Sequence[]> {
  const nodes = await NodesAPI.getNodes({ projectId, level: 2 });
  return nodes.map(nodeToSequence);
}

/**
 * Get ALL scenes for a project in ONE API call (Level 3 nodes)
 */
export async function getAllScenesByProject(
  projectId: string,
  token: string,
): Promise<Scene[]> {
  const nodes = await NodesAPI.getNodes({ projectId, level: 3 });
  return nodes.map(nodeToScene);
}
