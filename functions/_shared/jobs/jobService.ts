/**
 * @deprecated T14 — Deno-only, nicht Node-kompatibel.
 *
 * JobService nutzt Deno APIs (Deno.env, npm:node-appwrite@14.2.0) und
 * getDatabaseClient() (nicht existent in _shared/appwrite-db.ts).
 *
 * Die aktive Job-Control-Plane ist scriptony-jobs-handler (Node.js).
 * Dieser Code bleibt als Archiv-Referenz und wird nicht exportiert.
 *
 * Fuer Worker-Progress-Reporting: nutze _shared/jobs/jobWorker.ts
 * Fuer Job-Status-Abfrage: nutze scriptony-jobs-handler API
 */

import { ID, Query } from "npm:node-appwrite@14.2.0";
import { getDatabaseClient } from "../appwrite-db.ts";
import type { Job, JobStatus } from "./types.ts";

const DATABASE_ID = Deno.env.get("APPWRITE_DATABASE_ID") || "scriptony-dev";
const JOBS_COLLECTION_ID = "jobs";

interface CreateJobInput {
  functionName: string;
  payload: unknown;
  jobId?: string;
}

export class JobService {
  private db: ReturnType<typeof getDatabaseClient>;

  constructor() {
    this.db = getDatabaseClient();
  }

  /**
   * Create a new job entry
   * Returns immediately - no blocking
   */
  async createJob(input: CreateJobInput): Promise<Job> {
    const jobId = input.jobId || ID.unique();

    const job = await this.db.createDocument(
      DATABASE_ID,
      JOBS_COLLECTION_ID,
      jobId,
      {
        functionName: input.functionName,
        status: "pending" as JobStatus,
        payload: JSON.stringify(input.payload),
        progress: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    );

    return this.mapToJob(job);
  }

  /**
   * Mark job as processing and start execution
   */
  async startJob(jobId: string): Promise<void> {
    await this.db.updateDocument(DATABASE_ID, JOBS_COLLECTION_ID, jobId, {
      status: "processing",
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Update job progress (0-100)
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    await this.db.updateDocument(DATABASE_ID, JOBS_COLLECTION_ID, jobId, {
      progress: Math.min(100, Math.max(0, progress)),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Complete job with result
   */
  async completeJob(jobId: string, result: unknown): Promise<void> {
    await this.db.updateDocument(DATABASE_ID, JOBS_COLLECTION_ID, jobId, {
      status: "completed",
      result: JSON.stringify(result),
      progress: 100,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Mark job as failed
   */
  async failJob(jobId: string, error: string): Promise<void> {
    await this.db.updateDocument(DATABASE_ID, JOBS_COLLECTION_ID, jobId, {
      status: "failed",
      error: error.slice(0, 2000), // Limit error size
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    try {
      const doc = await this.db.getDocument(
        DATABASE_ID,
        JOBS_COLLECTION_ID,
        jobId,
      );
      return this.mapToJob(doc);
    } catch {
      return null;
    }
  }

  /**
   * Cleanup old completed jobs (run periodically)
   */
  async cleanupOldJobs(olderThanHours: number = 24): Promise<number> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - olderThanHours);

    const oldJobs = await this.db.listDocuments(
      DATABASE_ID,
      JOBS_COLLECTION_ID,
      [
        Query.equal("status", ["completed", "failed"]),
        Query.lessThan("updatedAt", cutoff.toISOString()),
        Query.limit(100),
      ],
    );

    let deleted = 0;
    for (const job of oldJobs.documents) {
      try {
        await this.db.deleteDocument(DATABASE_ID, JOBS_COLLECTION_ID, job.$id);
        deleted++;
      } catch {
        // Ignore deletion errors
      }
    }

    return deleted;
  }

  private mapToJob(doc: Record<string, unknown>): Job {
    return {
      $id: doc.$id as string,
      functionName: doc.functionName as string,
      status: doc.status as JobStatus,
      payload: doc.payload ? JSON.parse(doc.payload as string) : null,
      result: doc.result ? JSON.parse(doc.result as string) : undefined,
      error: doc.error as string | undefined,
      progress: doc.progress as number | undefined,
      startedAt: doc.startedAt as string | undefined,
      completedAt: doc.completedAt as string | undefined,
      createdAt: doc.createdAt as string,
      updatedAt: doc.updatedAt as string,
    };
  }
}

// Singleton export
export const jobService = new JobService();
