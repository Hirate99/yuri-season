/**
 * Runs a write set as one D1 transaction.
 *
 * D1's batch API executes statements sequentially and rolls the entire batch
 * back when any statement fails. Keep reads and unrelated bulk work out of
 * this helper so the call site communicates a real business invariant.
 */
export function atomicBatch(
  db: D1Database,
  statements: D1PreparedStatement[],
): Promise<D1Result[]> {
  if (statements.length === 0) {
    throw new RangeError("an atomic write requires at least one statement");
  }
  return db.batch(statements);
}
