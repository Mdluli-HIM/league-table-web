"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  Home,
  ListOrdered,
  Loader2,
  Shield,
  Swords,
  Trophy,
  UsersRound,
} from "lucide-react";
import { api } from "@/lib/api";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type Competition = {
  id?: string;
  name?: string;
  slug?: string;
  type?: "LEAGUE" | "KNOCKOUT" | string;
  status?: string;
  startDate?: string;
  endDate?: string;
  _count?: {
    teams?: number;
    matches?: number;
    rounds?: number;
  };
  season?: {
    id?: string;
    name?: string;
    slug?: string;
    isCurrent?: boolean;
  } | null;
};

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Fixtures", href: "/fixtures", icon: CalendarDays },
  { label: "Results", href: "/results", icon: CircleDot },
  { label: "Table", href: "/table", icon: ListOrdered },
  { label: "Clubs", href: "/clubs", icon: UsersRound },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function unwrapArray<T>(value: unknown, keys: string[]) {
  if (Array.isArray(value)) {
    return value as T[];
  }

  if (!isRecord(value)) {
    return [];
  }

  for (const key of keys) {
    const nested = value[key];

    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }

  return [];
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

function formatDate(value?: string) {
  if (!value) return "Date TBC";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date TBC";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getCompetitionTypeLabel(type?: string) {
  if (type === "LEAGUE") return "League";
  if (type === "KNOCKOUT") return "Knockout";
  return "Competition";
}

async function fetchCompetitions() {
  const response = await api.get<ApiResponse<unknown>>("/public/competitions");

  return unwrapArray<Competition>(response.data.data, [
    "competitions",
    "activeCompetitions",
    "items",
    "data",
  ]);
}

export default function CompetitionsPage() {
  const competitionsQuery = useQuery({
    queryKey: ["public-competitions-page"],
    queryFn: fetchCompetitions,
  });

  const competitions = useMemo(
    () => competitionsQuery.data ?? [],
    [competitionsQuery.data],
  );

  const leagueCompetitions = competitions.filter(
    (competition) => competition.type === "LEAGUE",
  );

  const knockoutCompetitions = competitions.filter(
    (competition) => competition.type === "KNOCKOUT",
  );

  const activeCompetitions = competitions.filter(
    (competition) => competition.status === "ACTIVE",
  );

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
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold text-[#08736f] transition hover:bg-white/40"
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto border-t border-[#0f766e]/10 pt-6">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#08736f]/70">
                Viewer Mode
              </p>
              <p className="mt-2 text-sm font-bold">Competitions</p>
            </div>
          </aside>

          <div className="min-w-0 rounded-[1.6rem] bg-white/25 p-3 backdrop-blur-xl sm:p-4 lg:p-5">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex items-center gap-2 lg:hidden">
                  <Link
                    href="/"
                    className="text-base font-black tracking-[-0.05em]"
                  >
                    League<span className="text-[#087f8c]">Centre</span>
                  </Link>
                  <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#087f8c]">
                    Competitions
                  </span>
                </div>

                <p className="mt-3 text-sm font-black text-[#087f8c] lg:mt-0">
                  League and tournament centre
                </p>

                <h1 className="mt-1 text-4xl font-black tracking-[-0.07em] text-[#10201c] sm:text-5xl lg:text-6xl">
                  Competitions
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                  <Trophy size={14} />
                  {competitions.length} total
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                  <Shield size={14} />
                  {activeCompetitions.length} active
                </div>
              </div>
            </header>

            <div className="mt-6 grid gap-4 xl:grid-cols-3">
              <article className="rounded-[1.7rem] border border-white/60 bg-gradient-to-br from-[#0891b2] to-[#0f766e] p-5 text-white shadow-xl shadow-[#0f766e]/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <Trophy size={24} />
                </div>

                <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-white/65">
                  League Competitions
                </p>

                <h2 className="mt-2 text-4xl font-black tracking-[-0.06em]">
                  {leagueCompetitions.length}
                </h2>

                <p className="mt-3 text-sm font-semibold leading-6 text-white/70">
                  Long-format competitions where teams earn points from results.
                </p>
              </article>

              <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8b5cf6]/15 text-[#8b5cf6]">
                  <Swords size={24} />
                </div>

                <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-black/45">
                  Knockout Tournaments
                </p>

                <h2 className="mt-2 text-4xl font-black tracking-[-0.06em]">
                  {knockoutCompetitions.length}
                </h2>

                <p className="mt-3 text-sm font-semibold leading-6 text-black/50">
                  Cup-style tournaments with bracket rounds and winners.
                </p>
              </article>

              <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff6b8a]/15 text-[#ff6b8a]">
                  <CalendarDays size={24} />
                </div>

                <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-black/45">
                  Active Now
                </p>

                <h2 className="mt-2 text-4xl font-black tracking-[-0.06em]">
                  {activeCompetitions.length}
                </h2>

                <p className="mt-3 text-sm font-semibold leading-6 text-black/50">
                  Competitions currently open for fixtures, results and tables.
                </p>
              </article>
            </div>

            {competitionsQuery.isLoading ? (
              <div className="mt-4 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60">
                <div className="flex items-center gap-2 text-sm font-black text-[#087f8c]">
                  <Loader2 className="animate-spin" size={18} />
                  Loading competitions
                </div>
              </div>
            ) : competitions.length > 0 ? (
              <section className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {competitions.map((competition) => {
                  const Icon =
                    competition.type === "KNOCKOUT" ? Swords : Trophy;

                  return (
                    <Link
                      key={competition.id ?? competition.name}
                      href={
                        competition.id
                          ? `/competitions/${competition.id}`
                          : "/competitions"
                      }
                      className="group flex min-h-[310px] flex-col rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10 transition hover:-translate-y-1 hover:bg-white/75"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-[#087f8c] text-white shadow-lg shadow-[#087f8c]/20">
                          <Icon size={28} />
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#087f8c] transition group-hover:rotate-12">
                          <ArrowUpRight size={17} />
                        </div>
                      </div>

                      <div className="mt-8">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087f8c]">
                          {getCompetitionTypeLabel(competition.type)}
                        </p>

                        <h2 className="mt-2 text-2xl font-black leading-none tracking-[-0.05em]">
                          {competition.name ?? "Competition"}
                        </h2>

                        <p className="mt-3 text-sm font-semibold leading-6 text-black/50">
                          {competition.season?.name
                            ? `Part of ${competition.season.name}.`
                            : "Competition details, teams and matches."}
                        </p>
                      </div>

                      <div className="mt-auto grid grid-cols-3 gap-2 pt-6">
                        <div className="rounded-2xl bg-white/55 p-3 text-center">
                          <p className="text-sm font-black">
                            {numberFrom(competition._count?.teams)}
                          </p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-black/35">
                            Teams
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white/55 p-3 text-center">
                          <p className="text-sm font-black">
                            {numberFrom(competition._count?.matches)}
                          </p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-black/35">
                            Matches
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white/55 p-3 text-center">
                          <p className="text-sm font-black">
                            {competition.status ?? "OPEN"}
                          </p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-black/35">
                            Status
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl bg-white/55 px-4 py-3 text-xs font-bold text-black/50">
                        {formatDate(competition.startDate)} —{" "}
                        {formatDate(competition.endDate)}
                      </div>
                    </Link>
                  );
                })}
              </section>
            ) : (
              <div className="mt-4 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60 p-6 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#087f8c]/10 text-[#087f8c]">
                    <Trophy size={28} />
                  </div>
                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                    No competitions yet
                  </h2>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-black/50">
                    Competitions created in the backend will appear here.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <nav className="fixed inset-x-3 bottom-3 z-20 rounded-[1.5rem] border border-white/70 bg-white/75 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-black text-[#08736f]"
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
