import { createFileRoute } from "@tanstack/react-router";
import { SeasonsPage } from "@/pages/seasons-page";
import { loadSeasonsData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";

export const Route = createFileRoute("/seasons")({
  loader: (loaderContext) => loadSeasonsData({ serverContext: serverContextFromLoader(loaderContext) }),
  component: SeasonsRoute,
});

function SeasonsRoute() {
  return <SeasonsPage data={Route.useLoaderData()} />;
}
