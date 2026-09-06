const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

export function weekdayLabel(day: number): string {
  return WEEKDAYS[day] ?? "待定";
}

export function shortDate(value: string | null, timeZone?: string): string {
  if (!value) return "时间待定";

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${Number(dateOnly[2])}月${Number(dateOnly[3])}日`;

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;

  try {
    return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric", timeZone }).format(
      date,
    );
  } catch {
    return new Intl.DateTimeFormat("zh-CN", { month: "short", day: "numeric" }).format(date);
  }
}

export function dateTime(value: string | null, timeZone?: string): string {
  if (!value) return "时间待定";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return shortDate(value);

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;

  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);
}

export function relativeTime(value: string | null): string {
  if (!value) return "尚未检查";

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;

  const delta = date.valueOf() - Date.now();
  const formatter = new Intl.RelativeTimeFormat("zh-CN", { numeric: "auto" });
  const abs = Math.abs(delta);
  if (abs < 3_600_000) return formatter.format(Math.round(delta / 60_000), "minute");
  if (abs < 86_400_000) return formatter.format(Math.round(delta / 3_600_000), "hour");

  return formatter.format(Math.round(delta / 86_400_000), "day");
}

export function yuriLabel(kind: "canon" | "strong" | "adjacent"): string {
  return kind === "canon" ? "百合" : kind === "strong" ? "关系向" : "女性群像";
}

export function yuriDisplayLabel(
  kind: "canon" | "strong" | "adjacent",
  status: "confirmed" | "pending",
): string {
  return status === "pending" ? "观察中" : yuriLabel(kind);
}

export function contentLabel(value: string): string {
  const labels: Record<string, string> = {
    schedule: "放送",
    official_news: "公式消息",
    official_art: "公式视觉",
    creator_art: "作者 / Staff 绘图",
    birthday: "角色生日",
    cast_post: "声优动态",
    staff_post: "Staff 动态",
    fanwork: "同人精选",
    community_thread: "集中讨论",
    editorial: "编辑观察",
  };

  return labels[value] ?? value;
}
