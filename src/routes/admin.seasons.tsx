import { summaryQuery } from "@/features/admin/queries";
import { SeasonsEditor } from "@/features/admin/seasons-editor";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin/seasons")({ component: Seasons });

function Seasons() {
  const { data } = useQuery(summaryQuery);

  return data && <SeasonsEditor seasons={data.seasons} />;
}
