import type { CalendarEvent } from "@/domain";

type BadgeTone = "neutral" | "rose" | "lime" | "amber" | "blue" | "violet";

const presentations: Record<CalendarEvent["eventType"], { label: string; tone: BadgeTone }> = {
  broadcast: { label: "首播", tone: "blue" },
  birthday: { label: "生日", tone: "rose" },
  anniversary: { label: "纪念日", tone: "violet" },
  stream: { label: "直播", tone: "lime" },
  radio: { label: "广播", tone: "amber" },
  event: { label: "活动", tone: "neutral" },
  release: { label: "发售", tone: "violet" },
};

export function eventPresentation(eventType: CalendarEvent["eventType"]) {
  return presentations[eventType];
}

export function eventTitle(event: Pick<CalendarEvent, "eventType" | "title">): string {
  if (event.eventType !== "birthday") return event.title;

  return event.title.replace(/[\s·・]*生日\s*$/u, "").trim();
}
