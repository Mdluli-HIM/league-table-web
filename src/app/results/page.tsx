"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CircleDot,
  Home,
  ListOrdered,
  Loader2,
  MapPin,
  Shield,
  Trophy,
  UsersRound,
} from "lucide-react";
import { api } from "@/lib/api";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type Club = {
  id?: string;
  name?: string;
  shortName?: string;
  slug?: string;
};

type Competition = {
  id?: string;
  name?: string;
  slug?: string;
  type?: string;
  status?: string;
};

type Match = {
  id?: string;
  scheduledAt?: string;
  status?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  competition?: Competition | null;
  homeClub?: Club | null;
  awayClub?: Club | null;
  winnerClub?: Club | null;
  venue?: {
    id?: string;
    name?: string;
    address?: string | null;
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

function getClubName(club?: Club | null) {
  return club?.shortName || club?.name || "TBC";
}

function numberFrom(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
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
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getWinnerLabel(match: Match) {
  const homeScore = numberFrom(match.homeScore);
  const awayScore = numberFrom(match.awayScore);

  if (match.winnerClub) {
    return `${getClubName(match.winnerClub)} win`;
  }

  if (homeScore > awayScore) {
    return `${getClubName(match.homeClub)} win`;
  }

  if (awayScore > homeScore) {
    return `${getClubName(match.awayClub)} win`;
  }

  return "Draw";
}

function getTotalGoals(matches: Match[]) {
  return matches.reduce((total, match) => {
    return total + numberFrom(match.homeScore) + numberFrom(match.awayScore);
  }, 0);
}

async function fetchResults() {
  const response = await api.get<ApiResponse<unknown>>("/public/results");

  return unwrapArray<Match>(response.data.data, [
    "results",
    "recentResults",
    "matches",
    "items",
    "data",
  ]);
}

export default function ResultsPage() {
  const resultsQuery = useQuery({
    queryKey: ["public-results"],
    queryFn: fetchResults,
  });

  const results = resultsQuery.data ?? [];
  const totalGoals = getTotalGoals(results);

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
                const active = item.href === "/results";

                return (
                  <Link
                    key={item.label}
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
                Viewer Mode
              </p>
              <p className="mt-2 text-sm font-bold">Completed matches</p>
            </div>
          </aside>

          <div className="min-w-0 rounded-[1.6rem] bg-white/25 p-3 backdrop-blur-xl sm:p-4 lg:p-5">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2 lg:hidden">
                  <Link
                    href="/"
                    className="text-base font-black tracking-[-0.05em]"
                  >
                    League<span className="text-[#087f8c]">Centre</span>
                  </Link>
                  <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#087f8c]">
                    Results
                  </span>
                </div>

                <p className="mt-3 text-sm font-black text-[#087f8c] lg:mt-0">
                  Completed games
                </p>

                <h1 className="mt-1 text-4xl font-black tracking-[-0.07em] text-[#10201c] sm:text-5xl lg:text-6xl">
                  Results
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                  <CircleDot size={14} />
                  {results.length} results
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                  <Trophy size={14} />
                  {totalGoals} goals
                </div>
              </div>
            </header>

            {resultsQuery.isLoading ? (
              <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60">
                <div className="flex items-center gap-2 text-sm font-black text-[#087f8c]">
                  <Loader2 className="animate-spin" size={18} />
                  Loading results
                </div>
              </div>
            ) : results.length > 0 ? (
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                {results.map((match) => {
                  const homeScore = numberFrom(match.homeScore);
                  const awayScore = numberFrom(match.awayScore);

                  return (
                    <article
                      key={match.id}
                      className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087f8c]">
                            {match.competition?.name ?? "Competition"}
                          </p>

                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-black/50">
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays size={14} />
                              {formatDate(match.scheduledAt)}
                            </span>
                          </div>
                        </div>

                        <span className="rounded-full bg-[#087f8c]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#087f8c]">
                          {match.status ?? "COMPLETED"}
                        </span>
                      </div>

                      <div className="mt-7 rounded-[1.4rem] bg-white/55 p-4">
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                          <div className="text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm">
                              <Shield className="text-[#087f8c]" size={25} />
                            </div>
                            <p className="mt-3 text-sm font-black">
                              {getClubName(match.homeClub)}
                            </p>
                          </div>

                          <div className="rounded-3xl bg-[#10201c] px-5 py-3 text-center text-white shadow-lg shadow-black/10">
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/50">
                              FT
                            </p>
                            <p className="mt-1 text-3xl font-black tracking-[-0.06em]">
                              {homeScore} - {awayScore}
                            </p>
                          </div>

                          <div className="text-center">
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm">
                              <Shield className="text-[#087f8c]" size={25} />
                            </div>
                            <p className="mt-3 text-sm font-black">
                              {getClubName(match.awayClub)}
                            </p>
                          </div>
                        </div>

                        {(match.homePenaltyScore !== null &&
                          match.homePenaltyScore !== undefined) ||
                        (match.awayPenaltyScore !== null &&
                          match.awayPenaltyScore !== undefined) ? (
                          <p className="mt-4 text-center text-xs font-bold text-black/50">
                            Penalties: {numberFrom(match.homePenaltyScore)} -{" "}
                            {numberFrom(match.awayPenaltyScore)}
                          </p>
                        ) : null}
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                        <div className="flex items-center gap-2 rounded-2xl bg-white/50 px-4 py-3 text-sm font-bold text-black/60">
                          <MapPin size={16} className="text-[#087f8c]" />
                          <span>{match.venue?.name ?? "Venue TBC"}</span>
                        </div>

                        <div className="rounded-2xl bg-[#ff6b8a]/15 px-4 py-3 text-sm font-black text-[#b42345]">
                          {getWinnerLabel(match)}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60 p-6 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#087f8c]/10 text-[#087f8c]">
                    <CircleDot size={28} />
                  </div>
                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                    No results yet
                  </h2>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-black/50">
                    Completed match results from the backend will appear here
                    once scores are submitted.
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
            const active = item.href === "/results";

            return (
              <Link
                key={item.label}
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
