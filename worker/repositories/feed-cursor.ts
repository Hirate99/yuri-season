import { HttpError } from "../http";

export type FeedCursor = {
  pinned: 0 | 1;
  publishedAt: string;
  id: string;
};

export function encodeFeedCursor(cursor: FeedCursor): string {
  return btoa(JSON.stringify(cursor)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function decodeFeedCursor(value: string): FeedCursor {
  try {
    const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
    const parsed = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="))) as Partial<FeedCursor>;
    if ((parsed.pinned !== 0 && parsed.pinned !== 1) ||
      typeof parsed.publishedAt !== "string" || parsed.publishedAt.length > 80 ||
      typeof parsed.id !== "string" || !parsed.id || parsed.id.length > 160) {
      throw new Error("invalid cursor payload");
    }
    return parsed as FeedCursor;
  } catch {
    throw new HttpError(400, "分页位置已失效，请从第一页重新打开。");
  }
}
