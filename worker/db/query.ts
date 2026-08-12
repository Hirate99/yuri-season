export type QueryDefinition<Row> = {
  readonly text: string;
  readonly row?: Row;
};

export function defineQuery<Row>(text: string): QueryDefinition<Row> {
  return { text };
}

function statement<Row>(
  db: D1Database,
  query: QueryDefinition<Row>,
  bindings: readonly unknown[] = [],
): D1PreparedStatement {
  const prepared = db.prepare(query.text);
  return bindings.length > 0 ? prepared.bind(...bindings) : prepared;
}

export async function firstRow<Row>(
  db: D1Database,
  query: QueryDefinition<Row>,
  bindings: readonly unknown[] = [],
): Promise<Row | null> {
  return statement(db, query, bindings).first<Row>();
}

export async function allRows<Row>(
  db: D1Database,
  query: QueryDefinition<Row>,
  bindings: readonly unknown[] = [],
): Promise<Row[]> {
  const result = await statement(db, query, bindings).all<Row>();
  return result.results;
}

export function placeholders(count: number): string {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("placeholder count must be a positive integer");
  }
  return Array.from({ length: count }, () => "?").join(", ");
}
