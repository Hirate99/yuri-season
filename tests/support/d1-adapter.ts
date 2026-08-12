import { Database, type SQLQueryBindings } from "bun:sqlite";

class TestStatement {
  private bindings: unknown[] = [];

  constructor(
    private readonly database: Database,
    private readonly sql: string,
  ) {}

  bind(...values: unknown[]): TestStatement {
    this.bindings = values;
    return this;
  }

  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    const row = this.database.query(this.sql).get(...this.bindings as SQLQueryBindings[]) as Record<string, unknown> | null;
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async all<T = Record<string, unknown>>() {
    const results = this.database.query(this.sql).all(...this.bindings as SQLQueryBindings[]) as T[];
    return { results, success: true, meta: { changes: 0 } };
  }

  async run() {
    const result = this.database.query(this.sql).run(...this.bindings as SQLQueryBindings[]);
    return { success: true, meta: { changes: result.changes } };
  }
}

export class TestD1 {
  readonly sqlite = new Database(":memory:", { strict: true });

  prepare(sql: string): D1PreparedStatement {
    return new TestStatement(this.sqlite, sql) as unknown as D1PreparedStatement;
  }

  async batch(statements: D1PreparedStatement[]) {
    const results = [];
    for (const statement of statements) results.push(await statement.run());
    return results;
  }

  exec(sql: string): void {
    this.sqlite.exec(sql);
  }

  close(): void {
    this.sqlite.close();
  }

  binding(): D1Database {
    return this as unknown as D1Database;
  }
}
