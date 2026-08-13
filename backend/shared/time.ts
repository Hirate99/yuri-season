export function canonicalInstant(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new RangeError(`Invalid instant: ${value}`);
  return new Date(timestamp).toISOString();
}

export function canonicalTemporal(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : canonicalInstant(value);
}
