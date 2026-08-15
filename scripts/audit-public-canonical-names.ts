import { createApiClient, rpcData } from "@/lib/rpc";

const publicApi = createApiClient("https://i-yuri.com");
const feed = await rpcData(publicApi.api.feed.$get({ query: { limit: "80" } }));
const requestedUrls = new Set(process.argv.slice(2));
const conflictPatterns = [
  /再见[，,]?拉拉/u,
  /微速前进/u,
  /奈叶\s*EXGV/u,
  /Grow Up Show/u,
  /不才恶女/u,
  /株式会社魔法少女|魔法少女公司/u,
  /这漫画画了会死/u,
  /中山真中|中山真奈香/u,
  /鎌倉有那/u,
  /千石ユノ/u,
  /夢限大みゅーたいぷ/u,
  /对战谢谢/u,
];
const conflictOnly = requestedUrls.delete("--conflicts");
const selected = requestedUrls.size > 0 ? feed.items.filter((item) => requestedUrls.has(item.url)) : feed.items;
const items = conflictOnly
  ? selected.filter((item) => conflictPatterns.some((pattern) => pattern.test(`${item.title}\n${item.summary}`)))
  : selected;
const rows = await Promise.all(items.map(async (item) => {
  const detail = await rpcData(publicApi.api.updates[":id"].$get({ param: { id: item.id } }));
  return {
    id: item.id,
    animeId: item.animeId,
    animeTitle: item.animeTitle,
    personName: item.personName,
    characterName: item.characterName,
    title: item.title,
    summary: item.summary,
    url: item.url,
    media: item.media,
    publicText: detail.document?.publicText ?? null,
    publicTranslation: detail.document?.publicTranslation ?? null,
  };
}));

process.stdout.write(JSON.stringify(rows, null, 2));
