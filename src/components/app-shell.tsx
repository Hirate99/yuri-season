import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { BrandMark } from "./brand-mark";

const nav = [
  { to: "/", label: "当季", exact: true },
  { to: "/calendar", label: "日历", exact: false },
  { to: "/feed", label: "情报", exact: false },
  { to: "/seasons", label: "季度", exact: false },
] as const;

function Navigation({ mobile = false }: { mobile?: boolean }) {
  return (
    <nav
      className={mobile
        ? "fixed inset-x-3 bottom-3 z-30 grid h-14 grid-cols-4 rounded-2xl border border-black/[0.06] bg-white/85 shadow-[0_16px_45px_rgba(15,23,42,0.14)] backdrop-blur-2xl md:hidden"
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
            ? "grid place-items-center text-xs text-muted"
            : "relative grid place-items-center px-4 text-xs font-medium text-muted transition hover:text-ink"
          }
          activeProps={{ className: mobile
            ? "!text-ink font-semibold"
            : "!text-ink after:absolute after:bottom-3 after:left-1/2 after:size-1 after:-translate-x-1/2 after:rounded-full after:bg-signal-coral"
          }}
        >{item.label}</Link>
      ))}
    </nav>
  );
}

export function AppShell() {
  const isAdmin = useRouterState({
    select: (state) => state.location.pathname === "/admin" || state.location.pathname.startsWith("/admin/"),
  });

  if (isAdmin) return <main className="min-h-screen bg-[#f7f8fa]"><Outlet /></main>;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 h-15 border-b border-black/[0.05] bg-white/80 backdrop-blur-2xl md:h-16">
        <div className="mx-auto grid h-full w-[calc(100%-1.5rem)] max-w-[1320px] grid-cols-[1fr_auto] items-center md:w-[calc(100%-3rem)] md:grid-cols-[1fr_auto_1fr]">
          <Link to="/" className="inline-flex w-max items-center gap-2 text-[15px] font-semibold tracking-[-0.02em] text-[#25242b]" aria-label="YuriSeason 首页"><BrandMark className="size-7 text-[#786bd1]" /><span>YuriSeason</span></Link>
          <Navigation />
          <div className="hidden md:block" aria-hidden="true" />
        </div>
      </header>
      <Navigation mobile />
      <main><Outlet /></main>
    </div>
  );
}
