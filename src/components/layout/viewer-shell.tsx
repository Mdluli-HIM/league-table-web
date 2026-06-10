"use client";

import Link from "next/link";
import {
  CalendarDays,
  CircleDot,
  Home,
  ListOrdered,
  Trophy,
  UsersRound,
} from "lucide-react";
import type { ReactNode } from "react";

type ViewerNavKey =
  | "home"
  | "fixtures"
  | "results"
  | "table"
  | "clubs"
  | "competitions";

type ViewerShellProps = {
  children: ReactNode;
  activeKey?: ViewerNavKey;
  sidebarLabel?: string;
  sidebarValue?: string;
};

const sidebarNavItems = [
  { key: "home", label: "Home", href: "/", icon: Home },
  { key: "fixtures", label: "Fixtures", href: "/fixtures", icon: CalendarDays },
  { key: "results", label: "Results", href: "/results", icon: CircleDot },
  { key: "table", label: "Table", href: "/table", icon: ListOrdered },
  { key: "clubs", label: "Clubs", href: "/clubs", icon: UsersRound },
  {
    key: "competitions",
    label: "Competitions",
    href: "/competitions",
    icon: Trophy,
  },
] as const;

const bottomNavItems = [
  { key: "home", label: "Home", href: "/", icon: Home },
  { key: "fixtures", label: "Fixtures", href: "/fixtures", icon: CalendarDays },
  { key: "results", label: "Results", href: "/results", icon: CircleDot },
  { key: "table", label: "Table", href: "/table", icon: ListOrdered },
  { key: "clubs", label: "Clubs", href: "/clubs", icon: UsersRound },
] as const;

export function ViewerShell({
  children,
  activeKey = "home",
  sidebarLabel = "Viewer Mode",
  sidebarValue = "League centre",
}: ViewerShellProps) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#c7ddd9] text-[#10201c]">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -left-24 -top-32 h-[420px] w-[420px] rounded-full bg-[#0d8ee8]/70 blur-3xl" />
        <div className="absolute right-[-140px] top-[-80px] h-[420px] w-[420px] rounded-full bg-[#d9ddff]/80 blur-3xl" />
        <div className="absolute bottom-[-180px] left-1/3 h-[420px] w-[420px] rounded-full bg-white/50 blur-3xl" />
      </div>

      <section className="relative flex min-h-screen w-full items-start px-2 py-2 pb-28 sm:px-3 sm:py-3 lg:px-3 lg:py-3 lg:pb-3">
        <div className="grid min-h-[calc(100vh-1.5rem)] w-full gap-3 rounded-[1.75rem] border border-white/70 bg-white/35 p-3 shadow-2xl shadow-[#527a7a]/20 backdrop-blur-2xl sm:rounded-[2rem] sm:p-3 lg:grid-cols-[230px_minmax(0,1fr)] lg:p-4">
          <aside className="hidden rounded-[1.8rem] border border-white/40 bg-white/25 p-5 lg:flex lg:flex-col">
            <Link href="/" className="text-xl font-black tracking-[-0.05em]">
              League<span className="text-[#087f8c]">Centre</span>
            </Link>

            <nav className="mt-10 space-y-3">
              {sidebarNavItems.map((item) => {
                const Icon = item.icon;
                const active = item.key === activeKey;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold transition ${
                      active
                        ? "bg-gradient-to-r from-[#0891b2] to-[#0f766e] text-white shadow-lg shadow-cyan-900/10"
                        : "text-[#08736f] hover:bg-white/40"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-[#0f766e]/10 pt-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#08736f]/70">
                {sidebarLabel}
              </p>
              <p className="mt-2 text-sm font-bold">{sidebarValue}</p>
            </div>
          </aside>

          <div className="min-w-0 rounded-[1.6rem] bg-white/25 p-3 backdrop-blur-xl sm:p-4 lg:p-5">
            {children}
          </div>
        </div>
      </section>

      <nav className="fixed inset-x-3 bottom-3 z-20 rounded-[1.5rem] border border-white/70 bg-white/75 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeKey;

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-black ${
                  active ? "bg-[#087f8c] text-white" : "text-[#08736f]"
                }`}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
