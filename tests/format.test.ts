import { describe, expect, test } from "bun:test";
import { dateTime, shortDate, yuriDisplayLabel, yuriLabel } from "@/lib/format";

describe("event date formatting", () => {
  test("uses the event timezone instead of the viewer timezone", () => {
    const instant = "2026-09-24T15:00:00Z";
    expect(shortDate(instant, "Asia/Tokyo")).toBe("9月25日");
    expect(shortDate(instant, "America/Los_Angeles")).toBe("9月24日");
  });

  test("keeps date-only values stable", () => {
    expect(shortDate("2026-09-25", "Asia/Tokyo")).toBe("9月25日");
  });

  test("does not invent a local time for a date-only feed item", () => {
    expect(dateTime("2026-08-10")).toBe("8月10日");
  });

  test("renders every feed instant in the requested viewer timezone", () => {
    expect(dateTime("2026-08-14T06:48:00.000Z", "America/Los_Angeles"))
      .toBe("8月13日 23:48");
  });
});

describe("public content labels", () => {
  test("uses short editorial labels instead of internal taxonomy", () => {
    expect(yuriLabel("canon")).toBe("百合");
    expect(yuriLabel("strong")).toBe("关系向");
    expect(yuriLabel("adjacent")).toBe("女性群像");
  });

  test("shows unresolved classifications as an observation state", () => {
    expect(yuriDisplayLabel("strong", "pending")).toBe("观察中");
  });
});
