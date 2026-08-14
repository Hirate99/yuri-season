const PUBLIC_MEDIA_ORIGIN = "https://r2.i-yuri.com";

export function publicMediaUrl(key: string): string | null {
  const parts = key.replace(/^\/+/, "").split("/");
  if (parts.length === 0 || parts.some((part) => !part || part === "." || part === "..")) return null;
  return `${PUBLIC_MEDIA_ORIGIN}/${parts.map(encodeURIComponent).join("/")}`;
}
