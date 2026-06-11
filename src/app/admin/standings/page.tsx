"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  Loader2,
  Medal,
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

type Season = {
  id?: string;
  name?: string;
  slug?: string;
  status?: string;
  isCurrent?: boolean;
};

type Competition = {
  id?: string;
  name?: string;
  slug?: string;
  type?: string;
  status?: string;
  season?: Season | null;
  _count?: {
    teams?: number;
    competitionTeams?: number;
    matches?: number;
    fixtures?: number;
  };
};

type Club = {
  id?: string;
  name?: string;
  shortName?: string;
  slug?: string;
};

type StandingRow = {
  position?: number;
  rank?: number;
  clubId?: string;
  teamId?: string;
  club?: Club | null;
  team?: Club | null;
  played?: number;
  matchesPlayed?: number;
  p?: number;
  mp?: number;
  wins?: number;
  won?: number;
  w?: number;
  draws?: number;
  drawn?: number;
  d?: number;
  losses?: number;
  lost?: number;
  l?: number;
  goalsFor?: number;
  gf?: number;
  goalsAgainst?: number;
  ga?: number;
  goalDifference?: number;
  gd?: number;
  points?: number;
  pts?: number;
  form?: string[] | string;
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

function getClub(row: StandingRow) {
  return row.club ?? row.team ?? null;
}

function getClubName(row: StandingRow) {
  const club = getClub(row);

  return club?.name || club?.shortName || "Unknown Club";
}

function getClubShortName(row: StandingRow) {
  const club = getClub(row);
  const rawShortName = club?.shortName?.trim();

  if (rawShortName && rawShortName.length <= 4) {
    return rawShortName.toUpperCase();
  }

  if (!club?.name) {
    return "FC";
  }

  const initials = club.name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return initials || "FC";
}

function getPosition(row: StandingRow, index: number) {
  return numberFrom(row.position, row.rank, index + 1);
}

function getPlayed(row: StandingRow) {
  return numberFrom(row.played, row.matchesPlayed, row.p, row.mp);
}

function getWins(row: StandingRow) {
  return numberFrom(row.wins, row.won, row.w);
}

function getDraws(row: StandingRow) {
  return numberFrom(row.draws, row.drawn, row.d);
}

function getLosses(row: StandingRow) {
  return numberFrom(row.losses, row.lost, row.l);
}

function getGoalsFor(row: StandingRow) {
  return numberFrom(row.goalsFor, row.gf);
}

function getGoalsAgainst(row: StandingRow) {
  return numberFrom(row.goalsAgainst, row.ga);
}

function getGoalDifference(row: StandingRow) {
  const existingValue = numberFrom(row.goalDifference, row.gd);

  if (existingValue !== 0) {
    return existingValue;
  }

  return getGoalsFor(row) - getGoalsAgainst(row);
}

function getPoints(row: StandingRow) {
  return numberFrom(row.points, row.pts);
}

function getCompetitionName(competition?: Competition | null) {
  return competition?.name || "Select competition";
}

function getSeasonName(competition?: Competition | null) {
  return competition?.season?.name || "No season";
}

function getCompetitionStatus(competition?: Competition | null) {
  return competition?.status || "DRAFT";
}

function getCompetitionType(competition?: Competition | null) {
  return competition?.type || "LEAGUE";
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("active") || normalized.includes("published")) {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (normalized.includes("completed") || normalized.includes("finished")) {
    return "bg-cyan-400/10 text-cyan-300";
  }

  if (normalized.includes("cancelled") || normalized.includes("archived")) {
    return "bg-red-400/10 text-red-200";
  }

  return "bg-white/[0.06] text-white/50";
}

function getPositionClass(position: number) {
  if (position === 1) {
    return "bg-yellow-400/15 text-yellow-200";
  }

  if (position <= 3) {
    return "bg-emerald-400/10 text-emerald-300";
  }

  return "bg-white/[0.06] text-white/55";
}

function getDifferenceLabel(value: number) {
  if (value > 0) return `+${value}`;
  return String(value);
}

function formatForm(value?: string[] | string) {
  if (Array.isArray(value)) {
    return value.slice(-5);
  }

  if (typeof value === "string" && value.trim()) {
    return value.split("").filter(Boolean).slice(-5);
  }

  return [];
}

function getFormClass(value: string) {
  const normalized = value.toLowerCase();

  if (normalized === "w") {
    return "bg-emerald-400 text-[#07110f]";
  }

  if (normalized === "d") {
    return "bg-white/20 text-white";
  }

  if (normalized === "l") {
    return "bg-red-400/80 text-white";
  }

  return "bg-white/10 text-white/50";
}

async function getArrayWithFallback<T>(paths: string[], keys: string[]) {
  for (const path of paths) {
    try {
      const response = await api.get<ApiResponse<unknown>>(path);
      return unwrapArray<T>(response.data.data, keys);
    } catch {
      // Try next endpoint.
    }
  }

  return [];
}

async function fetchCompetitions() {
  return getArrayWithFallback<Competition>(
    ["/admin/competitions", "/competitions", "/public/competitions"],
    ["competitions", "items", "data", "results"],
  );
}

async function fetchStandings(competitionId: string) {
  const possiblePaths = [
    `/admin/competitions/${competitionId}/table`,
    `/admin/competitions/${competitionId}/standings`,
    `/admin/standings?competitionId=${competitionId}`,
    `/competitions/${competitionId}/table`,
    `/competitions/${competitionId}/standings`,
    `/standings?competitionId=${competitionId}`,
    `/public/competitions/${competitionId}/table`,
  ];

  for (const path of possiblePaths) {
    try {
      const response = await api.get<ApiResponse<unknown>>(path);

      return unwrapArray<StandingRow>(response.data.data, [
        "table",
        "standings",
        "rows",
        "items",
        "data",
        "results",
      ]);
    } catch {
      // Try next endpoint.
    }
  }

  return [];
}

export default function AdminStandingsPage() {
  const [selectedCompetitionId, setSelectedCompetitionId] = useState("");
  const [search, setSearch] = useState("");

  const competitionsQuery = useQuery({
    queryKey: ["admin-competitions"],
    queryFn: fetchCompetitions,
  });

  const competitions = useMemo(
    () => competitionsQuery.data ?? [],
    [competitionsQuery.data],
  );

  const activeCompetitionId =
    selectedCompetitionId || competitions[0]?.id || "";

  const selectedCompetition = useMemo(() => {
    return competitions.find(
      (competition) => competition.id === activeCompetitionId,
    );
  }, [activeCompetitionId, competitions]);

  const standingsQuery = useQuery({
    queryKey: ["admin-standings", activeCompetitionId],
    queryFn: () => fetchStandings(activeCompetitionId),
    enabled: Boolean(activeCompetitionId),
  });

  const standings = useMemo(
    () => standingsQuery.data ?? [],
    [standingsQuery.data],
  );

  const sortedStandings = useMemo(() => {
    return [...standings].sort((a, b) => {
      const positionA = numberFrom(a.position, a.rank);
      const positionB = numberFrom(b.position, b.rank);

      if (positionA && positionB) {
        return positionA - positionB;
      }

      return getPoints(b) - getPoints(a);
    });
  }, [standings]);

  const filteredStandings = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return sortedStandings;
    }

    return sortedStandings.filter((row) => {
      const clubName = getClubName(row).toLowerCase();
      const shortName = getClubShortName(row).toLowerCase();

      return clubName.includes(query) || shortName.includes(query);
    });
  }, [search, sortedStandings]);

  const leader = sortedStandings[0];
  const totalPlayed = sortedStandings.reduce((total, row) => {
    return total + getPlayed(row);
  }, 0);
  const totalGoals = sortedStandings.reduce((total, row) => {
    return total + getGoalsFor(row);
  }, 0);
  const totalPoints = sortedStandings.reduce((total, row) => {
    return total + getPoints(row);
  }, 0);

  return (
    <AdminShell
      activeKey="standings"
      title="Standings"
      description="Review the generated league table."
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <BarChart3 size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            League Table
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
            Generated from completed results.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            The standings update from match results. Use this page to review
            rank, played matches, goal difference and points.
          </p>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Table summary
            </h2>

            <span
              className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${getStatusClass(
                getCompetitionStatus(selectedCompetition),
              )}`}
            >
              {getCompetitionStatus(selectedCompetition)}
            </span>
          </div>

          <div className="mt-5">
            <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
              Competition
            </label>

            <select
              value={activeCompetitionId}
              onChange={(event) => setSelectedCompetitionId(event.target.value)}
              disabled={competitionsQuery.isLoading}
              className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Select competition</option>
              {competitions.map((competition) => (
                <option key={competition.id} value={competition.id}>
                  {getCompetitionName(competition)}
                </option>
              ))}
            </select>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <UsersRound size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {sortedStandings.length}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Clubs
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <CheckCircle2 size={21} className="text-cyan-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {totalPlayed}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Played total
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Trophy size={21} className="text-yellow-200" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {totalGoals}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Goals for
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Shield size={21} className="text-violet-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {totalPoints}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Points
              </p>
            </div>
          </div>
        </article>
      </section>

      {leader ? (
        <section className="mt-5 rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 p-5 shadow-xl shadow-black/10">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-300 text-[#07110f]">
                <Medal size={26} />
              </div>

              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-yellow-200">
                  Current leader
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.05em] text-white">
                  {getClubName(leader)}
                </h2>
                <p className="mt-2 text-sm font-semibold text-white/45">
                  {getPoints(leader)} pts • {getPlayed(leader)} played • GD{" "}
                  {getDifferenceLabel(getGoalDifference(leader))}
                </p>
              </div>
            </div>

            <Link
              href="/admin/results/new"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-yellow-300 px-5 text-sm font-black text-[#07110f] transition hover:bg-yellow-200"
            >
              Record result
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </section>
      ) : null}

      <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-[-0.03em]">
              {getCompetitionName(selectedCompetition)}
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/40">
              {getSeasonName(selectedCompetition)} •{" "}
              {getCompetitionType(selectedCompetition)}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:w-[340px]">
              <Search size={17} className="shrink-0 text-emerald-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clubs..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/25"
              />
            </div>

            <Link
              href="/admin/results"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              View results
              <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>

        {competitionsQuery.isLoading || standingsQuery.isLoading ? (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
              <Loader2 className="animate-spin" size={18} />
              Loading standings
            </div>
          </div>
        ) : standingsQuery.isError ? (
          <div className="mt-5 rounded-[1.5rem] border border-red-400/20 bg-red-400/10 p-5">
            <p className="text-sm font-black text-red-200">
              Could not load standings.
            </p>
            <p className="mt-2 text-sm font-semibold text-white/45">
              Make sure the backend is running and this competition has a table
              endpoint.
            </p>
          </div>
        ) : filteredStandings.length > 0 ? (
          <>
            <div className="mt-5 hidden overflow-hidden rounded-[1.5rem] border border-white/10 xl:block">
              <div className="grid grid-cols-[80px_1.3fr_70px_70px_70px_70px_80px_80px_80px_90px_140px] bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
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
                <span>Form</span>
              </div>

              <div className="divide-y divide-white/10">
                {filteredStandings.map((row, index) => {
                  const position = getPosition(row, index);
                  const form = formatForm(row.form);

                  return (
                    <div
                      key={row.clubId ?? row.teamId ?? getClubName(row)}
                      className="grid grid-cols-[80px_1.3fr_70px_70px_70px_70px_80px_80px_80px_90px_140px] items-center px-4 py-4"
                    >
                      <div>
                        <span
                          className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-3 text-sm font-black ${getPositionClass(
                            position,
                          )}`}
                        >
                          {position}
                        </span>
                      </div>

                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 px-2 text-center text-xs font-black text-[#07110f]">
                          {getClubShortName(row)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {getClubName(row)}
                          </p>
                          <p className="mt-1 truncate text-xs font-bold text-white/35">
                            {getPlayed(row)} played
                          </p>
                        </div>
                      </div>

                      <p className="text-sm font-black text-white/70">
                        {getPlayed(row)}
                      </p>
                      <p className="text-sm font-black text-emerald-300">
                        {getWins(row)}
                      </p>
                      <p className="text-sm font-black text-white/70">
                        {getDraws(row)}
                      </p>
                      <p className="text-sm font-black text-red-200">
                        {getLosses(row)}
                      </p>
                      <p className="text-sm font-black text-white/70">
                        {getGoalsFor(row)}
                      </p>
                      <p className="text-sm font-black text-white/70">
                        {getGoalsAgainst(row)}
                      </p>
                      <p className="text-sm font-black text-white">
                        {getDifferenceLabel(getGoalDifference(row))}
                      </p>
                      <p className="text-2xl font-black tracking-[-0.06em] text-white">
                        {getPoints(row)}
                      </p>

                      <div className="flex items-center gap-1">
                        {form.length > 0 ? (
                          form.map((item, itemIndex) => (
                            <span
                              key={`${item}-${itemIndex}`}
                              className={`inline-flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-black uppercase ${getFormClass(
                                item,
                              )}`}
                            >
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs font-bold text-white/30">
                            No form
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-5 grid gap-3 xl:hidden">
              {filteredStandings.map((row, index) => {
                const position = getPosition(row, index);

                return (
                  <article
                    key={`${row.clubId ?? row.teamId ?? getClubName(row)}-mobile`}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span
                          className={`inline-flex h-10 min-w-10 items-center justify-center rounded-xl px-3 text-sm font-black ${getPositionClass(
                            position,
                          )}`}
                        >
                          {position}
                        </span>

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 px-2 text-center text-xs font-black text-[#07110f]">
                          {getClubShortName(row)}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {getClubName(row)}
                          </p>
                          <p className="mt-1 truncate text-xs font-bold text-white/35">
                            GD {getDifferenceLabel(getGoalDifference(row))}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-3xl font-black tracking-[-0.08em] text-white">
                          {getPoints(row)}
                        </p>
                        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-white/35">
                          Pts
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-6 gap-2">
                      {[
                        ["P", getPlayed(row)],
                        ["W", getWins(row)],
                        ["D", getDraws(row)],
                        ["L", getLosses(row)],
                        ["GF", getGoalsFor(row)],
                        ["GA", getGoalsAgainst(row)],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-2xl bg-white/[0.05] p-3 text-center"
                        >
                          <p className="text-sm font-black text-white">
                            {value}
                          </p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                            {label}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
            <div>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                <BarChart3 size={26} />
              </div>
              <h2 className="mt-5 text-xl font-black">No standings yet</h2>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/40">
                Add teams and record completed results to generate the league
                table.
              </p>
            </div>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
