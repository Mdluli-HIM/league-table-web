"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CircleDot,
  LayoutDashboard,
  ListOrdered,
  Loader2,
  LogOut,
  Menu,
  Settings,
  Shield,
  Trophy,
  UserRound,
  UsersRound,
  X,
  type LucideIcon,
} from "lucide-react";

type AdminNavKey =
  | "dashboard"
  | "clubs"
  | "players"
  | "competitions"
  | "fixtures"
  | "results"
  | "standings"
  | "settings";

type AdminShellProps = {
  children: ReactNode;
  activeKey: AdminNavKey;
  title: string;
  description: string;
};

type AdminNavItem = {
  key: AdminNavKey;
  label: string;
  href: string;
  icon: LucideIcon;
};

const adminNavItems: AdminNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    key: "clubs",
    label: "Clubs",
    href: "/admin/clubs",
    icon: UsersRound,
  },
  {
    key: "players",
    label: "Players",
    href: "/admin/players",
    icon: UserRound,
  },
  {
    key: "competitions",
    label: "Competitions",
    href: "/admin/competitions",
    icon: Trophy,
  },
  {
    key: "fixtures",
    label: "Fixtures",
    href: "/admin/fixtures",
    icon: CalendarDays,
  },
  {
    key: "results",
    label: "Results",
    href: "/admin/results",
    icon: CircleDot,
  },
  {
    key: "standings",
    label: "Standings",
    href: "/admin/standings",
    icon: ListOrdered,
  },
  {
    key: "settings",
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
  },
];

export function AdminShell({
  children,
  activeKey,
  title,
  description,
}: AdminShellProps) {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = window.localStorage.getItem("league_admin_token");

    if (!token) {
      router.replace("/admin/login");
      return;
    }

    const readyTimer = window.setTimeout(() => {
      setIsReady(true);
    }, 0);

    return () => {
      window.clearTimeout(readyTimer);
    };
  }, [router]);

  function handleLogout() {
    window.localStorage.removeItem("league_admin_token");
    window.localStorage.removeItem("league_admin_user");
    router.replace("/admin/login");
  }

  if (!isReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#07110f] text-white">
        <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
          <Loader2 className="animate-spin" size={18} />
          Checking admin access
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#07110f] text-white">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute left-[-120px] top-[-120px] h-[420px] w-[420px] rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="absolute right-[-140px] top-[20px] h-[420px] w-[420px] rounded-full bg-cyan-400/10 blur-3xl" />
      </div>

      <div className="relative flex min-h-screen">
        <aside className="hidden w-[280px] border-r border-white/10 bg-white/[0.03] p-5 backdrop-blur-xl lg:flex lg:flex-col">
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
              <Shield size={22} />
            </div>

            <div>
              <p className="text-lg font-black tracking-[-0.05em]">
                LeagueAdmin
              </p>
              <p className="text-xs font-bold text-white/40">
                Management console
              </p>
            </div>
          </Link>

          <nav className="mt-9 space-y-2">
            {adminNavItems.map((item) => {
              const Icon = item.icon;
              const active = item.key === activeKey;

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${
                    active
                      ? "bg-emerald-400 text-[#07110f] shadow-lg shadow-emerald-500/10"
                      : "text-white/60 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-3xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300/70">
              Admin mode
            </p>
            <p className="mt-2 text-sm font-bold text-white/70">
              Super admin access
            </p>

            <button
              onClick={handleLogout}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white/8 text-sm font-black text-white transition hover:bg-red-500/20 hover:text-red-200"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-white/10 bg-[#07110f]/80 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                  Admin console
                </p>
                <h1 className="mt-1 truncate text-2xl font-black tracking-[-0.05em] sm:text-3xl">
                  {title}
                </h1>
                <p className="mt-1 hidden text-sm font-semibold text-white/45 sm:block">
                  {description}
                </p>
              </div>

              <button
                onClick={() => setMobileMenuOpen(true)}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/8 text-white lg:hidden"
              >
                <Menu size={20} />
              </button>
            </div>
          </header>

          <section className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
            {children}
          </section>
        </div>
      </div>

      {mobileMenuOpen ? (
        <div className="fixed inset-0 z-50 bg-black/70 p-3 backdrop-blur-sm lg:hidden">
          <div className="flex h-full flex-col rounded-[2rem] border border-white/10 bg-[#0b1714] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <Link
                href="/admin/dashboard"
                className="text-lg font-black tracking-[-0.05em]"
                onClick={() => setMobileMenuOpen(false)}
              >
                LeagueAdmin
              </Link>

              <button
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/8"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="mt-8 space-y-2">
              {adminNavItems.map((item) => {
                const Icon = item.icon;
                const active = item.key === activeKey;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${
                      active
                        ? "bg-emerald-400 text-[#07110f]"
                        : "text-white/60 hover:bg-white/7 hover:text-white"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-auto flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white/8 text-sm font-black text-white"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
