import { describe, expect, test } from "bun:test";

import { offsetDateTime, temporal } from "~/http/input/schema";
import { canonicalInstant } from "~/shared/time";

describe("backend instant canonicalization", () => {
  test("normalizes equivalent offsets to one sortable UTC representation", () => {
    expect(canonicalInstant("2026-08-13T01:30:00-07:00")).toBe("2026-08-13T08:30:00.000Z");
    expect(offsetDateTime("publishedAt").parse("2026-08-13T17:30:00+09:00")).toBe(
      "2026-08-13T08:30:00.000Z",
    );
  });

  test("preserves date-only event values while normalizing instants", () => {
    expect(temporal("startsAt").parse("2026-08-13")).toBe("2026-08-13");
    expect(temporal("startsAt").parse("2026-08-13T17:30:00+09:00")).toBe(
      "2026-08-13T08:30:00.000Z",
    );
  });
});
