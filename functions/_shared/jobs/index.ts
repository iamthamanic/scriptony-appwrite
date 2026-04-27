/**
 * Jobs Module — Shared Worker Helpers
 *
 * T14: Active exports sind types + jobWorker (Node-kompatibel).
 * jobService + jobRunner sind @deprecated (Deno-only, broken in Node).
 * Sie werden hier nicht mehr exportiert.
 *
 * Worker-Functions nutzen jobWorker für Progress-Reporting.
 * Job-Control-Plane: scriptony-jobs (Node.js).
 * Job-Schema: docs/job-schema.md
 */

export type {
  Job,
  JobCreateRequest,
  JobStatus,
  JobStatusResponse,
} from "./types.ts";

export {
  completeJob,
  extractJobContext,
  failJob,
  reportJobProgress,
  stripJobFields,
  wrapWithJobReporting,
} from "./jobWorker.ts";
