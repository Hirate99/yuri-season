import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "@/pages/admin-page";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "管理后台 · YuriSeason" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminPage,
});
