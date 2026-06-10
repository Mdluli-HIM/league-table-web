"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  CircleDot,
  Home,
  ListOrdered,
  Loader2,
  Medal,
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

type Competition = {
  id?: string;
  name?: string;
  slug?: string;
  type?: string;
  status?: string;
};

type StandingRow = Record<string, unknown>;

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

function stringFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return "";
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

function getClubName(row: StandingRow) {
  const club = row.club;
  const team = row.team;

  if (isRecord(club)) {
    return stringFrom(club.shortName, club.name);
  }

  if (isRecord(team)) {
    return stringFrom(team.shortName, team.name);
  }

  return (
    stringFrom(row.clubName, row.teamName, row.name, team) || "Unknown Club"
  );
}

function getPlayed(row: StandingRow) {
  return numberFrom(row.played, row.matchesPlayed, row.mp, row.p);
}

function getWins(row: StandingRow) {
  return numberFrom(row.won, row.wins, row.w);
}

function getDraws(row: StandingRow) {
  return numberFrom(row.drawn, row.draws, row.d);
}

function getLosses(row: StandingRow) {
  return numberFrom(row.lost, row.losses, row.l);
}

function getGoalsFor(row: StandingRow) {
  return numberFrom(row.goalsFor, row.gf);
}

function getGoalsAgainst(row: StandingRow) {
  return numberFrom(row.goalsAgainst, row.ga);
}

function getGoalDifference(row: StandingRow) {
  const value = numberFrom(row.goalDifference, row.gd);
  return value > 0 ? `+${value}` : `${value}`;
}

function getPoints(row: StandingRow) {
  return numberFrom(row.points, row.pts);
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

async function fetchTable(competitionId: string) {
  const response = await api.get<ApiResponse<unknown>>(
    `/public/competitions/${competitionId}/table`,
  );

  return unwrapArray<StandingRow>(response.data.data, [
    "standings",
    "table",
    "rows",
    "items",
    "data",
  ]);
}

export default function TablePage() {
  const competitionsQuery = useQuery({
    queryKey: ["public-competitions-for-table"],
    queryFn: fetchCompetitions,
  });

  const competitions = competitionsQuery.data ?? [];

  const leagueCompetition =
    competitions.find((competition) => competition.type === "LEAGUE") ??
    competitions[0];

  const tableQuery = useQuery({
    queryKey: ["public-table", leagueCompetition?.id],
    queryFn: () => fetchTable(leagueCompetition?.id ?? ""),
    enabled: Boolean(leagueCompetition?.id),
  });

  const standings = tableQuery.data ?? [];
  const leader = standings[0];

  const totalClubs = standings.length;
  const totalPlayed = standings.reduce(
    (total, row) => total + getPlayed(row),
    0,
  );
  const totalGoals = standings.reduce(
    (total, row) => total + getGoalsFor(row),
    0,
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
                const active = item.href === "/table";

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
                Competition
              </p>
              <p className="mt-2 text-sm font-bold">
                {leagueCompetition?.name ?? "League table"}
              </p>
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
                    Table
                  </span>
                </div>

                <p className="mt-3 text-sm font-black text-[#087f8c] lg:mt-0">
                  {leagueCompetition?.name ?? "League standings"}
                </p>

                <h1 className="mt-1 text-4xl font-black tracking-[-0.07em] text-[#10201c] sm:text-5xl lg:text-6xl">
                  League Table
                </h1>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                  <UsersRound size={14} />
                  {totalClubs} clubs
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                  <BarChart3 size={14} />
                  {totalPlayed} played
                </div>
              </div>
            </header>

            {competitionsQuery.isLoading || tableQuery.isLoading ? (
              <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60">
                <div className="flex items-center gap-2 text-sm font-black text-[#087f8c]">
                  <Loader2 className="animate-spin" size={18} />
                  Loading league table
                </div>
              </div>
            ) : standings.length > 0 ? (
              <>
                <div className="mt-6 grid gap-4 xl:grid-cols-3">
                  <article className="rounded-[1.7rem] border border-white/60 bg-gradient-to-br from-[#0891b2] to-[#0f766e] p-5 text-white shadow-xl shadow-[#0f766e]/20 xl:col-span-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                      <Trophy size={24} />
                    </div>

                    <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-white/65">
                      Current Leader
                    </p>

                    <h2 className="mt-2 text-3xl font-black leading-[0.95] tracking-[-0.06em]">
                      {leader ? getClubName(leader) : "TBC"}
                    </h2>

                    <div className="mt-6 rounded-2xl bg-white/15 p-4">
                      <p className="text-xs font-bold text-white/65">Points</p>
                      <p className="mt-1 text-4xl font-black tracking-[-0.06em]">
                        {leader ? getPoints(leader) : 0}
                      </p>
                    </div>
                  </article>

                  <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8b5cf6]/15 text-[#8b5cf6]">
                      <Medal size={24} />
                    </div>
                    <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-black/45">
                      Race Status
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">
                      Active
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/50">
                      Table updates automatically when match results are
                      submitted.
                    </p>
                  </article>

                  <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff6b8a]/15 text-[#ff6b8a]">
                      <BarChart3 size={24} />
                    </div>
                    <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-black/45">
                      Goals Scored
                    </p>
                    <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">
                      {totalGoals}
                    </h2>
                    <p className="mt-2 text-sm font-semibold leading-6 text-black/50">
                      Goals from completed league results.
                    </p>
                  </article>
                </div>

                <section className="mt-4 rounded-[1.7rem] border border-white/60 bg-white/60 p-4 shadow-lg shadow-[#5c7c7c]/10 sm:p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-lg font-black tracking-[-0.03em]">
                      Standings
                    </h2>
                    <span className="text-xs font-black uppercase tracking-[0.14em] text-[#087f8c]">
                      Points table
                    </span>
                  </div>

                  <div className="hidden overflow-hidden lg:block">
                    <div className="grid grid-cols-[48px_1fr_70px_70px_70px_70px_70px_70px_80px_80px] border-b border-[#0f766e]/10 pb-3 text-[10px] font-black uppercase tracking-[0.14em] text-black/40">
                      <span>Pos</span>
                      <span>Club</span>
                      <span>P</span>
                      <span>W</span>
                      <span>D</span>
                      <span>L</span>
                      <span>GF</span>
                      <span>GA</span>
                      <span>GD</span>
                      <span>Pts</span>
                    </div>

                    <div className="divide-y divide-[#0f766e]/10">
                      {standings.map((row, index) => (
                        <div
                          key={`${getClubName(row)}-${index}`}
                          className="grid grid-cols-[48px_1fr_70px_70px_70px_70px_70px_70px_80px_80px] items-center py-4 text-sm"
                        >
                          <span className="font-black text-black/50">
                            {index + 1}
                          </span>

                          <span className="flex min-w-0 items-center gap-3 font-black">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#087f8c]">
                              <Shield size={17} />
                            </span>
                            <span className="truncate">{getClubName(row)}</span>
                          </span>

                          <span className="font-bold text-black/60">
                            {getPlayed(row)}
                          </span>
                          <span className="font-bold text-black/60">
                            {getWins(row)}
                          </span>
                          <span className="font-bold text-black/60">
                            {getDraws(row)}
                          </span>
                          <span className="font-bold text-black/60">
                            {getLosses(row)}
                          </span>
                          <span className="font-bold text-black/60">
                            {getGoalsFor(row)}
                          </span>
                          <span className="font-bold text-black/60">
                            {getGoalsAgainst(row)}
                          </span>
                          <span className="font-bold text-black/60">
                            {getGoalDifference(row)}
                          </span>
                          <span className="font-black text-[#087f8c]">
                            {getPoints(row)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 lg:hidden">
                    {standings.map((row, index) => (
                      <article
                        key={`${getClubName(row)}-mobile-${index}`}
                        className="rounded-[1.4rem] bg-white/55 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#087f8c] text-sm font-black text-white">
                              {index + 1}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-black">
                                {getClubName(row)}
                              </p>
                              <p className="mt-1 text-xs font-bold text-black/45">
                                {getPlayed(row)} played · GD{" "}
                                {getGoalDifference(row)}
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-2xl font-black tracking-[-0.05em] text-[#087f8c]">
                              {getPoints(row)}
                            </p>
                            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/40">
                              Pts
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-5 rounded-2xl bg-white/55 p-3 text-center">
                          <div>
                            <p className="text-[10px] font-black text-black/35">
                              W
                            </p>
                            <p className="text-sm font-black">{getWins(row)}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-black/35">
                              D
                            </p>
                            <p className="text-sm font-black">
                              {getDraws(row)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-black/35">
                              L
                            </p>
                            <p className="text-sm font-black">
                              {getLosses(row)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-black/35">
                              GF
                            </p>
                            <p className="text-sm font-black">
                              {getGoalsFor(row)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-black/35">
                              GA
                            </p>
                            <p className="text-sm font-black">
                              {getGoalsAgainst(row)}
                            </p>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60 p-6 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#087f8c]/10 text-[#087f8c]">
                    <ListOrdered size={28} />
                  </div>
                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                    No table yet
                  </h2>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-black/50">
                    The league table will appear once a league competition has
                    teams and completed results.
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
            const active = item.href === "/table";

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
