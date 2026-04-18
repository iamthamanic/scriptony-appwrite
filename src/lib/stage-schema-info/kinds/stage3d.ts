/**
 * Platzhalter-Payload fuer Three.js / R3F.
 * Erweiterungen: nodes, materials, environment; schemaVersion am Envelope anheben.
 */
export interface Stage3DNodeStub {
  id: string;
  /** Zum Beispiel "group" | "mesh" | "light" */
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
