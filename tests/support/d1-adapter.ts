import { Database, type SQLQueryBindings } from "bun:sqlite";

class TestStatement {
  private bindings: unknown[] = [];

  constructor(
    private readonly database: Database,
    private readonly sql: string,
    private readonly onExecute: () => void,
  ) {}

  bind(...values: unknown[]): TestStatement {
    if (values.length > 100) throw new RangeError("D1 allows at most 100 bound parameters per query");
    this.bindings = values;
    return this;
  }

  async first<T = Record<string, unknown>>(column?: string): Promise<T | null> {
    this.onExecute();
    const row = this.database.query(this.sql).get(...this.bindings as SQLQueryBindings[]) as Record<string, unknown> | null;
    if (!row) return null;
    return (column ? row[column] : row) as T;
  }

  async all<T = Record<string, unknown>>() {
    this.onExecute();
    const results = this.database.query(this.sql).all(...this.bindings as SQLQueryBindings[]) as T[];
    return { results, success: true, meta: { changes: 0 } };
  }

  async raw<T = unknown[]>(): Promise<T[]> {
    this.onExecute();
    return this.database.query(this.sql).values(...this.bindings as SQLQueryBindings[]) as T[];
  }

  run() {
    this.onExecute();
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
  statements: string[] = [];
  calls = 0;
  executedStatements = 0;

  prepare(sql: string): D1PreparedStatement {
    this.preparedStatements += 1;
    this.statements.push(sql);
    return new TestStatement(this.sqlite, sql, () => {
      this.calls += 1;
      this.executedStatements += 1;
    }) as unknown as D1PreparedStatement;
  }

  resetMetrics(): void {
    this.preparedStatements = 0;
    this.statements = [];
    this.calls = 0;
    this.executedStatements = 0;
  }

  async batch(statements: D1PreparedStatement[]) {
    this.calls += 1;
    this.executedStatements += statements.length;
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
