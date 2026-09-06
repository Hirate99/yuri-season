export function canonicalInstant(value: string): string {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) throw new RangeError(`Invalid instant: ${value}`);

  return new Date(timestamp).toISOString();
}

export function canonicalTemporal(value: string): string {
  // 纯日期没有时区含义，保留原值，避免转为 UTC 后在读者当地跨日。
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : canonicalInstant(value);
}
