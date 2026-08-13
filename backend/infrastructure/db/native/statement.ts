export function nativeStatement(
  db: D1Database,
  query: string,
  bindings: readonly unknown[] = [],
): D1PreparedStatement {
  const prepared = db.prepare(query);
  return bindings.length > 0 ? prepared.bind(...bindings) : prepared;
}

export async function allRows<Row>(
  db: D1Database,
  query: string,
  bindings: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await nativeStatement(db, query, bindings).all<Row>();
  return result.results;
}

export function placeholders(count: number): string {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("placeholder count must be a positive integer");
  }
  return Array.from({ length: count }, () => "?").join(", ");
}
