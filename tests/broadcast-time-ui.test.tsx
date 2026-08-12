import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { BroadcastTime } from "@/components/broadcast-time";

const slot = {
  weekday: 2,
  localTime: "23:00",
  timezone: "Asia/Tokyo",
};

describe("broadcast local-time layout", () => {
  test("reserves a local-time line before the viewer timezone is detected", () => {
    const html = renderToStaticMarkup(<BroadcastTime slot={slot} reserveLocalSpace />);

    expect(html).toContain("invisible");
    expect(html).toContain('aria-hidden="true"');
  });

  test("fills the reserved line when the viewer timezone is already known", () => {
    const html = renderToStaticMarkup(
      <BroadcastTime slot={slot} viewerTimeZone="America/Los_Angeles" reserveLocalSpace />,
    );

    expect(html).toContain("PDT");
    expect(html).not.toContain("invisible");
  });
});
