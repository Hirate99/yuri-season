import { sql, type SQLWrapper } from "drizzle-orm";

const UTC_ISO_FORMAT = "%Y-%m-%dT%H:%M:%fZ";

export function utcInstant(value: SQLWrapper) {
  return sql<string>`strftime(${UTC_ISO_FORMAT}, ${value})`;
}

export function nullableUtcInstant(value: SQLWrapper) {
  return sql<string | null>`strftime(${UTC_ISO_FORMAT}, ${value})`;
}
