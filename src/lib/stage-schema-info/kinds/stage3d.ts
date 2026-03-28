/**
 * Platzhalter-Payload für Three.js / R3F — minimal halten bis die 3D-Engine festliegt.
 * Erweiterungen: nodes, materials, environment; schemaVersion am Envelope anheben.
 */
export interface Stage3DNodeStub {
  id: string;
  /** z. B. "group" | "mesh" | "light" */
  type: string;
  /** Freiform bis das echte Schema steht */
  data?: Record<string, unknown>;
}

export interface Stage3DPayload {
  payloadRevision?: number;
  /** Platzhalter-Szene */
  nodes: Stage3DNodeStub[];
  meta?: {
    title?: string;
    exportedAt?: string;
  };
}
