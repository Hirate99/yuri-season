import { HeadContent, Link, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import appCss from "@/styles/app.css?url";
import type { RouterContext } from "@/router-context";

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#ffffff" },
      { name: "description", content: "当季百合动画、放送日历、Staff、声优动态与社区讨论索引。" },
      { title: "YuriSeason" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  component: AppShell,
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <p className="text-sm font-semibold text-accent">404</p>
      <h1 className="mt-3 text-3xl font-bold">没有找到这个页面</h1>
      <p className="mt-4 text-sm leading-7 text-muted">链接可能已失效，或这条内容已撤回。</p>
      <div className="mt-8 flex justify-center gap-6 text-sm font-semibold text-accent">
        <Link to="/">返回片单</Link><Link to="/feed">查看情报</Link>
      </div>
    </div>
  ),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}
