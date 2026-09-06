import { AdminLayout } from "@/features/admin/admin-layout";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "管理后台 · YuriSeason" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminLayout,
});
