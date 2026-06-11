"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Loader2,
  MapPin,
  Plus,
  Search,
  Shield,
  Trophy,
  UsersRound,
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
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  winnerClubId?: string | null;
  status?: string;
  competition?: Competition | null;
  homeClub?: Club | null;
  awayClub?: Club | null;
  homeTeam?: Club | null;
  awayTeam?: Club | null;
  winnerClub?: Club | null;
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

function getMatchName(match: Match) {
  return `${getClubName(getHomeClub(match))} vs ${getClubName(
    getAwayClub(match),
  )}`;
}

function getCompetitionName(match: Match) {
  return match.competition?.name || "No competition";
}

function getVenueName(match: Match) {
  return match.venue?.name || "Venue TBC";
}

function getMatchStatus(match: Match) {
  return match.status || "COMPLETED";
}

function isCompletedResult(match: Match) {
  const status = getMatchStatus(match).toLowerCase();

  return (
    status.includes("completed") ||
    status.includes("finished") ||
    (typeof match.homeScore === "number" && typeof match.awayScore === "number")
  );
}

function getScoreLabel(match: Match) {
  const homeScore =
    typeof match.homeScore === "number" ? String(match.homeScore) : "-";
  const awayScore =
    typeof match.awayScore === "number" ? String(match.awayScore) : "-";

  return `${homeScore} - ${awayScore}`;
}

function getResultLabel(match: Match) {
  if (
    typeof match.homeScore !== "number" ||
    typeof match.awayScore !== "number"
  ) {
    return "Score pending";
  }

  if (match.homeScore > match.awayScore) {
    return `${getClubName(getHomeClub(match))} win`;
  }

  if (match.awayScore > match.homeScore) {
    return `${getClubName(getAwayClub(match))} win`;
  }

  return "Draw";
}

function getWinnerBadge(match: Match) {
  if (
    typeof match.homeScore !== "number" ||
    typeof match.awayScore !== "number"
  ) {
    return "TBC";
  }

  if (match.homeScore > match.awayScore) {
    return getClubShortName(getHomeClub(match));
  }

  if (match.awayScore > match.homeScore) {
    return getClubShortName(getAwayClub(match));
  }

  return "D";
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("completed") || normalized.includes("finished")) {
    return "bg-cyan-400/10 text-cyan-300";
  }

  if (normalized.includes("scheduled")) {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (normalized.includes("cancelled") || normalized.includes("postponed")) {
    return "bg-red-400/10 text-red-200";
  }

  return "bg-white/[0.06] text-white/50";
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

async function fetchAdminResults() {
  const possiblePaths = [
    "/admin/results",
    "/admin/matches?status=COMPLETED",
    "/results",
    "/matches?status=COMPLETED",
    "/public/results",
  ];

  for (const path of possiblePaths) {
    try {
      const response = await api.get<ApiResponse<unknown>>(path);

      return unwrapArray<Match>(response.data.data, [
        "results",
        "matches",
        "fixtures",
        "items",
        "data",
      ]);
    } catch {
      // Try next endpoint.
    }
  }

  return [];
}

export default function AdminResultsPage() {
  const [search, setSearch] = useState("");

  const resultsQuery = useQuery({
    queryKey: ["admin-results"],
    queryFn: fetchAdminResults,
  });

  const matches = useMemo(() => resultsQuery.data ?? [], [resultsQuery.data]);

  const results = useMemo(() => {
    return matches.filter(isCompletedResult);
  }, [matches]);

  const filteredResults = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return results;
    }

    return results.filter((match) => {
      const matchName = getMatchName(match).toLowerCase();
      const competitionName = getCompetitionName(match).toLowerCase();
      const venueName = getVenueName(match).toLowerCase();
      const resultLabel = getResultLabel(match).toLowerCase();

      return (
        matchName.includes(query) ||
        competitionName.includes(query) ||
        venueName.includes(query) ||
        resultLabel.includes(query)
      );
    });
  }, [results, search]);

  const totalGoals = results.reduce((total, match) => {
    return total + numberFrom(match.homeScore) + numberFrom(match.awayScore);
  }, 0);

  const draws = results.filter((match) => {
    return (
      typeof match.homeScore === "number" &&
      typeof match.awayScore === "number" &&
      match.homeScore === match.awayScore
    );
  }).length;

  const homeWins = results.filter((match) => {
    return (
      typeof match.homeScore === "number" &&
      typeof match.awayScore === "number" &&
      match.homeScore > match.awayScore
    );
  }).length;

  const awayWins = results.filter((match) => {
    return (
      typeof match.homeScore === "number" &&
      typeof match.awayScore === "number" &&
      match.awayScore > match.homeScore
    );
  }).length;

  const latestResult = results[0];

  return (
    <AdminShell
      activeKey="results"
      title="Results"
      description="View completed matches and final scores."
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <Trophy size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            Result Management
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
            Review completed matches.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            Results update the league table, club records and public match
            history.
          </p>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Results summary
            </h2>

            <Link
              href="/admin/results/new"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              <Plus size={14} />
              Record result
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <CheckCircle2 size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {results.length}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Completed
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Trophy size={21} className="text-cyan-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {totalGoals}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Goals
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Shield size={21} className="text-violet-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {homeWins}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Home wins
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <UsersRound size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {draws + awayWins}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Away/draw
              </p>
            </div>
          </div>
        </article>
      </section>

      {latestResult ? (
        <section className="mt-5 rounded-[2rem] border border-cyan-400/20 bg-cyan-400/10 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">
                Latest result
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
                {getMatchName(latestResult)}
              </h2>
              <p className="mt-2 text-sm font-semibold text-white/45">
                {getScoreLabel(latestResult)} • {getResultLabel(latestResult)} •{" "}
                {formatDate(latestResult.scheduledAt)}
              </p>
            </div>

            <Link
              href={
                latestResult.id
                  ? `/admin/results/${latestResult.id}`
                  : "/admin/results"
              }
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 text-sm font-black text-[#07110f] transition hover:bg-cyan-200"
            >
              Open result
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-[-0.03em]">
              All results
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/40">
              Search and review completed match results.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:w-[340px]">
              <Search size={17} className="shrink-0 text-emerald-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search results..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/25"
              />
            </div>

            <Link
              href="/admin/results/new"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              <Plus size={16} />
              Record result
            </Link>
          </div>
        </div>

        {resultsQuery.isLoading ? (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
              <Loader2 className="animate-spin" size={18} />
              Loading results
            </div>
          </div>
        ) : resultsQuery.isError ? (
          <div className="mt-5 rounded-[1.5rem] border border-red-400/20 bg-red-400/10 p-5">
            <p className="text-sm font-black text-red-200">
              Could not load results.
            </p>
            <p className="mt-2 text-sm font-semibold text-white/45">
              Make sure the backend is running and your admin token is valid.
            </p>
          </div>
        ) : filteredResults.length > 0 ? (
          <>
            <div className="mt-5 hidden overflow-hidden rounded-[1.5rem] border border-white/10 xl:block">
              <div className="grid grid-cols-[1.2fr_130px_160px_150px_130px_90px] bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                <span>Match</span>
                <span>Score</span>
                <span>Competition</span>
                <span>Date</span>
                <span>Result</span>
                <span></span>
              </div>

              <div className="divide-y divide-white/10">
                {filteredResults.map((match, index) => {
                  const status = getMatchStatus(match);

                  return (
                    <div
                      key={match.id ?? `${getMatchName(match)}-${index}`}
                      className="grid grid-cols-[1.2fr_130px_160px_150px_130px_90px] items-center px-4 py-4"
                    >
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
                            {getVenueName(match)}
                          </p>
                        </div>
                      </div>

                      <p className="text-2xl font-black tracking-[-0.06em] text-white">
                        {getScoreLabel(match)}
                      </p>

                      <p className="truncate text-sm font-black text-white/70">
                        {getCompetitionName(match)}
                      </p>

                      <p className="text-xs font-bold text-white/40">
                        {formatDate(match.scheduledAt)}
                      </p>

                      <div>
                        <span
                          className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getStatusClass(
                            status,
                          )}`}
                        >
                          {getWinnerBadge(match)}
                        </span>
                      </div>

                      <Link
                        href={
                          match.id
                            ? `/admin/results/${match.id}`
                            : "/admin/results"
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
              {filteredResults.map((match, index) => (
                <Link
                  key={match.id ?? `${getMatchName(match)}-mobile-${index}`}
                  href={
                    match.id ? `/admin/results/${match.id}` : "/admin/results"
                  }
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <div className="text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 px-2 text-center text-xs font-black text-[#07110f]">
                        {getClubShortName(getHomeClub(match))}
                      </div>
                      <p className="mt-2 truncate text-xs font-black text-white">
                        {getClubName(getHomeClub(match))}
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-3xl font-black tracking-[-0.08em] text-white">
                        {getScoreLabel(match)}
                      </p>
                      <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-300">
                        Final
                      </p>
                    </div>

                    <div className="text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-cyan-300 px-2 text-center text-xs font-black text-[#07110f]">
                        {getClubShortName(getAwayClub(match))}
                      </div>
                      <p className="mt-2 truncate text-xs font-black text-white">
                        {getClubName(getAwayClub(match))}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                      <CalendarDays
                        className="mx-auto text-emerald-300"
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
                      <Trophy className="mx-auto text-cyan-300" size={16} />
                      <p className="mt-2 truncate text-xs font-black">
                        {getWinnerBadge(match)}
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                        Winner
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                      <MapPin className="mx-auto text-violet-300" size={16} />
                      <p className="mt-2 truncate text-xs font-black">
                        {getVenueName(match)}
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                        Venue
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <Trophy size={26} />
              </div>
              <h2 className="mt-5 text-xl font-black">No results found</h2>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/40">
                Completed matches will appear here after results are recorded.
              </p>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
