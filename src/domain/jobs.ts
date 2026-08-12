export type LocalJobOutcome = "completed" | "partial" | "failed";

export type LocalJobLease = {
  id: string;
  jobType: string;
  scopeType: string;
  scopeId: string | null;
  priority: number;
  attemptCount: number;
  maxAttempts: number;
  leaseUntil: string;
  leaseToken: string;
  budget: Record<string, unknown>;
  input: Record<string, unknown>;
};

export type LocalJobCompletion = {
  id: string;
  status: "completed" | "partial" | "retry" | "dead";
  duplicate: boolean;
  runId: string | null;
};
