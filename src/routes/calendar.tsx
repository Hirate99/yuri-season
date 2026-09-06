import { createFileRoute } from "@tanstack/react-router";
import { CalendarPage } from "@/pages/calendar-page";
import { loadCalendarData } from "@/lib/public-loaders";
import { serverContextFromLoader } from "@/server-context";
import { seoHead } from "@/lib/seo";
import { calendarDescription } from "@/lib/seo-descriptions";

export const Route = createFileRoute("/calendar")({
  staleTime: 120_000,
  loader: (loaderContext) =>
    loadCalendarData({ serverContext: serverContextFromLoader(loaderContext) }),
  head: ({ loaderData }) =>
    seoHead({
      title: "放送日历",
      description: loaderData ? calendarDescription(loaderData) : undefined,
      path: "/calendar",
    }),
  component: CalendarRoute,
});

function CalendarRoute() {
  return <CalendarPage data={Route.useLoaderData()} />;
}
