"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  CircleDot,
  Clock3,
  ListOrdered,
  Loader2,
  MapPin,
  Shield,
  Trophy,
  UsersRound,
} from "lucide-react";
import { api } from "@/lib/api";
import { ViewerShell } from "@/components/layout/viewer-shell";

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

type StandingRow = Record<string, unknown>;

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

function getClubName(club?: Club | null) {
  return club?.shortName || club?.name || "TBC";
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

function getPlayed(row: StandingRow) {
  return numberFrom(row.played, row.matchesPlayed, row.mp, row.p);
}

function getGoalDifference(row: StandingRow) {
  const value = numberFrom(row.goalDifference, row.gd);
  return value > 0 ? `+${value}` : `${value}`;
}

function getPoints(row: StandingRow) {
  return numberFrom(row.points, row.pts);
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
  }).format(date);
}

function formatTime(value?: string) {
  if (!value) return "Time TBC";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Time TBC";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getScore(match?: Match) {
  if (!match || match.status !== "COMPLETED") {
    return "VS";
  }

  return `${numberFrom(match.homeScore)} - ${numberFrom(match.awayScore)}`;
}

function getTotalGoals(match: Match) {
  return numberFrom(match.homeScore) + numberFrom(match.awayScore);
}

async function fetchPublicHome() {
  const response = await api.get<ApiResponse<unknown>>("/public/home");
  const data = response.data.data;

  if (!isRecord(data)) {
    return {};
  }

  return data;
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
    queryKey: ["public-competitions-home"],
    queryFn: fetchCompetitions,
  });

  const homeData = useMemo(() => homeQuery.data ?? {}, [homeQuery.data]);

  const homeRoot = useMemo(() => {
    return isRecord(homeData.home) ? homeData.home : homeData;
  }, [homeData]);

  const competitions = useMemo(
    () => competitionsQuery.data ?? [],
    [competitionsQuery.data],
  );

  const leagueCompetition = useMemo(() => {
    return (
      competitions.find((competition) => competition.type === "LEAGUE") ??
      competitions[0]
    );
  }, [competitions]);

  const tableQuery = useQuery({
    queryKey: ["public-home-table", leagueCompetition?.id],
    queryFn: () => fetchLeagueTable(leagueCompetition?.id ?? ""),
    enabled: Boolean(leagueCompetition?.id),
  });

  const standings = useMemo(() => tableQuery.data ?? [], [tableQuery.data]);

  const fixtures = useMemo(() => {
    return unwrapArray<Match>(homeRoot, [
      "fixtures",
      "upcomingFixtures",
      "nextFixtures",
      "matches",
    ]).filter((match) => match.status !== "COMPLETED");
  }, [homeRoot]);

  const results = useMemo(() => {
    return unwrapArray<Match>(homeRoot, [
      "results",
      "recentResults",
      "latestResults",
      "completedMatches",
    ]).filter((match) => match.status === "COMPLETED");
  }, [homeRoot]);

  const stats = useMemo(() => {
    if (isRecord(homeRoot.stats)) {
      return homeRoot.stats;
    }

    if (isRecord(homeRoot.summary)) {
      return homeRoot.summary;
    }

    return {};
  }, [homeRoot]);

  const nextFixture = fixtures[0];
  const latestResult = results[0];

  const totalClubs = numberFrom(
    stats.totalClubs,
    stats.clubs,
    stats.clubCount,
    standings.length,
  );

  const totalCompetitions = numberFrom(
    stats.totalCompetitions,
    stats.competitions,
    stats.competitionCount,
    competitions.length,
  );

  const totalMatches = numberFrom(
    stats.totalMatches,
    stats.matches,
    stats.matchCount,
    fixtures.length + results.length,
  );

  const totalGoals = numberFrom(
    stats.totalGoals,
    stats.goals,
    results.reduce((total, match) => total + getTotalGoals(match), 0),
  );

  const loading =
    homeQuery.isLoading || competitionsQuery.isLoading || tableQuery.isLoading;

  return (
    <ViewerShell
      activeKey="home"
      sidebarLabel="Viewer Mode"
      sidebarValue="Public match centre"
    >
      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/" className="text-base font-black tracking-[-0.05em]">
              League<span className="text-[#087f8c]">Centre</span>
            </Link>
            <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#087f8c]">
              Home
            </span>
          </div>

          <p className="mt-3 text-sm font-black text-[#087f8c] lg:mt-0">
            Public football dashboard
          </p>

          <h1 className="mt-1 text-4xl font-black tracking-[-0.07em] text-[#10201c] sm:text-5xl lg:text-6xl">
            Match Centre
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
            <Trophy size={14} />
            {totalCompetitions} competitions
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
            <UsersRound size={14} />
            {totalClubs} clubs
          </div>
        </div>
      </header>

      {loading ? (
        <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60">
          <div className="flex items-center gap-2 text-sm font-black text-[#087f8c]">
            <Loader2 className="animate-spin" size={18} />
            Loading match centre
          </div>
        </div>
      ) : (
        <>
          <section className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="flex min-h-[360px] flex-col rounded-[1.7rem] border border-white/60 bg-gradient-to-br from-[#0891b2] to-[#0f766e] p-5 text-white shadow-xl shadow-[#0f766e]/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15">
                  <Trophy size={28} />
                </div>

                <span className="rounded-full bg-white/15 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/80">
                  Live overview
                </span>
              </div>

              <div className="mt-auto">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-white/65">
                  LeagueCentre
                </p>

                <h2 className="mt-3 max-w-2xl text-5xl font-black leading-[0.9] tracking-[-0.08em] sm:text-6xl xl:text-7xl">
                  Follow every fixture, result and table update.
                </h2>

                <p className="mt-5 max-w-xl text-sm font-semibold leading-6 text-white/70">
                  A clean public dashboard for fans, players and clubs to track
                  league progress in one place.
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/fixtures"
                    className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-xs font-black text-[#087f8c]"
                  >
                    View fixtures
                    <ArrowUpRight size={15} />
                  </Link>

                  <Link
                    href="/table"
                    className="inline-flex items-center gap-2 rounded-full bg-white/15 px-5 py-3 text-xs font-black text-white"
                  >
                    League table
                    <ArrowUpRight size={15} />
                  </Link>
                </div>
              </div>
            </article>

            <div className="grid gap-4">
              <article className="flex min-h-[170px] flex-col rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#087f8c]">
                      Next Fixture
                    </p>
                    <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">
                      {nextFixture
                        ? `${getClubName(nextFixture.homeClub)} vs ${getClubName(
                            nextFixture.awayClub,
                          )}`
                        : "No fixture scheduled"}
                    </h2>
                  </div>

                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#ff6b8a]/15 text-[#ff6b8a]">
                    <CalendarDays size={24} />
                  </div>
                </div>

                <div className="mt-auto grid gap-2 text-xs font-bold text-black/50 sm:grid-cols-3">
                  <span className="inline-flex items-center gap-1">
                    <Clock3 size={14} />
                    {formatTime(nextFixture?.scheduledAt)}
                  </span>
                  <span>{formatDate(nextFixture?.scheduledAt)}</span>
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin size={14} className="shrink-0" />
                    <span className="truncate">
                      {nextFixture?.venue?.name ?? "Venue TBC"}
                    </span>
                  </span>
                </div>
              </article>

              <article className="grid gap-3 rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10 sm:grid-cols-3">
                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#087f8c]/10 text-[#087f8c]">
                    <BarChart3 size={22} />
                  </div>
                  <p className="mt-6 text-3xl font-black tracking-[-0.06em]">
                    {totalMatches}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-black/40">
                    Matches
                  </p>
                </div>

                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#8b5cf6]/15 text-[#8b5cf6]">
                    <CircleDot size={22} />
                  </div>
                  <p className="mt-6 text-3xl font-black tracking-[-0.06em]">
                    {results.length}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-black/40">
                    Results
                  </p>
                </div>

                <div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff6b8a]/15 text-[#ff6b8a]">
                    <Trophy size={22} />
                  </div>
                  <p className="mt-6 text-3xl font-black tracking-[-0.06em]">
                    {totalGoals}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-black/40">
                    Goals
                  </p>
                </div>
              </article>
            </div>
          </section>

          <section className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
            <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  League Table
                </h2>

                <Link
                  href="/table"
                  className="text-xs font-black text-[#087f8c]"
                >
                  Full table
                </Link>
              </div>

              {standings.length > 0 ? (
                <div className="mt-4 divide-y divide-[#0f766e]/10">
                  {standings.slice(0, 6).map((row, index) => (
                    <div
                      key={`${getStandingClubName(row)}-${index}`}
                      className="grid grid-cols-[34px_1fr_52px_54px_54px] items-center py-3 text-sm"
                    >
                      <span className="font-black text-black/50">
                        {index + 1}
                      </span>

                      <span className="flex min-w-0 items-center gap-3 font-black">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-white text-[#087f8c]">
                          <Shield size={17} />
                        </span>
                        <span className="truncate">
                          {getStandingClubName(row)}
                        </span>
                      </span>

                      <span className="font-bold text-black/55">
                        {getPlayed(row)}
                      </span>

                      <span className="font-bold text-black/55">
                        {getGoalDifference(row)}
                      </span>

                      <span className="font-black text-[#087f8c]">
                        {getPoints(row)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.4rem] border border-dashed border-[#087f8c]/25 bg-white/45 p-6 text-center">
                  <p className="text-sm font-black">No table yet</p>
                  <p className="mt-2 text-xs font-semibold text-black/50">
                    The table will appear once results are submitted.
                  </p>
                </div>
              )}
            </article>

            <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  Latest Result
                </h2>

                <Link
                  href="/results"
                  className="text-xs font-black text-[#087f8c]"
                >
                  View results
                </Link>
              </div>

              {latestResult ? (
                <div className="mt-5">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087f8c]">
                    {latestResult.competition?.name ?? "Competition"}
                  </p>

                  <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="min-w-0 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm">
                        <Shield className="text-[#087f8c]" size={25} />
                      </div>
                      <p className="mt-3 truncate text-sm font-black">
                        {getClubName(latestResult.homeClub)}
                      </p>
                    </div>

                    <div className="shrink-0 rounded-3xl bg-[#10201c] px-5 py-3 text-center text-xl font-black tracking-[-0.05em] text-white">
                      {getScore(latestResult)}
                    </div>

                    <div className="min-w-0 text-center">
                      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white shadow-sm">
                        <Shield className="text-[#087f8c]" size={25} />
                      </div>
                      <p className="mt-3 truncate text-sm font-black">
                        {getClubName(latestResult.awayClub)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center gap-2 rounded-2xl bg-white/50 px-4 py-3 text-sm font-bold text-black/60">
                    <MapPin size={16} className="shrink-0 text-[#087f8c]" />
                    <span className="truncate">
                      {latestResult.venue?.name ?? "Venue TBC"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-[1.4rem] border border-dashed border-[#087f8c]/25 bg-white/45 p-6 text-center">
                  <p className="text-sm font-black">No result yet</p>
                  <p className="mt-2 text-xs font-semibold text-black/50">
                    Completed matches will appear here.
                  </p>
                </div>
              )}
            </article>
          </section>

          <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Link
              href="/fixtures"
              className="group rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10 transition hover:-translate-y-1 hover:bg-white/75"
            >
              <CalendarDays className="text-[#087f8c]" size={25} />
              <p className="mt-8 text-xl font-black tracking-[-0.04em]">
                Fixtures
              </p>
              <p className="mt-2 text-sm font-semibold text-black/50">
                Upcoming matches
              </p>
            </Link>

            <Link
              href="/results"
              className="group rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10 transition hover:-translate-y-1 hover:bg-white/75"
            >
              <CircleDot className="text-[#087f8c]" size={25} />
              <p className="mt-8 text-xl font-black tracking-[-0.04em]">
                Results
              </p>
              <p className="mt-2 text-sm font-semibold text-black/50">
                Completed games
              </p>
            </Link>

            <Link
              href="/table"
              className="group rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10 transition hover:-translate-y-1 hover:bg-white/75"
            >
              <ListOrdered className="text-[#087f8c]" size={25} />
              <p className="mt-8 text-xl font-black tracking-[-0.04em]">
                Table
              </p>
              <p className="mt-2 text-sm font-semibold text-black/50">
                League standings
              </p>
            </Link>

            <Link
              href="/clubs"
              className="group rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10 transition hover:-translate-y-1 hover:bg-white/75"
            >
              <UsersRound className="text-[#087f8c]" size={25} />
              <p className="mt-8 text-xl font-black tracking-[-0.04em]">
                Clubs
              </p>
              <p className="mt-2 text-sm font-semibold text-black/50">
                Team directory
              </p>
            </Link>
          </section>
        </>
      )}
    </ViewerShell>
  );
}
