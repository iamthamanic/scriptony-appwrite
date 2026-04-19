export interface BridgeHealth {
  status: string;
  service: string;
  connections: {
    appwriteRealtime: boolean;
    comfyUI: boolean;
    blender: boolean;
  };
  concurrency: {
    running: number;
    queued: number;
    activeJobs: number;
  };
}

export async function fetchBridgeHealth(): Promise<BridgeHealth | null> {
  try {
    const res = await fetch("/bridge/health", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as BridgeHealth;
  } catch {
    return null;
  }
}
