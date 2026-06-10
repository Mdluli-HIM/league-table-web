"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CircleDot,
  Loader2,
  MapPin,
  Shield,
  Swords,
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

type CompetitionTeam = {
  id?: string;
  seed?: number | null;
  club?: Club | null;
};

type Competition = {
  id?: string;
  name?: string;
  slug?: string;
  type?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  season?: {
    id?: string;
    name?: string;
    slug?: string;
    isCurrent?: boolean;
  } | null;
  teams?: CompetitionTeam[];
  matches?: Match[];
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

function getCompetitionTypeLabel(type?: string) {
  if (type === "LEAGUE") return "League";
  if (type === "KNOCKOUT") return "Knockout";
  return "Competition";
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
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getScore(match: Match) {
  if (match.status !== "COMPLETED") {
    return "VS";
  }

  return `${numberFrom(match.homeScore)} - ${numberFrom(match.awayScore)}`;
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

function getWins(row: StandingRow) {
  return numberFrom(row.won, row.wins, row.w);
}

function getGoalDifference(row: StandingRow) {
  const value = numberFrom(row.goalDifference, row.gd);
  return value > 0 ? `+${value}` : `${value}`;
}

function getPoints(row: StandingRow) {
  return numberFrom(row.points, row.pts);
}

async function fetchCompetitionDetail(id: string) {
  const response = await api.get<ApiResponse<unknown>>(
    `/public/competitions/${id}`,
  );

  const data = response.data.data;

  if (!isRecord(data)) {
    return {};
  }

  return data;
}

async function fetchCompetitionTable(id: string) {
  const response = await api.get<ApiResponse<unknown>>(
    `/public/competitions/${id}/table`,
  );

  return unwrapArray<StandingRow>(response.data.data, [
    "standings",
    "table",
    "rows",
    "items",
    "data",
  ]);
}

export default function CompetitionDetailPage() {
  const params = useParams<{ id: string }>();
  const competitionId = params.id;

  const detailQuery = useQuery({
    queryKey: ["public-competition-detail", competitionId],
    queryFn: () => fetchCompetitionDetail(competitionId),
    enabled: Boolean(competitionId),
  });

  const rawData = detailQuery.data ?? {};
  const nestedCompetition = isRecord(rawData.competition)
    ? rawData.competition
    : rawData;

  const competition = nestedCompetition as Competition;

  const teams =
    competition.teams ??
    unwrapArray<CompetitionTeam>(rawData, ["teams", "competitionTeams"]);

  const allMatches =
    competition.matches ?? unwrapArray<Match>(rawData, ["matches"]);

  const fixtures = allMatches.filter((match) => match.status !== "COMPLETED");
  const results = allMatches.filter((match) => match.status === "COMPLETED");

  const tableQuery = useQuery({
    queryKey: ["public-competition-table", competitionId],
    queryFn: () => fetchCompetitionTable(competitionId),
    enabled: Boolean(competitionId) && competition.type === "LEAGUE",
  });

  const standings = tableQuery.data ?? [];
  const Icon = competition.type === "KNOCKOUT" ? Swords : Trophy;

  return (
    <ViewerShell
      activeKey="competitions"
      sidebarLabel="Competition"
      sidebarValue={competition.name ?? "Competition detail"}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/competitions"
            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-black text-[#087f8c] shadow-sm"
          >
            <ArrowLeft size={14} />
            Back to competitions
          </Link>

          <p className="mt-5 text-sm font-black text-[#087f8c]">
            {getCompetitionTypeLabel(competition.type)}
          </p>

          <h1 className="mt-1 text-4xl font-black tracking-[-0.07em] text-[#10201c] sm:text-5xl lg:text-6xl">
            {detailQuery.isLoading
              ? "Loading..."
              : (competition.name ?? "Competition")}
          </h1>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
          <Shield size={14} />
          {competition.status ?? "Status TBC"}
        </div>
      </header>

      {detailQuery.isLoading ? (
        <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60">
          <div className="flex items-center gap-2 text-sm font-black text-[#087f8c]">
            <Loader2 className="animate-spin" size={18} />
            Loading competition
          </div>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
            <article className="rounded-[1.7rem] border border-white/60 bg-gradient-to-br from-[#0891b2] to-[#0f766e] p-5 text-white shadow-xl shadow-[#0f766e]/20">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
                <Icon size={30} />
              </div>

              <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-white/65">
                Competition Centre
              </p>

              <h2 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.06em]">
                {competition.name ?? "Competition"}
              </h2>

              <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-white/70">
                {competition.type === "KNOCKOUT"
                  ? "Cup-style tournament with bracket rounds, fixtures and results."
                  : "League competition with teams, fixtures, results and standings."}
              </p>
            </article>

            <div className="grid gap-4 sm:grid-cols-3">
              <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#087f8c]/10 text-[#087f8c]">
                  <UsersRound size={23} />
                </div>
                <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-black/45">
                  Teams
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.06em]">
                  {teams.length}
                </h3>
              </article>

              <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8b5cf6]/15 text-[#8b5cf6]">
                  <CalendarDays size={23} />
                </div>
                <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-black/45">
                  Fixtures
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.06em]">
                  {fixtures.length}
                </h3>
              </article>

              <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ff6b8a]/15 text-[#ff6b8a]">
                  <CircleDot size={23} />
                </div>
                <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-black/45">
                  Results
                </p>
                <h3 className="mt-2 text-3xl font-black tracking-[-0.06em]">
                  {results.length}
                </h3>
              </article>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <section className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">Teams</h2>
                <span className="text-xs font-black uppercase tracking-[0.14em] text-[#087f8c]">
                  {teams.length} clubs
                </span>
              </div>

              {teams.length > 0 ? (
                <div className="mt-4 grid gap-3">
                  {teams.map((team, index) => (
                    <article
                      key={team.id ?? `${team.club?.id}-${index}`}
                      className="flex items-center justify-between gap-3 rounded-[1.3rem] bg-white/55 p-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#087f8c]/10 text-[#087f8c]">
                          <Shield size={18} />
                        </div>

                        <div className="min-w-0">
                          <p className="truncate text-sm font-black">
                            {getClubName(team.club)}
                          </p>
                          <p className="mt-1 text-xs font-bold text-black/45">
                            Seed {team.seed ?? index + 1}
                          </p>
                        </div>
                      </div>

                      {team.club?.id ? (
                        <Link
                          href={`/clubs/${team.club.id}`}
                          className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#087f8c]"
                        >
                          View
                        </Link>
                      ) : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.4rem] border border-dashed border-[#087f8c]/25 bg-white/45 p-6 text-center">
                  <p className="text-sm font-black">No teams yet</p>
                  <p className="mt-2 text-xs font-semibold text-black/50">
                    Teams added to this competition will appear here.
                  </p>
                </div>
              )}
            </section>

            {competition.type === "LEAGUE" ? (
              <section className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    Standings
                  </h2>
                  <Link
                    href="/table"
                    className="text-xs font-black text-[#087f8c]"
                  >
                    Full table
                  </Link>
                </div>

                {tableQuery.isLoading ? (
                  <div className="mt-4 flex items-center justify-center gap-2 rounded-[1.4rem] bg-white/45 p-8 text-sm font-black text-[#087f8c]">
                    <Loader2 className="animate-spin" size={16} />
                    Loading table
                  </div>
                ) : standings.length > 0 ? (
                  <div className="mt-4 divide-y divide-[#0f766e]/10">
                    {standings.slice(0, 6).map((row, index) => (
                      <div
                        key={`${getStandingClubName(row)}-${index}`}
                        className="grid grid-cols-[32px_1fr_42px_42px_42px_48px] items-center py-3 text-xs sm:text-sm"
                      >
                        <span className="font-black text-black/50">
                          {index + 1}
                        </span>
                        <span className="truncate font-black">
                          {getStandingClubName(row)}
                        </span>
                        <span className="font-bold text-black/55">
                          {getPlayed(row)}
                        </span>
                        <span className="font-bold text-black/55">
                          {getWins(row)}
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
              </section>
            ) : (
              <section className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    Bracket
                  </h2>
                  <span className="text-xs font-black uppercase tracking-[0.14em] text-[#087f8c]">
                    Knockout
                  </span>
                </div>

                <div className="mt-4 rounded-[1.4rem] border border-dashed border-[#087f8c]/25 bg-white/45 p-6 text-center">
                  <p className="text-sm font-black">Bracket view coming next</p>
                  <p className="mt-2 text-xs font-semibold text-black/50">
                    We will connect this to the knockout bracket endpoint.
                  </p>
                </div>
              </section>
            )}
          </div>

          <section className="mt-4 rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-[-0.03em]">Matches</h2>
              <span className="text-xs font-black uppercase tracking-[0.14em] text-[#087f8c]">
                Fixtures + results
              </span>
            </div>

            {allMatches.length > 0 ? (
              <div className="mt-4 grid gap-3 xl:grid-cols-2">
                {allMatches.map((match) => (
                  <article
                    key={match.id}
                    className="rounded-[1.4rem] bg-white/55 p-4"
                  >
                    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                      <p className="truncate text-sm font-black">
                        {getClubName(match.homeClub)}
                      </p>

                      <div
                        className={`rounded-2xl px-4 py-2 text-sm font-black ${
                          match.status === "COMPLETED"
                            ? "bg-[#10201c] text-white"
                            : "bg-[#ff6b8a] text-white"
                        }`}
                      >
                        {getScore(match)}
                      </div>

                      <p className="truncate text-right text-sm font-black">
                        {getClubName(match.awayClub)}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs font-bold text-black/45 sm:grid-cols-2">
                      <span>{formatDate(match.scheduledAt)}</span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={13} />
                        {match.venue?.name ?? "Venue TBC"}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[1.4rem] border border-dashed border-[#087f8c]/25 bg-white/45 p-6 text-center">
                <p className="text-sm font-black">No matches yet</p>
                <p className="mt-2 text-xs font-semibold text-black/50">
                  Fixtures and results will appear here.
                </p>
              </div>
            )}
          </section>
        </>
      )}
    </ViewerShell>
  );
}
