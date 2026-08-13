import type { BatchItem } from "drizzle-orm/batch";

export type ResourceAudit = (resourceId: string) => BatchItem<"sqlite">;
