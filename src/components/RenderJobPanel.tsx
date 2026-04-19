import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  useRenderJobs,
  useAcceptRenderJob,
  useRejectRenderJob,
} from "../hooks/useRenderJobs";
import type { RenderJob, RenderJobStatus, ReviewStatus } from "../lib/types";

const STATUS_CONFIG: Record<
  RenderJobStatus,
  { label: string; className: string }
> = {
  queued: { label: "Wartend", className: "bg-blue-100 text-blue-700" },
  executing: { label: "Läuft", className: "bg-yellow-100 text-yellow-700" },
  completed: { label: "Fertig", className: "bg-green-100 text-green-700" },
  failed: { label: "Fehlgeschlagen", className: "bg-red-100 text-red-700" },
};

const REVIEW_CONFIG: Record<
  ReviewStatus,
  { label: string; className: string; icon: typeof CheckCircle2 | null }
> = {
  pending: {
    label: "Offen",
    className: "bg-gray-100 text-gray-700",
    icon: Clock,
  },
  accepted: {
    label: "Akzeptiert",
    className: "bg-green-600 text-white",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Abgelehnt",
    className: "bg-red-100 text-red-700",
    icon: XCircle,
  },
};

function JobRow({
  job,
  onAccept,
  onReject,
  accepting,
  rejecting,
}: {
  job: RenderJob;
  onAccept: () => void;
  onReject: () => void;
  accepting: boolean;
  rejecting: boolean;
}) {
  const status = STATUS_CONFIG[job.status];
  const review = REVIEW_CONFIG[job.reviewStatus];
  const ReviewIcon = review.icon;
  const canReview =
    job.status === "completed" && job.reviewStatus === "pending";

  return (
    <div className="flex items-center gap-2 py-2 text-sm border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Badge className={status.className}>{status.label}</Badge>
          <Badge className={review.className}>
            {ReviewIcon && <ReviewIcon className="size-3" />}
            {review.label}
          </Badge>
          <span className="text-xs text-muted-foreground truncate">
            {job.type} / {job.jobClass}
          </span>
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          {new Date(job.createdAt).toLocaleString()}
          {job.completedAt &&
            ` → ${new Date(job.completedAt).toLocaleString()}`}
        </div>
      </div>
      {canReview && (
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="default"
            className="h-7 text-xs bg-green-600 hover:bg-green-700"
            onClick={onAccept}
            disabled={accepting || rejecting}
          >
            {accepting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <CheckCircle2 className="size-3" />
            )}
            Akzeptieren
          </Button>
          <Button
            size="sm"
            variant="destructive"
            className="h-7 text-xs"
            onClick={onReject}
            disabled={accepting || rejecting}
          >
            {rejecting ? (
              <Loader2 className="size-3 animate-spin" />
            ) : (
              <XCircle className="size-3" />
            )}
            Ablehnen
          </Button>
        </div>
      )}
    </div>
  );
}

export function RenderJobPanel({ shotId }: { shotId: string }) {
  const { data: jobs, isLoading, isError, refetch } = useRenderJobs(shotId);
  const acceptMutation = useAcceptRenderJob();
  const rejectMutation = useRejectRenderJob();
  const [collapsed, setCollapsed] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Render-Jobs laden...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-destructive">
        <XCircle className="size-4" />
        <span>Fehler beim Laden der Render-Jobs</span>
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-xs"
          onClick={() => refetch()}
        >
          Erneut versuchen
        </Button>
      </div>
    );
  }

  if (!jobs || jobs.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        Keine Render-Jobs fuer diesen Shot
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        className="flex items-center gap-1 text-sm font-medium w-full text-left"
        onClick={() => setCollapsed(!collapsed)}
      >
        <ChevronDown
          className={`size-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
        />
        Render-Jobs ({jobs.length})
      </button>
      {!collapsed && (
        <div>
          {jobs.map((job) => (
            <JobRow
              key={job.id}
              job={job}
              onAccept={() => acceptMutation.mutate(job.id)}
              onReject={() => rejectMutation.mutate(job.id)}
              accepting={acceptMutation.isPending}
              rejecting={rejectMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
