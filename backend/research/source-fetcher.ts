import { normalizeSource } from "./connectors/normalize";
import type { FetchedSource, SourceRecord, SourceTransport } from "./types";

const MAX_SOURCE_BYTES = 256_000;

async function readTextLimited(response: Response): Promise<string> {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let size = 0;
  let text = "";
  try {
    while (size < MAX_SOURCE_BYTES) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = Math.min(value.byteLength, MAX_SOURCE_BYTES - size);
      text += decoder.decode(value.subarray(0, remaining), { stream: true });
      size += remaining;
    }
  } finally {
    if (size >= MAX_SOURCE_BYTES) await reader.cancel();
  }
  return text + decoder.decode();
}

export async function fetchSource(
  source: SourceRecord,
  transport: SourceTransport = (url, init) => fetch(url, init),
): Promise<FetchedSource> {
  const headers = new Headers({
    accept: "application/json, application/rss+xml, application/atom+xml, text/html;q=0.9, */*;q=0.5",
    "user-agent": "YuriSeasonRadar/0.1 (+https://github.com/haonan/yuri)",
  });
  if (source.etag) headers.set("if-none-match", source.etag);
  if (source.lastModified) headers.set("if-modified-since", source.lastModified);

  const response = await transport(source.url, { headers, signal: AbortSignal.timeout(15_000) });
  if (response.status === 304) {
    return { items: [], etag: source.etag, lastModified: source.lastModified, status: 304 };
  }
  if (!response.ok) throw new Error(`source returned ${response.status}`);
  const raw = await readTextLimited(response);
  const contentType = response.headers.get("content-type") ?? "text/html";
  return {
    items: await normalizeSource(raw, contentType, source),
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    status: response.status,
  };
}
