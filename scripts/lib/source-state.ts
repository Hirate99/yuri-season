export type FingerprintedItem = { contentHash: string };
export type VersionedSourceState = { normalizerVersion?: string };

export function isReusableSourceState(
  previous: VersionedSourceState | undefined,
  sourceType: string,
  currentNormalizerVersion: string,
): boolean {
  if (!previous) return false;
  if (previous.normalizerVersion === currentNormalizerVersion) return true;

  return previous.normalizerVersion === undefined && sourceType !== "community";
}

export function changedItems<T extends FingerprintedItem>(
  previousHashes: string[] | undefined,
  currentItems: T[],
): T[] {
  if (!previousHashes) return [];

  const previous = new Set(previousHashes);

  return currentItems.filter((item) => !previous.has(item.contentHash));
}
