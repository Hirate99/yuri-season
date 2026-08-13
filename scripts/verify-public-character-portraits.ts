import { createApiClient, rpcData } from "@/lib/rpc";

const publicApi = createApiClient("https://i-yuri.com");

const checks = [
  { slug: "dodge-danko", expectedPortraits: 7, style: "object-position:50% 20%" },
  { slug: "kore-kaite-shine", expectedPortraits: 5, style: "object-position:left center" },
];

const results = await Promise.all(checks.map(async (check) => {
  const [pageResponse, apiResponse] = await Promise.all([
    fetch(`https://i-yuri.com/anime/${check.slug}`),
    publicApi.api.anime[":slug"].$get({ param: { slug: check.slug } }),
  ]);
  const page = await pageResponse.text();
  const detail = await rpcData(apiResponse);
  return {
    slug: check.slug,
    pageStatus: pageResponse.status,
    apiStatus: apiResponse.status,
    portraitCount: detail.anime.cast.filter((credit) => credit.portraitUrl).length,
    focusRuleRendered: page.includes(check.style),
  };
}));

const failed = results.filter((result, index) => result.pageStatus !== 200
  || result.apiStatus !== 200
  || result.portraitCount !== checks[index]?.expectedPortraits
  || !result.focusRuleRendered);
console.log(JSON.stringify(results, null, 2));
if (failed.length > 0) throw new Error(`Public portrait verification failed: ${JSON.stringify(failed)}`);
