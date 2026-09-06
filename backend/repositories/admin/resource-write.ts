import type { BatchItem } from "drizzle-orm/batch";

export type ResourceAudit = (resourceId: string) => BatchItem<"sqlite">;
export type ResourceChangeAudit = (before: unknown) => BatchItem<"sqlite">;
