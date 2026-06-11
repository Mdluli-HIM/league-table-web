"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  Clock,
  Loader2,
  MapPin,
  Plus,
  Search,
  Shield,
  Trophy,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
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

type Venue = {
  id?: string;
  name?: string;
  address?: string | null;
};

type Match = {
  id?: string;
  competitionId?: string;
  venueId?: string | null;
  homeClubId?: string;
  awayClubId?: string;
  scheduledAt?: string | null;
  matchday?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string;
  competition?: Competition | null;
  homeClub?: Club | null;
  awayClub?: Club | null;
  homeTeam?: Club | null;
  awayTeam?: Club | null;
  venue?: Venue | null;
  createdAt?: string;
  updatedAt?: string;
};

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

function getMatchName(match: Match) {
  return `${getClubName(getHomeClub(match))} vs ${getClubName(
    getAwayClub(match),
  )}`;
}

function getHomeClub(match: Match) {
  return match.homeClub ?? match.homeTeam ?? null;
}

function getAwayClub(match: Match) {
  return match.awayClub ?? match.awayTeam ?? null;
}

function getClubName(club?: Club | null) {
  return club?.name || club?.shortName || "TBC";
}

function getClubShortName(club?: Club | null) {
  const rawShortName = club?.shortName?.trim();

  if (rawShortName && rawShortName.length <= 4) {
    return rawShortName.toUpperCase();
  }

  if (!club?.name) {
    return "TBC";
  }

  const initials = club.name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return initials || "TBC";
}

function getCompetitionName(match: Match) {
  return match.competition?.name || "No competition";
}

function getVenueName(match: Match) {
  return match.venue?.name || "Venue TBC";
}

function getMatchStatus(match: Match) {
  return match.status || "SCHEDULED";
}

function formatDate(value?: string | null) {
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

function formatTime(value?: string | null) {
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

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("scheduled")) {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (normalized.includes("live") || normalized.includes("progress")) {
    return "bg-yellow-400/10 text-yellow-200";
  }

  if (normalized.includes("completed") || normalized.includes("finished")) {
    return "bg-cyan-400/10 text-cyan-300";
  }

  if (normalized.includes("cancelled") || normalized.includes("postponed")) {
    return "bg-red-400/10 text-red-200";
  }

  return "bg-white/[0.06] text-white/50";
}

async function fetchAdminFixtures() {
  const possiblePaths = [
    "/admin/fixtures",
    "/admin/matches",
    "/fixtures",
    "/matches",
    "/public/fixtures",
  ];

  for (const path of possiblePaths) {
    try {
      const response = await api.get<ApiResponse<unknown>>(path);

      return unwrapArray<Match>(response.data.data, [
        "fixtures",
        "matches",
        "items",
        "data",
        "results",
      ]);
    } catch {
      // Try the next possible endpoint.
    }
  }

  return [];
}

export default function AdminFixturesPage() {
  const [search, setSearch] = useState("");

  const fixturesQuery = useQuery({
    queryKey: ["admin-fixtures"],
    queryFn: fetchAdminFixtures,
  });

  const fixtures = useMemo(
    () => fixturesQuery.data ?? [],
    [fixturesQuery.data],
  );

  const filteredFixtures = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return fixtures;
    }

    return fixtures.filter((match) => {
      const matchName = getMatchName(match).toLowerCase();
      const competitionName = getCompetitionName(match).toLowerCase();
      const venueName = getVenueName(match).toLowerCase();
      const status = getMatchStatus(match).toLowerCase();

      return (
        matchName.includes(query) ||
        competitionName.includes(query) ||
        venueName.includes(query) ||
        status.includes(query)
      );
    });
  }, [fixtures, search]);

  const scheduledFixtures = fixtures.filter((match) => {
    return getMatchStatus(match).toLowerCase().includes("scheduled");
  }).length;

  const completedFixtures = fixtures.filter((match) => {
    const status = getMatchStatus(match).toLowerCase();

    return status.includes("completed") || status.includes("finished");
  }).length;

  const withVenue = fixtures.filter((match) =>
    Boolean(match.venue?.name),
  ).length;

  const nextFixture = fixtures.find((match) =>
    getMatchStatus(match).toLowerCase().includes("scheduled"),
  );

  return (
    <AdminShell
      activeKey="fixtures"
      title="Fixtures"
      description="View and manage scheduled matches."
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <CalendarDays size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            Fixture Management
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
            Control upcoming matches.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            Fixtures connect competitions, clubs, venues, dates and matchdays
            before results are captured.
          </p>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Fixture summary
            </h2>

            <Link
              href="/admin/fixtures/new"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              <Plus size={14} />
              New fixture
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <CalendarDays size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {fixtures.length}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Total
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Shield size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {scheduledFixtures}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Scheduled
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Trophy size={21} className="text-cyan-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {completedFixtures}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Completed
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <MapPin size={21} className="text-violet-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {withVenue}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Venues set
              </p>
            </div>
          </div>
        </article>
      </section>

      {nextFixture ? (
        <section className="mt-5 rounded-[2rem] border border-emerald-400/20 bg-emerald-400/10 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                Next fixture
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
                {getMatchName(nextFixture)}
              </h2>
              <p className="mt-2 text-sm font-semibold text-white/45">
                {formatDate(nextFixture.scheduledAt)} •{" "}
                {formatTime(nextFixture.scheduledAt)} •{" "}
                {getVenueName(nextFixture)}
              </p>
            </div>

            <Link
              href={
                nextFixture.id
                  ? `/admin/fixtures/${nextFixture.id}`
                  : "/admin/fixtures"
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              Open fixture
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-[-0.03em]">
              All fixtures
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/40">
              Search and review match fixtures.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:w-[340px]">
              <Search size={17} className="shrink-0 text-emerald-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search fixtures..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/25"
              />
            </div>

            <Link
              href="/admin/fixtures/new"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              <Plus size={16} />
              New fixture
            </Link>
          </div>
        </div>

        {fixturesQuery.isLoading ? (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
              <Loader2 className="animate-spin" size={18} />
              Loading fixtures
            </div>
          </div>
        ) : fixturesQuery.isError ? (
          <div className="mt-5 rounded-[1.5rem] border border-red-400/20 bg-red-400/10 p-5">
            <p className="text-sm font-black text-red-200">
              Could not load fixtures.
            </p>
            <p className="mt-2 text-sm font-semibold text-white/45">
              Make sure the backend is running and your admin token is valid.
            </p>
          </div>
        ) : filteredFixtures.length > 0 ? (
          <>
            <div className="mt-5 hidden overflow-hidden rounded-[1.5rem] border border-white/10 xl:block">
              <div className="grid grid-cols-[1.2fr_150px_150px_160px_120px_90px] bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                <span>Fixture</span>
                <span>Date</span>
                <span>Competition</span>
                <span>Venue</span>
                <span>Status</span>
                <span></span>
              </div>

              <div className="divide-y divide-white/10">
                {filteredFixtures.map((match, index) => {
                  const status = getMatchStatus(match);

                  return (
                    <div
                      key={match.id ?? `${getMatchName(match)}-${index}`}
                      className="grid grid-cols-[1.2fr_150px_150px_160px_120px_90px] items-center px-4 py-4"
                    >
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 px-2 text-center text-xs font-black text-[#07110f]">
                            {getClubShortName(getHomeClub(match))}
                          </div>

                          <div className="min-w-0 text-center">
                            <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-white/35">
                              vs
                            </p>
                          </div>

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cyan-300 px-2 text-center text-xs font-black text-[#07110f]">
                            {getClubShortName(getAwayClub(match))}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-white">
                              {getMatchName(match)}
                            </p>
                            <p className="mt-1 truncate text-xs font-bold text-white/35">
                              Matchday {match.matchday ?? "TBC"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-black text-white/70">
                          {formatDate(match.scheduledAt)}
                        </p>
                        <p className="mt-1 text-xs font-bold text-white/35">
                          {formatTime(match.scheduledAt)}
                        </p>
                      </div>

                      <p className="truncate text-sm font-black text-white/70">
                        {getCompetitionName(match)}
                      </p>

                      <p className="truncate text-sm font-black text-white/70">
                        {getVenueName(match)}
                      </p>

                      <div>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getStatusClass(
                            status,
                          )}`}
                        >
                          {status}
                        </span>
                      </div>

                      <Link
                        href={
                          match.id
                            ? `/admin/fixtures/${match.id}`
                            : "/admin/fixtures"
                        }
                        className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-white transition hover:bg-emerald-400 hover:text-[#07110f]"
                      >
                        <ArrowUpRight size={16} />
                      </Link>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-3 xl:hidden">
              {filteredFixtures.map((match, index) => {
                const status = getMatchStatus(match);

                return (
                  <Link
                    key={match.id ?? `${getMatchName(match)}-mobile-${index}`}
                    href={
                      match.id
                        ? `/admin/fixtures/${match.id}`
                        : "/admin/fixtures"
                    }
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 px-2 text-center text-xs font-black text-[#07110f]">
                            {getClubShortName(getHomeClub(match))}
                          </div>

                          <span className="text-xs font-black uppercase tracking-[0.12em] text-white/30">
                            vs
                          </span>

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-cyan-300 px-2 text-center text-xs font-black text-[#07110f]">
                            {getClubShortName(getAwayClub(match))}
                          </div>
                        </div>

                        <p className="mt-4 truncate text-sm font-black text-white">
                          {getMatchName(match)}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-white/35">
                          {getCompetitionName(match)}
                        </p>
                      </div>

                      <ArrowUpRight
                        size={17}
                        className="shrink-0 text-white/35"
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                        <Clock className="mx-auto text-emerald-300" size={16} />
                        <p className="mt-2 text-xs font-black">
                          {formatTime(match.scheduledAt)}
                        </p>
                        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                          Time
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                        <CalendarDays
                          className="mx-auto text-cyan-300"
                          size={16}
                        />
                        <p className="mt-2 truncate text-xs font-black">
                          {formatDate(match.scheduledAt)}
                        </p>
                        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                          Date
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                        <Shield className="mx-auto text-violet-300" size={16} />
                        <p className="mt-2 truncate text-xs font-black">
                          {status}
                        </p>
                        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                          Status
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <CalendarDays size={26} />
              </div>
              <h2 className="mt-5 text-xl font-black">No fixtures found</h2>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/40">
                Try a different search or create the first fixture.
              </p>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
