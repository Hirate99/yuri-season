export type QueryDefinition<Row> = {
  readonly name: string;
  readonly text: string;
  readonly row?: Row;
};

export function defineQuery<Row>(name: string, text: string): QueryDefinition<Row> {
  return { name, text };
}

export function statement<Row>(
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

export async function runQuery<Row>(
  db: D1Database,
  query: QueryDefinition<Row>,
  bindings: readonly unknown[] = [],
): Promise<D1Result<unknown>> {
  return statement(db, query, bindings).run();
}

export function placeholders(count: number): string {
  if (!Number.isInteger(count) || count < 1) {
    throw new RangeError("placeholder count must be a positive integer");
  }
  return Array.from({ length: count }, () => "?").join(", ");
}
