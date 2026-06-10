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
  Trophy,
  UserRound,
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
  isActive?: boolean;
};

type Player = {
  id?: string;
  firstName?: string;
  lastName?: string;
};

type PlayerRegistration = {
  id?: string;
  jerseyNumber?: number | null;
  status?: string;
  player?: Player | null;
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

function getClubName(club?: Club | null) {
  return club?.name || club?.shortName || "Unknown Club";
}

function getClubShortName(club?: Club | null) {
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

function getPlayerName(registration: PlayerRegistration) {
  const firstName = registration.player?.firstName ?? "";
  const lastName = registration.player?.lastName ?? "";
  const fullName = `${firstName} ${lastName}`.trim();

  return fullName || "Unnamed Player";
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

async function fetchClubDetail(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/public/clubs/${id}`);
  const data = response.data.data;

  if (!isRecord(data)) {
    return {};
  }

  return data;
}

export default function ClubDetailPage() {
  const params = useParams<{ id: string }>();
  const clubId = params.id;

  const clubQuery = useQuery({
    queryKey: ["public-club-detail", clubId],
    queryFn: () => fetchClubDetail(clubId),
    enabled: Boolean(clubId),
  });

  const rawData = clubQuery.data ?? {};
  const nestedClub = isRecord(rawData.club) ? rawData.club : rawData;
  const club = nestedClub as Club;

  const squad = unwrapArray<PlayerRegistration>(rawData, [
    "squad",
    "playerRegistrations",
    "registrations",
  ]);

  const fixtures = unwrapArray<Match>(rawData, [
    "fixtures",
    "upcomingFixtures",
    "matches",
  ]).filter((match) => match.status !== "COMPLETED");

  const results = unwrapArray<Match>(rawData, [
    "results",
    "recentResults",
    "matches",
  ]).filter((match) => match.status === "COMPLETED");

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
                const active = item.href === "/clubs";

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
                Club Profile
              </p>
              <p className="mt-2 text-sm font-bold">{getClubName(club)}</p>
            </div>
          </aside>

          <div className="min-w-0 rounded-[1.6rem] bg-white/25 p-3 backdrop-blur-xl sm:p-4 lg:p-5">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <Link
                  href="/clubs"
                  className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-black text-[#087f8c] shadow-sm"
                >
                  <ArrowLeft size={14} />
                  Back to clubs
                </Link>

                <p className="mt-5 text-sm font-black text-[#087f8c]">
                  Club profile
                </p>

                <h1 className="mt-1 text-4xl font-black tracking-[-0.07em] text-[#10201c] sm:text-5xl lg:text-6xl">
                  {clubQuery.isLoading ? "Loading..." : getClubName(club)}
                </h1>
              </div>

              <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                <Shield size={14} />
                {club.isActive === false ? "Archived" : "Active club"}
              </div>
            </header>

            {clubQuery.isLoading ? (
              <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60">
                <div className="flex items-center gap-2 text-sm font-black text-[#087f8c]">
                  <Loader2 className="animate-spin" size={18} />
                  Loading club
                </div>
              </div>
            ) : (
              <>
                <div className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                  <article className="rounded-[1.7rem] border border-white/60 bg-gradient-to-br from-[#0891b2] to-[#0f766e] p-5 text-white shadow-xl shadow-[#0f766e]/20">
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] bg-white/15 px-2 text-center text-xl font-black leading-none">
                      {getClubShortName(club)}
                    </div>

                    <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-white/65">
                      Team Identity
                    </p>

                    <h2 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.06em]">
                      {getClubName(club)}
                    </h2>

                    <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-white/70">
                      Follow fixtures, recent scores and squad information for
                      this club.
                    </p>
                  </article>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#087f8c]/10 text-[#087f8c]">
                        <UsersRound size={23} />
                      </div>
                      <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-black/45">
                        Squad
                      </p>
                      <h3 className="mt-2 text-3xl font-black tracking-[-0.06em]">
                        {squad.length}
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
                        <Trophy size={23} />
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

                <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                  <section className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-black tracking-[-0.03em]">
                        Upcoming Fixtures
                      </h2>
                      <Link
                        href="/fixtures"
                        className="text-xs font-black text-[#087f8c]"
                      >
                        View all
                      </Link>
                    </div>

                    {fixtures.length > 0 ? (
                      <div className="mt-4 grid gap-3">
                        {fixtures.slice(0, 4).map((match) => (
                          <article
                            key={match.id}
                            className="rounded-[1.4rem] bg-white/55 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#087f8c]">
                                  {match.competition?.name ?? "Competition"}
                                </p>
                                <p className="mt-2 text-sm font-black">
                                  {getClubName(match.homeClub)} vs{" "}
                                  {getClubName(match.awayClub)}
                                </p>
                              </div>

                              <div className="rounded-full bg-[#ff6b8a] px-3 py-2 text-xs font-black text-white">
                                VS
                              </div>
                            </div>

                            <div className="mt-4 grid gap-2 text-xs font-bold text-black/50 sm:grid-cols-2">
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
                        <p className="text-sm font-black">
                          No upcoming fixtures
                        </p>
                        <p className="mt-2 text-xs font-semibold text-black/50">
                          This club has no scheduled fixtures yet.
                        </p>
                      </div>
                    )}
                  </section>

                  <section className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-black tracking-[-0.03em]">
                        Squad
                      </h2>
                      <span className="text-xs font-black uppercase tracking-[0.14em] text-[#087f8c]">
                        Players
                      </span>
                    </div>

                    {squad.length > 0 ? (
                      <div className="mt-4 grid gap-3">
                        {squad.slice(0, 8).map((registration, index) => (
                          <article
                            key={registration.id ?? index}
                            className="flex items-center justify-between gap-3 rounded-[1.3rem] bg-white/55 p-3"
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#087f8c]/10 text-[#087f8c]">
                                <UserRound size={18} />
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-black">
                                  {getPlayerName(registration)}
                                </p>
                                <p className="mt-1 text-xs font-bold text-black/45">
                                  {registration.status ?? "Registered"}
                                </p>
                              </div>
                            </div>

                            <div className="rounded-xl bg-white px-3 py-2 text-xs font-black text-[#087f8c]">
                              #{registration.jerseyNumber ?? "--"}
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.4rem] border border-dashed border-[#087f8c]/25 bg-white/45 p-6 text-center">
                        <p className="text-sm font-black">No squad yet</p>
                        <p className="mt-2 text-xs font-semibold text-black/50">
                          Registered players will appear here once added.
                        </p>
                      </div>
                    )}
                  </section>
                </div>

                <section className="mt-4 rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-black tracking-[-0.03em]">
                      Recent Results
                    </h2>
                    <Link
                      href="/results"
                      className="text-xs font-black text-[#087f8c]"
                    >
                      View all
                    </Link>
                  </div>

                  {results.length > 0 ? (
                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      {results.slice(0, 4).map((match) => (
                        <article
                          key={match.id}
                          className="rounded-[1.4rem] bg-white/55 p-4"
                        >
                          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                            <p className="truncate text-sm font-black">
                              {getClubName(match.homeClub)}
                            </p>

                            <div className="rounded-2xl bg-[#10201c] px-4 py-2 text-sm font-black text-white">
                              {getScore(match)}
                            </div>

                            <p className="truncate text-right text-sm font-black">
                              {getClubName(match.awayClub)}
                            </p>
                          </div>

                          <p className="mt-3 text-xs font-bold text-black/45">
                            {formatDate(match.scheduledAt)}
                          </p>
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.4rem] border border-dashed border-[#087f8c]/25 bg-white/45 p-6 text-center">
                      <p className="text-sm font-black">No recent results</p>
                      <p className="mt-2 text-xs font-semibold text-black/50">
                        Completed results will appear here.
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
            const Icon = item.icon;
            const active = item.href === "/clubs";

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
