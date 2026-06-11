"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowUpRight,
  Building2,
  CalendarDays,
  CheckCircle2,
  Database,
  FileText,
  Loader2,
  LogOut,
  Settings,
  Shield,
  Trophy,
  UsersRound,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { api } from "@/lib/api";

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type HealthResponse = {
  status?: string;
  uptime?: number;
  timestamp?: string;
  environment?: string;
};

type ManagementLink = {
  title: string;
  description: string;
  href: string;
  icon: typeof Trophy;
  accent: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getHealthFromResponse(value: unknown): HealthResponse {
  if (!isRecord(value)) {
    return {};
  }

  if (isRecord(value.data)) {
    return value.data as HealthResponse;
  }

  return value as HealthResponse;
}

function formatUptime(seconds?: number) {
  if (typeof seconds !== "number" || !Number.isFinite(seconds)) {
    return "Not available";
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function formatTimestamp(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function fetchHealth() {
  const possiblePaths = ["/health", "/public/health"];

  for (const path of possiblePaths) {
    try {
      const response = await api.get<ApiResponse<unknown>>(path);
      return getHealthFromResponse(response.data);
    } catch {
      // Try next endpoint.
    }
  }

  return {};
}

function handleLogout() {
  window.localStorage.removeItem("league_admin_token");
  window.localStorage.removeItem("league_admin_user");
  window.location.href = "/admin/login";
}

const managementLinks: ManagementLink[] = [
  {
    title: "Clubs",
    description: "Manage club records, active status and public club profiles.",
    href: "/admin/clubs",
    icon: Building2,
    accent: "text-emerald-300",
  },
  {
    title: "Players",
    description: "Create players and register them to clubs for a season.",
    href: "/admin/players",
    icon: UsersRound,
    accent: "text-cyan-300",
  },
  {
    title: "Competitions",
    description: "Create leagues, connect teams and manage competition data.",
    href: "/admin/competitions",
    icon: Trophy,
    accent: "text-yellow-200",
  },
  {
    title: "Fixtures",
    description: "Schedule matches, set venues and update match status.",
    href: "/admin/fixtures",
    icon: CalendarDays,
    accent: "text-violet-300",
  },
  {
    title: "Results",
    description: "Record final scores and keep the league table updated.",
    href: "/admin/results",
    icon: CheckCircle2,
    accent: "text-emerald-300",
  },
  {
    title: "Standings",
    description: "Review the generated league table from completed results.",
    href: "/admin/standings",
    icon: Activity,
    accent: "text-cyan-300",
  },
];

export default function AdminSettingsPage() {
  const healthQuery = useQuery({
    queryKey: ["admin-health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  const health = healthQuery.data ?? {};
  const apiStatus = health.status || "Unknown";
  const environment = health.environment || "Development";

  return (
    <AdminShell
      activeKey="settings"
      title="Settings"
      description="Manage admin tools, system status and workspace actions."
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <Settings size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            Admin Control
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
            League system settings.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            This screen gives the admin quick access to the main management
            areas, backend status and session controls.
          </p>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              System status
            </h2>

            <span className="rounded-full bg-emerald-400/10 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
              API
            </span>
          </div>

          {healthQuery.isLoading ? (
            <div className="mt-5 flex min-h-[180px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
                <Loader2 className="animate-spin" size={18} />
                Checking backend
              </div>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <Activity size={21} className="text-emerald-300" />
                <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                  {apiStatus}
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                  Status
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <Database size={21} className="text-cyan-300" />
                <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                  {environment}
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                  Environment
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <Shield size={21} className="text-violet-300" />
                <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                  {formatUptime(health.uptime)}
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                  Uptime
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <CheckCircle2 size={21} className="text-emerald-300" />
                <p className="mt-5 text-sm font-black leading-5">
                  {formatTimestamp(health.timestamp)}
                </p>
                <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                  Last check
                </p>
              </div>
            </div>
          )}
        </article>
      </section>

      <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Management areas
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/40">
              Quick access to all admin modules.
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
          >
            Dashboard
            <ArrowUpRight size={16} />
          </Link>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {managementLinks.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="group rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5 transition hover:-translate-y-1 hover:bg-white/[0.07]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.06] ${item.accent}`}
                  >
                    <Icon size={22} />
                  </div>

                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.06] text-white/45 transition group-hover:bg-emerald-400 group-hover:text-[#07110f]">
                    <ArrowUpRight size={16} />
                  </div>
                </div>

                <h3 className="mt-6 text-xl font-black tracking-[-0.05em] text-white">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
                  {item.description}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
            <FileText size={23} />
          </div>

          <h2 className="mt-6 text-lg font-black tracking-[-0.03em]">
            Workspace notes
          </h2>

          <div className="mt-5 space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                API URL
              </p>
              <p className="mt-2 break-all text-sm font-black text-white">
                {process.env.NEXT_PUBLIC_API_URL}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                Admin role
              </p>
              <p className="mt-2 text-sm font-black text-white">
                Super Admin / League Manager
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                Current stage
              </p>
              <p className="mt-2 text-sm font-black text-white">
                MVP admin management screens
              </p>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-400/10 text-red-200">
            <LogOut size={23} />
          </div>

          <h2 className="mt-6 text-lg font-black tracking-[-0.03em]">
            Session actions
          </h2>

          <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
            Use this when you want to clear the current admin session from the
            browser and return to the login screen.
          </p>

          <div className="mt-5 rounded-[1.5rem] border border-red-400/20 bg-red-400/10 p-4">
            <p className="text-sm font-black text-red-100">
              This only logs you out on this browser.
            </p>
            <p className="mt-1 text-sm font-semibold leading-6 text-white/45">
              It removes the local admin token and redirects you to the admin
              login page.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="mt-5 inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-red-400 px-5 text-sm font-black text-white transition hover:bg-red-300"
          >
            <LogOut size={17} />
            Log out admin
          </button>
        </article>
      </section>
    </AdminShell>
  );
}
