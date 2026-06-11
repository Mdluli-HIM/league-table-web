"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  LayoutDashboard,
  Loader2,
  Plus,
  Shield,
  Trophy,
  UserRound,
  UsersRound,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { api } from "@/lib/api";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type SummaryData = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return 0;
}

function getNumber(source: SummaryData, keys: string[]) {
  const possibleSources: SummaryData[] = [source];

  if (isRecord(source.counts)) {
    possibleSources.push(source.counts);
  }

  if (isRecord(source.summary)) {
    possibleSources.push(source.summary);
  }

  if (isRecord(source.stats)) {
    possibleSources.push(source.stats);
  }

  for (const item of possibleSources) {
    for (const key of keys) {
      const value = item[key];

      const parsed = numberFrom(value);

      if (parsed > 0) {
        return parsed;
      }
    }
  }

  return 0;
}

async function fetchDashboardSummary() {
  try {
    const response = await api.get<ApiResponse<unknown>>(
      "/admin/dashboard/summary",
    );

    if (isRecord(response.data.data)) {
      return response.data.data;
    }

    return {};
  } catch {
    const response = await api.get<ApiResponse<unknown>>("/admin/dashboard");

    if (isRecord(response.data.data)) {
      return response.data.data;
    }

    return {};
  }
}

function DashboardContent() {
  const summaryQuery = useQuery({
    queryKey: ["admin-dashboard-summary"],
    queryFn: fetchDashboardSummary,
  });

  const summary = summaryQuery.data ?? {};

  const totalClubs = getNumber(summary, ["totalClubs", "clubs", "clubCount"]);

  const totalPlayers = getNumber(summary, [
    "totalPlayers",
    "players",
    "playerCount",
  ]);

  const totalCompetitions = getNumber(summary, [
    "totalCompetitions",
    "competitions",
    "competitionCount",
  ]);

  const totalMatches = getNumber(summary, [
    "totalMatches",
    "matches",
    "matchCount",
  ]);

  const statCards = [
    {
      label: "Clubs",
      value: totalClubs,
      icon: UsersRound,
      href: "/admin/clubs",
      tone: "bg-emerald-400/15 text-emerald-300",
    },
    {
      label: "Players",
      value: totalPlayers,
      icon: UserRound,
      href: "/admin/players",
      tone: "bg-cyan-400/15 text-cyan-300",
    },
    {
      label: "Competitions",
      value: totalCompetitions,
      icon: Trophy,
      href: "/admin/competitions",
      tone: "bg-violet-400/15 text-violet-300",
    },
    {
      label: "Matches",
      value: totalMatches,
      icon: CalendarDays,
      href: "/admin/fixtures",
      tone: "bg-rose-400/15 text-rose-300",
    },
  ];

  const quickActions = [
    {
      label: "Add club",
      href: "/admin/clubs",
      icon: UsersRound,
    },
    {
      label: "Add player",
      href: "/admin/players",
      icon: UserRound,
    },
    {
      label: "Create competition",
      href: "/admin/competitions",
      icon: Trophy,
    },
    {
      label: "Schedule fixture",
      href: "/admin/fixtures",
      icon: CalendarDays,
    },
  ];

  return (
    <div>
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <LayoutDashboard size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            League operations
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl lg:text-6xl">
            Manage clubs, fixtures, results and competitions.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            This is the control centre for league administrators. From here you
            will manage the data that appears on the public match centre.
          </p>
        </article>

        <article className="rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
              <Shield size={28} />
            </div>

            <span className="rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
              Active
            </span>
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            Admin Access
          </p>

          <h3 className="mt-3 text-3xl font-black tracking-[-0.05em] text-white">
            Super admin
          </h3>

          <p className="mt-3 text-sm font-semibold leading-6 text-white/45">
            You are signed in and can manage the full league system.
          </p>
        </article>
      </section>

      {summaryQuery.isLoading ? (
        <div className="mt-5 flex min-h-[220px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
            <Loader2 className="animate-spin" size={18} />
            Loading dashboard summary
          </div>
        </div>
      ) : summaryQuery.isError ? (
        <div className="mt-5 rounded-[2rem] border border-red-400/20 bg-red-400/10 p-5">
          <p className="text-sm font-black text-red-200">
            Could not load dashboard summary.
          </p>
          <p className="mt-2 text-sm font-semibold text-white/45">
            Make sure the backend is running and your admin token is still
            valid.
          </p>
        </div>
      ) : (
        <section className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card) => {
            const Icon = card.icon;

            return (
              <Link
                key={card.label}
                href={card.href}
                className="group rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10 transition hover:-translate-y-1 hover:bg-white/[0.07]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-2xl ${card.tone}`}
                  >
                    <Icon size={23} />
                  </div>

                  <ArrowUpRight
                    size={18}
                    className="text-white/25 transition group-hover:text-white"
                  />
                </div>

                <p className="mt-8 text-4xl font-black tracking-[-0.06em]">
                  {card.value}
                </p>

                <p className="mt-1 text-xs font-black uppercase tracking-[0.16em] text-white/35">
                  {card.label}
                </p>
              </Link>
            );
          })}
        </section>
      )}

      <section className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Quick actions
            </h2>

            <Plus size={18} className="text-emerald-300" />
          </div>

          <div className="mt-5 grid gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                      <Icon size={18} />
                    </div>

                    <p className="text-sm font-black">{action.label}</p>
                  </div>

                  <ArrowUpRight size={16} className="text-white/30" />
                </Link>
              );
            })}
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Management areas
            </h2>

            <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300/70">
              Admin
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/admin/competitions"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <Trophy className="text-emerald-300" size={22} />
              <p className="mt-6 text-base font-black">Competitions</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
                Manage leagues and knockout tournaments.
              </p>
            </Link>

            <Link
              href="/admin/fixtures"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <CalendarDays className="text-emerald-300" size={22} />
              <p className="mt-6 text-base font-black">Fixtures</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
                Schedule upcoming matches and venues.
              </p>
            </Link>

            <Link
              href="/admin/results"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <CircleDot className="text-emerald-300" size={22} />
              <p className="mt-6 text-base font-black">Results</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
                Submit final scores and update tables.
              </p>
            </Link>

            <Link
              href="/admin/clubs"
              className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:bg-white/[0.08]"
            >
              <UsersRound className="text-emerald-300" size={22} />
              <p className="mt-6 text-base font-black">Clubs</p>
              <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
                Maintain teams and registration records.
              </p>
            </Link>
          </div>
        </article>
      </section>
    </div>
  );
}

export default function AdminDashboardPage() {
  return (
    <AdminShell
      activeKey="dashboard"
      title="Dashboard"
      description="Control centre for league operations."
    >
      <DashboardContent />
    </AdminShell>
  );
}
