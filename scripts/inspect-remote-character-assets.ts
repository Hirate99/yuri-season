const sourceUrls = process.argv.slice(2).filter((arg) => !arg.startsWith("--keyword="));
const keywords = process.argv.slice(2)
  .filter((arg) => arg.startsWith("--keyword="))
  .map((arg) => arg.slice("--keyword=".length).toLowerCase());

if (sourceUrls.length === 0) {
  throw new Error("Usage: bun scripts/inspect-remote-character-assets.ts <url> [--keyword=value]");
}

function absolute(base: string, value: string): string | null {
  try { return new URL(value.replaceAll("\\/", "/"), base).href; } catch { return null; }
}

for (const sourceUrl of sourceUrls) {
  const response = await fetch(sourceUrl, { headers: { "user-agent": "Mozilla/5.0" } });
  const body = await response.text();
  const assets = [...new Set(
    [...body.matchAll(/(?<asset>(?:https?:)?(?:\\?\/[\w@%+~.,()\-]+)+\.(?:avif|gif|jpe?g|png|svg|webp)(?:\?[^"'`\s),;}]*)?)/gi)]
      .map((match) => match.groups?.asset)
      .filter((value): value is string => Boolean(value))
      .map((value) => absolute(sourceUrl, value))
      .filter((value): value is string => Boolean(value)),
  )].filter((url) => keywords.length === 0 || keywords.some((keyword) => url.toLowerCase().includes(keyword)));

  const contexts = keywords.flatMap((keyword) => {
    const results: string[] = [];
    let cursor = 0;
    while (results.length < 20) {
      const index = body.toLowerCase().indexOf(keyword, cursor);
      if (index < 0) break;
      results.push(body.slice(Math.max(0, index - 180), Math.min(body.length, index + keyword.length + 260))
        .replaceAll(/\s+/g, " "));
      cursor = index + keyword.length;
    }
    return results.map((context) => ({ keyword, context }));
  });

  console.log(JSON.stringify({ sourceUrl, status: response.status, bytes: body.length, assets, contexts }, null, 2));
}
