import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/pages/calendar-page";
import { loadCalendarData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";

export const Route = createFileRoute("/calendar")({
  staleTime: 120_000,
  loader: (loaderContext) => loadCalendarData({ serverContext: serverContextFromLoader(loaderContext) }),
  head: () => ({ meta: [{ title: "放送日历 · YuriSeason" }] }),
  component: CalendarRoute,
});

function CalendarRoute() {
  return <CalendarPage data={Route.useLoaderData()} />;
}
