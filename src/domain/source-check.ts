export type SourceCheckWrite = {
  sourceId: string;
  checkedAt: string;
  outcome: "success" | "failure";
  etag?: string | null;
  lastModified?: string | null;
  error?: string | null;
};
