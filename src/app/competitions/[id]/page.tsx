"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CircleDot,
  Home,
  ListOrdered,
  Loader2,
  MapPin,
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
                const NavIcon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex h-12 items-center gap-3 rounded-2xl px-4 text-sm font-bold text-[#08736f] transition hover:bg-white/40"
                  >
                    <NavIcon size={18} />
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
                {competition.name ?? "Competition detail"}
              </p>
            </div>
          </aside>

          <div className="min-w-0 rounded-[1.6rem] bg-white/25 p-3 backdrop-blur-xl sm:p-4 lg:p-5">
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
                      <h2 className="text-lg font-black tracking-[-0.03em]">
                        Teams
                      </h2>
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
                        <p className="text-sm font-black">
                          Bracket view coming next
                        </p>
                        <p className="mt-2 text-xs font-semibold text-black/50">
                          We will connect this to the knockout bracket endpoint.
                        </p>
                      </div>
                    </section>
                  )}
                </div>

                <section className="mt-4 rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black tracking-[-0.03em]">
                      Matches
                    </h2>
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
          </div>
        </div>
      </section>

      <nav className="fixed inset-x-3 bottom-3 z-20 rounded-[1.5rem] border border-white/70 bg-white/75 p-2 shadow-2xl shadow-black/10 backdrop-blur-xl lg:hidden">
        <div className="grid grid-cols-5">
          {navItems.map((item) => {
            const NavIcon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center gap-1 rounded-2xl py-2 text-[10px] font-black text-[#08736f]"
              >
                <NavIcon size={17} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
