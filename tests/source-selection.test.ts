import { describe, expect, test } from "bun:test";
import { rotatingSourceSelection } from "../scripts/lib/source-selection";

describe("source selection budget", () => {
  test("rotates deterministically without exceeding the 20-source budget", () => {
    const sources = Array.from({ length: 28 }, (_, index) => ({
      id: `source-${String(index + 1).padStart(2, "0")}`,
    }));
    const first = rotatingSourceSelection(sources, undefined, 20);
    const second = rotatingSourceSelection(sources, first.cursor, 20);
    expect(first.selected).toHaveLength(20);
    expect(first.remaining).toBe(8);
    expect(second.selected[0].id).toBe("source-21");
    expect(second.selected.at(-1)?.id).toBe("source-12");
  });
});
