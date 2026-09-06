const PUBLIC_MEDIA_ORIGIN = "https://r2.i-yuri.com";

export function publicMediaUrl(key: string): string | null {
  const parts = key.replace(/^\/+/, "").split("/");

  if (parts.length === 0 || parts.some((part) => !part || part === "." || part === ".."))
    return null;

  return `${PUBLIC_MEDIA_ORIGIN}/${parts.map(encodeURIComponent).join("/")}`;
}

export function bangumiCoverUrl(url: string | null, width: 100 | 200 | 400): string | null {
  if (!url) return null;

  return url.replace(
    /^https:\/\/lain\.bgm\.tv\/r\/\d+\/pic\/cover\//,
    `https://lain.bgm.tv/r/${width}/pic/cover/`,
  );
}
