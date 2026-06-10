"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  CalendarDays,
  ChevronRight,
  CircleDot,
  Home,
  ListOrdered,
  Loader2,
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

type Season = {
  id?: string;
  name?: string;
  slug?: string;
  status?: string;
  isCurrent?: boolean;
};

type Match = {
  id?: string;
  scheduledAt?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  competition?: Competition | null;
  homeClub?: Club | null;
  awayClub?: Club | null;
  venue?: {
    id?: string;
    name?: string;
    address?: string | null;
  } | null;
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

function numberFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }

  return 0;
}

function stringFrom(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }

  return "";
}

function firstArray<T>(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];

    if (Array.isArray(value)) {
      return value as T[];
    }
  }

  return [];
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

function formatMatchDate(value?: string) {
  if (!value) return "Date TBC";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date TBC";

  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getStandingClubName(row: StandingRow) {
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

function getStandingPlayed(row: StandingRow) {
  return numberFrom(row.played, row.matchesPlayed, row.mp, row.p);
}

function getStandingWins(row: StandingRow) {
  return numberFrom(row.won, row.wins, row.w);
}

function getStandingLosses(row: StandingRow) {
  return numberFrom(row.lost, row.losses, row.l);
}

function getStandingGoalDifference(row: StandingRow) {
  const value = row.goalDifference ?? row.gd;

  if (typeof value === "number") {
    return value > 0 ? `+${value}` : `${value}`;
  }

  return stringFrom(value) || "0";
}

function getStandingPoints(row: StandingRow) {
  return numberFrom(row.points, row.pts);
}

async function fetchPublicHome() {
  const response = await api.get<ApiResponse<unknown>>("/public/home");
  return isRecord(response.data.data) ? response.data.data : {};
}

async function fetchPublicCompetitions() {
  const response = await api.get<ApiResponse<unknown>>("/public/competitions");

  return unwrapArray<Competition>(response.data.data, [
    "competitions",
    "activeCompetitions",
    "items",
    "data",
  ]);
}

async function fetchLeagueTable(competitionId: string) {
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

export default function HomePage() {
  const homeQuery = useQuery({
    queryKey: ["public-home"],
    queryFn: fetchPublicHome,
  });

  const competitionsQuery = useQuery({
    queryKey: ["public-competitions"],
    queryFn: fetchPublicCompetitions,
  });

  const homeData = homeQuery.data ?? {};
  const statsData = isRecord(homeData.stats) ? homeData.stats : {};

  const homeCompetitions = firstArray<Competition>(homeData, [
    "activeCompetitions",
    "competitions",
  ]);

  const competitions =
    homeCompetitions.length > 0
      ? homeCompetitions
      : (competitionsQuery.data ?? []);

  const leagueCompetition =
    competitions.find((competition) => competition.type === "LEAGUE") ??
    competitions[0];

  const tableQuery = useQuery({
    queryKey: ["public-league-table", leagueCompetition?.id],
    queryFn: () => fetchLeagueTable(leagueCompetition?.id ?? ""),
    enabled: Boolean(leagueCompetition?.id),
  });

  const currentSeason = isRecord(homeData.currentSeason)
    ? (homeData.currentSeason as Season)
    : undefined;

  const upcomingFixtures = firstArray<Match>(homeData, [
    "upcomingFixtures",
    "fixtures",
    "nextFixtures",
  ]);

  const recentResults = firstArray<Match>(homeData, [
    "recentResults",
    "latestResults",
    "results",
  ]);

  const clubs = firstArray<Club>(homeData, ["clubs", "activeClubs"]);

  const standings = tableQuery.data ?? [];
  const nextFixture = upcomingFixtures[0];
  const latestResult = recentResults[0];

  const totalGoalsFromResults = recentResults.reduce((total, match) => {
    return total + numberFrom(match.homeScore) + numberFrom(match.awayScore);
  }, 0);

  const totalClubs = numberFrom(
    statsData.totalClubs,
    statsData.clubs,
    homeData.totalClubs,
    clubs.length,
  );

  const completedMatches = numberFrom(
    statsData.completedMatches,
    statsData.playedMatches,
    homeData.completedMatches,
    recentResults.length,
  );

  const totalGoals = numberFrom(
    statsData.totalGoals,
    statsData.goals,
    homeData.totalGoals,
    totalGoalsFromResults,
  );

  const scheduledFixtures = numberFrom(
    statsData.scheduledFixtures,
    statsData.upcomingFixtures,
    homeData.scheduledFixtures,
    upcomingFixtures.length,
  );

  const isLoading = homeQuery.isLoading || competitionsQuery.isLoading;

  const topStanding = standings[0];
  const topTeamPoints = topStanding ? getStandingPoints(topStanding) : 0;

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
              {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = index === 0;

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
                Current Season
              </p>
              <p className="mt-2 text-sm font-bold">
                {currentSeason?.name ?? "No current season"}
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
                    Viewer
                  </span>
                </div>

                <p className="mt-3 text-sm font-black text-[#087f8c] lg:mt-0">
                  {currentSeason?.name
                    ? `${currentSeason.name} overview`
                    : "Live league overview"}
                </p>

                <h1 className="mt-1 text-4xl font-black tracking-[-0.07em] text-[#10201c] sm:text-5xl lg:text-6xl">
                  Match Centre
                </h1>
              </div>

              <div className="flex items-center gap-2">
                {isLoading ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                    <Loader2 className="animate-spin" size={14} />
                    Loading data
                  </div>
                ) : null}

                <Link
                  href="/table"
                  className="rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm transition hover:bg-white"
                >
                  View table
                </Link>
              </div>
            </header>

            <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
              <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    Next Fixture
                  </h2>
                  <Link
                    href="/fixtures"
                    className="text-xs font-black text-[#087f8c]"
                  >
                    View fixtures
                  </Link>
                </div>

                {nextFixture ? (
                  <>
                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-xs font-bold text-black/50">
                      <span>
                        {nextFixture.competition?.name ?? "Competition"}
                      </span>
                      <span>•</span>
                      <span>{formatMatchDate(nextFixture.scheduledAt)}</span>
                    </div>

                    <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
                          <Shield className="text-[#087f8c]" size={28} />
                        </div>
                        <p className="mt-3 text-sm font-black">
                          {getClubName(nextFixture.homeClub)}
                        </p>
                      </div>

                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ff6b8a] text-xs font-black text-white">
                        VS
                      </div>

                      <div className="text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
                          <Shield className="text-[#087f8c]" size={28} />
                        </div>
                        <p className="mt-3 text-sm font-black">
                          {getClubName(nextFixture.awayClub)}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="mt-6 rounded-3xl border border-dashed border-[#087f8c]/25 bg-white/40 p-6 text-center">
                    <p className="text-sm font-black">
                      No upcoming fixture yet
                    </p>
                    <p className="mt-2 text-xs font-semibold text-black/50">
                      Fixtures created in the backend will appear here.
                    </p>
                  </div>
                )}
              </article>

              <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    League Statistics
                  </h2>
                  <span className="text-xs font-black text-[#087f8c]">
                    Public
                  </span>
                </div>

                <div className="mt-7 rounded-2xl border border-[#0f766e]/10 bg-white/35 p-4">
                  <div className="h-3 overflow-hidden rounded-full bg-[#d7e7e4]">
                    <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-[#0891b2] via-[#0f766e] to-[#ff6b8a]" />
                  </div>

                  <div className="mt-5 grid grid-cols-4 text-center">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/40">
                        Clubs
                      </p>
                      <p className="mt-1 text-lg font-black">{totalClubs}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/40">
                        Played
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {completedMatches}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/40">
                        Goals
                      </p>
                      <p className="mt-1 text-lg font-black">{totalGoals}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-black/40">
                        Next
                      </p>
                      <p className="mt-1 text-lg font-black">
                        {scheduledFixtures}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </div>

            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.95fr]">
              <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    Standings
                  </h2>
                  <Link
                    href="/table"
                    className="text-xs font-black text-[#087f8c]"
                  >
                    View all
                  </Link>
                </div>

                <div className="mt-4 overflow-hidden">
                  <div className="grid grid-cols-[32px_1fr_38px_38px_38px_44px_44px] border-b border-[#0f766e]/10 pb-3 text-[10px] font-black uppercase tracking-[0.14em] text-black/40">
                    <span>#</span>
                    <span>Team</span>
                    <span>MP</span>
                    <span>W</span>
                    <span>L</span>
                    <span>GD</span>
                    <span>PTS</span>
                  </div>

                  {tableQuery.isLoading ? (
                    <div className="flex items-center justify-center gap-2 py-10 text-sm font-bold text-[#087f8c]">
                      <Loader2 className="animate-spin" size={16} />
                      Loading standings
                    </div>
                  ) : standings.length > 0 ? (
                    <div className="divide-y divide-[#0f766e]/10">
                      {standings.slice(0, 6).map((club, index) => (
                        <div
                          key={`${getStandingClubName(club)}-${index}`}
                          className="grid grid-cols-[32px_1fr_38px_38px_38px_44px_44px] items-center py-3 text-xs sm:text-sm"
                        >
                          <span className="font-bold text-black/50">
                            {index + 1}
                          </span>
                          <span className="flex min-w-0 items-center gap-2 font-black">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white text-[#087f8c]">
                              <Shield size={14} />
                            </span>
                            <span className="truncate">
                              {getStandingClubName(club)}
                            </span>
                          </span>
                          <span className="font-bold text-black/60">
                            {getStandingPlayed(club)}
                          </span>
                          <span className="font-bold text-black/60">
                            {getStandingWins(club)}
                          </span>
                          <span className="font-bold text-black/60">
                            {getStandingLosses(club)}
                          </span>
                          <span className="font-bold text-black/60">
                            {getStandingGoalDifference(club)}
                          </span>
                          <span className="font-black">
                            {getStandingPoints(club)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-dashed border-[#087f8c]/25 bg-white/40 p-6 text-center">
                      <p className="text-sm font-black">No standings yet</p>
                      <p className="mt-2 text-xs font-semibold text-black/50">
                        Once league results are submitted, the table will appear
                        here.
                      </p>
                    </div>
                  )}
                </div>
              </article>

              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <article className="rounded-[1.5rem] border border-white/60 bg-white/60 p-4 shadow-lg shadow-[#5c7c7c]/10">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8b5cf6]/15 text-[#8b5cf6]">
                      <Trophy size={21} />
                    </div>
                    <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
                      Top Team
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {topTeamPoints ? `${topTeamPoints} pts` : "TBC"}
                    </p>
                  </article>

                  <article className="rounded-[1.5rem] border border-white/60 bg-white/60 p-4 shadow-lg shadow-[#5c7c7c]/10">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff6b8a]/15 text-[#ff6b8a]">
                      <BarChart3 size={21} />
                    </div>
                    <p className="mt-5 text-[10px] font-black uppercase tracking-[0.16em] text-black/45">
                      Avg Goals
                    </p>
                    <p className="mt-1 text-lg font-black">
                      {completedMatches > 0
                        ? (totalGoals / completedMatches).toFixed(1)
                        : "0.0"}
                    </p>
                  </article>
                </div>

                <article className="relative overflow-hidden rounded-[1.7rem] bg-gradient-to-br from-[#0891b2] to-[#0f766e] p-5 text-white shadow-xl shadow-[#0f766e]/20">
                  <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/15" />
                  <div className="absolute -bottom-16 right-8 h-36 w-36 rounded-full bg-[#ff6b8a]/30" />

                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/70">
                    Latest Result
                  </p>

                  {latestResult ? (
                    <>
                      <h2 className="mt-4 max-w-xs text-3xl font-black leading-[0.95] tracking-[-0.06em]">
                        {getClubName(latestResult.homeClub)} vs{" "}
                        {getClubName(latestResult.awayClub)}
                      </h2>

                      <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/15 p-4 backdrop-blur">
                        <div>
                          <p className="text-xs font-bold text-white/70">
                            {latestResult.competition?.name ??
                              "Completed match"}
                          </p>
                          <p className="mt-1 text-2xl font-black">
                            {numberFrom(latestResult.homeScore)} -{" "}
                            {numberFrom(latestResult.awayScore)}
                          </p>
                        </div>

                        <Link
                          href="/results"
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#087f8c]"
                        >
                          <ChevronRight size={18} />
                        </Link>
                      </div>
                    </>
                  ) : (
                    <div className="mt-6 rounded-2xl bg-white/15 p-4 backdrop-blur">
                      <p className="text-lg font-black">No results yet</p>
                      <p className="mt-2 text-sm font-semibold text-white/70">
                        Submitted results from the backend will appear here.
                      </p>
                    </div>
                  )}
                </article>
              </div>
            </div>
          </div>
        </div>
      </section>

      <nav className="fixed inset-x-3 bottom-3 z-20 rounded-[1.5rem] border border-white/70 bg-white/75 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const active = index === 0;

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
