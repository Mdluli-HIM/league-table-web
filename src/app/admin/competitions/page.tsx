"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  Loader2,
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

type Season = {
  id?: string;
  name?: string;
  status?: string;
  isCurrent?: boolean;
};

type Competition = {
  id?: string;
  name?: string;
  slug?: string;
  type?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  season?: Season | null;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    competitionTeams?: number;
    teams?: number;
    fixtures?: number;
    matches?: number;
  };
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

function getCompetitionName(competition: Competition) {
  return competition.name || "Untitled Competition";
}

function getCompetitionType(competition: Competition) {
  return competition.type || "Competition";
}

function getCompetitionStatus(competition: Competition) {
  return competition.status || "Draft";
}

function getSeasonName(competition: Competition) {
  return competition.season?.name || "No season";
}

function getTeamCount(competition: Competition) {
  return numberFrom(
    competition._count?.competitionTeams,
    competition._count?.teams,
  );
}

function getMatchCount(competition: Competition) {
  return numberFrom(competition._count?.fixtures, competition._count?.matches);
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

async function fetchAdminCompetitions() {
  const response = await api.get<ApiResponse<unknown>>("/admin/competitions");

  return unwrapArray<Competition>(response.data.data, [
    "competitions",
    "items",
    "data",
    "results",
  ]);
}

export default function AdminCompetitionsPage() {
  const [search, setSearch] = useState("");

  const competitionsQuery = useQuery({
    queryKey: ["admin-competitions"],
    queryFn: fetchAdminCompetitions,
  });

  const competitions = useMemo(
    () => competitionsQuery.data ?? [],
    [competitionsQuery.data],
  );

  const filteredCompetitions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return competitions;
    }

    return competitions.filter((competition) => {
      const name = getCompetitionName(competition).toLowerCase();
      const type = getCompetitionType(competition).toLowerCase();
      const status = getCompetitionStatus(competition).toLowerCase();
      const season = getSeasonName(competition).toLowerCase();

      return (
        name.includes(query) ||
        type.includes(query) ||
        status.includes(query) ||
        season.includes(query)
      );
    });
  }, [competitions, search]);

  const activeCompetitions = competitions.filter((competition) => {
    const status = getCompetitionStatus(competition).toLowerCase();
    return status.includes("active") || status.includes("published");
  }).length;

  const totalTeams = competitions.reduce((total, competition) => {
    return total + getTeamCount(competition);
  }, 0);

  const totalMatches = competitions.reduce((total, competition) => {
    return total + getMatchCount(competition);
  }, 0);

  return (
    <AdminShell
      activeKey="competitions"
      title="Competitions"
      description="Manage leagues, cups, seasons and competition structures."
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <Trophy size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            Competition Management
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
            Control the structure of the league.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            Competitions connect clubs, fixtures, results and standings into one
            official season structure.
          </p>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Competition summary
            </h2>

            <Link
              href="/admin/competitions/new"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              <Plus size={14} />
              New competition
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Trophy size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {competitions.length}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Total
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Shield size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {activeCompetitions}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Active
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <UsersRound size={21} className="text-cyan-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {totalTeams}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Teams
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <CalendarDays size={21} className="text-violet-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {totalMatches}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Matches
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-[-0.03em]">
              All competitions
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/40">
              Search, review and open competition records.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:w-[340px]">
              <Search size={17} className="shrink-0 text-emerald-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search competitions..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/25"
              />
            </div>

            <Link
              href="/admin/competitions/new"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              <Plus size={16} />
              New competition
            </Link>
          </div>
        </div>

        {competitionsQuery.isLoading ? (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
              <Loader2 className="animate-spin" size={18} />
              Loading competitions
            </div>
          </div>
        ) : competitionsQuery.isError ? (
          <div className="mt-5 rounded-[1.5rem] border border-red-400/20 bg-red-400/10 p-5">
            <p className="text-sm font-black text-red-200">
              Could not load competitions.
            </p>
            <p className="mt-2 text-sm font-semibold text-white/45">
              Make sure the backend is running and your admin token is valid.
            </p>
          </div>
        ) : filteredCompetitions.length > 0 ? (
          <>
            <div className="mt-5 hidden overflow-hidden rounded-[1.5rem] border border-white/10 lg:block">
              <div className="grid grid-cols-[1fr_140px_150px_120px_120px_90px] bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                <span>Competition</span>
                <span>Type</span>
                <span>Season</span>
                <span>Status</span>
                <span>Teams</span>
                <span></span>
              </div>

              <div className="divide-y divide-white/10">
                {filteredCompetitions.map((competition, index) => {
                  const status = getCompetitionStatus(competition);

                  return (
                    <div
                      key={
                        competition.id ??
                        `${getCompetitionName(competition)}-${index}`
                      }
                      className="grid grid-cols-[1fr_140px_150px_120px_120px_90px] items-center px-4 py-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 text-[#07110f]">
                          <Trophy size={19} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {getCompetitionName(competition)}
                          </p>
                          <p className="mt-1 truncate text-xs font-bold text-white/35">
                            {competition.slug ?? "No slug"}
                          </p>
                        </div>
                      </div>

                      <p className="truncate text-sm font-black text-white/70">
                        {getCompetitionType(competition)}
                      </p>

                      <p className="truncate text-sm font-black text-white/70">
                        {getSeasonName(competition)}
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

                      <p className="text-sm font-black text-white/70">
                        {getTeamCount(competition)}
                      </p>

                      <Link
                        href={
                          competition.id
                            ? `/admin/competitions/${competition.id}`
                            : "/admin/competitions"
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

            <div className="mt-5 grid gap-3 lg:hidden">
              {filteredCompetitions.map((competition, index) => {
                const status = getCompetitionStatus(competition);

                return (
                  <Link
                    key={
                      competition.id ??
                      `${getCompetitionName(competition)}-mobile-${index}`
                    }
                    href={
                      competition.id
                        ? `/admin/competitions/${competition.id}`
                        : "/admin/competitions"
                    }
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 text-[#07110f]">
                          <Trophy size={19} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black text-white">
                            {getCompetitionName(competition)}
                          </p>
                          <p className="mt-1 truncate text-xs font-bold text-white/35">
                            {getSeasonName(competition)}
                          </p>
                        </div>
                      </div>

                      <ArrowUpRight
                        size={17}
                        className="shrink-0 text-white/35"
                      />
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                        <p className="truncate text-sm font-black">
                          {getCompetitionType(competition)}
                        </p>
                        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                          Type
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                        <p className="text-sm font-black">
                          {getTeamCount(competition)}
                        </p>
                        <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                          Teams
                        </p>
                      </div>

                      <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                        <p className="truncate text-sm font-black">{status}</p>
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
                <Trophy size={26} />
              </div>
              <h2 className="mt-5 text-xl font-black">No competitions found</h2>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/40">
                Try a different search or create your first competition.
              </p>
            </div>
          </div>
        )}
      </section>

      <section className="mt-5 grid gap-4 lg:grid-cols-3">
        <article className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
          <CircleDot size={22} className="text-emerald-300" />
          <h3 className="mt-5 text-lg font-black tracking-[-0.04em]">
            Create structure
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
            Start by creating a league or cup competition for the season.
          </p>
        </article>

        <article className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
          <UsersRound size={22} className="text-cyan-300" />
          <h3 className="mt-5 text-lg font-black tracking-[-0.04em]">
            Add teams
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
            Connect clubs to the competition before scheduling fixtures.
          </p>
        </article>

        <article className="rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
          <CalendarDays size={22} className="text-violet-300" />
          <h3 className="mt-5 text-lg font-black tracking-[-0.04em]">
            Schedule matches
          </h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
            Fixtures and results will feed the public league table.
          </p>
        </article>
      </section>
    </AdminShell>
  );
}
