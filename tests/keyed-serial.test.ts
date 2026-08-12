import { describe, expect, test } from "bun:test";
import { keyedSerial } from "../scripts/lib/keyed-serial";

describe("keyed serial execution", () => {
  test("serializes the same host without blocking another host", async () => {
    const run = keyedSerial();
    const order: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });

    const first = run("same.example", async () => {
      order.push("first-start");
      await firstGate;
      order.push("first-end");
    });
    const second = run("same.example", async () => { order.push("second"); });
    const other = run("other.example", async () => { order.push("other"); });

    await other;
    expect(order).toEqual(["first-start", "other"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual(["first-start", "other", "first-end", "second"]);
  });
});
