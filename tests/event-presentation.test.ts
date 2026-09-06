import { describe, expect, test } from "bun:test";
import { eventTitle } from "@/lib/event-presentation";

describe("eventTitle", () => {
  test("leaves the birthday category to the badge", () => {
    expect(eventTitle({ eventType: "birthday", title: "五十土五十铃生日" })).toBe("五十土五十铃");
    expect(eventTitle({ eventType: "birthday", title: "五十土五十铃 · 生日 " })).toBe(
      "五十土五十铃",
    );
  });

  test("does not rewrite other event titles", () => {
    expect(eventTitle({ eventType: "event", title: "奈叶 EXCEEDS × 东京钱汤" })).toBe(
      "奈叶 EXCEEDS × 东京钱汤",
    );
  });
});
