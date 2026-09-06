import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { ViewerTimeZoneContext, useDetectedViewerTimeZone } from "@/hooks/use-viewer-timezone";
import { BrandMark } from "./brand-mark";
import { authClient } from "@/features/community/auth-client";

const nav = [
  { to: "/", label: "当季", exact: true },
  { to: "/calendar", label: "日历", exact: false },
  { to: "/feed", label: "情报", exact: false },
  { to: "/seasons", label: "季度", exact: false },
] as const;

function AccountLink() {
  const { data: session } = authClient.useSession();
  const name = session?.user.name || "我的账号";
  return <Link to="/account" title={name} className="max-w-28 truncate justify-self-end rounded-full bg-raised px-3 py-2 text-xs font-semibold text-muted hover:text-accent sm:max-w-44">{name}</Link>;
}

function Navigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav
      className={mobile
        ? "fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
        : "hidden h-full items-stretch md:flex"
      }
      aria-label={mobile ? "移动端主导航" : "主导航"}
    >
      {nav.map((item) => (
        <Link
          key={item.to}
          to={item.to}
          activeOptions={{ exact: item.exact }}
          className={mobile
            ? "relative grid h-14 place-items-center text-sm text-muted"
            : "relative grid place-items-center px-4 text-sm font-medium text-muted transition hover:text-ink"
          }
          activeProps={{ className: mobile
            ? "!text-accent font-semibold after:absolute after:top-0 after:h-0.5 after:w-5 after:bg-accent"
            : "!text-ink after:absolute after:bottom-3 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-accent"
          }}
        >{item.label}</Link>
      ))}
    </nav>
  );
}

export function AppShell() {
  const viewerTimeZone = useDetectedViewerTimeZone();
  const isAdmin = useRouterState({
    select: (state) => state.location.pathname === "/admin" || state.location.pathname.startsWith("/admin/"),
  });

  if (isAdmin) return <main className="min-h-screen bg-[#f7f8fa]"><Outlet /></main>;

  return (
    <ViewerTimeZoneContext.Provider value={viewerTimeZone}>
      <div className="min-h-screen">
        <header className="sticky top-0 z-30 h-15 border-b border-black/[0.05] bg-white/80 backdrop-blur-2xl md:h-16">
          <div className="mx-auto grid h-full w-[calc(100%-1.5rem)] max-w-[1320px] grid-cols-[1fr_auto] items-center md:w-[calc(100%-3rem)] md:grid-cols-[1fr_auto_1fr]">
            <Link to="/" className="inline-flex w-max items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-[#25242b]" aria-label="YuriSeason 首页"><BrandMark className="size-7 text-[#786bd1]" /><span>YuriSeason</span></Link>
            <Navigation />
            <AccountLink />
          </div>
        </header>
        <Navigation mobile />
        <main><Outlet /></main>
      </div>
    </ViewerTimeZoneContext.Provider>
  );
}
