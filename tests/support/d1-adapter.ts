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

  async raw<T = unknown[]>(): Promise<T[]> {
    return this.database.query(this.sql).values(...this.bindings as SQLQueryBindings[]) as T[];
  }

  run() {
    const result = this.database.query(this.sql).run(...this.bindings as SQLQueryBindings[]);
    return Promise.resolve({ success: true, meta: { changes: result.changes } });
  }

  batchResult() {
    if (/^\s*(?:SELECT|WITH|PRAGMA|EXPLAIN)\b/i.test(this.sql)) {
      const results = this.database.query(this.sql).all(...this.bindings as SQLQueryBindings[]);
      return { results, success: true, meta: { changes: 0 } };
    }
    const result = this.database.query(this.sql).run(...this.bindings as SQLQueryBindings[]);
    return { results: [], success: true, meta: { changes: result.changes } };
  }
}

export class TestD1 {
  readonly sqlite = new Database(":memory:", { strict: true });
  preparedStatements = 0;

  prepare(sql: string): D1PreparedStatement {
    this.preparedStatements += 1;
    return new TestStatement(this.sqlite, sql) as unknown as D1PreparedStatement;
  }

  resetMetrics(): void {
    this.preparedStatements = 0;
  }

  async batch(statements: D1PreparedStatement[]) {
    const results = this.sqlite.transaction(() => statements.map((statement) =>
      (statement as unknown as TestStatement).batchResult()))();
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
