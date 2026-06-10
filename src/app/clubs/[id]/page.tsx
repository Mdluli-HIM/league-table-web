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
  UserRound,
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
    <ViewerShell
      activeKey="clubs"
      sidebarLabel="Club Profile"
      sidebarValue={getClubName(club)}
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/clubs"
            className="inline-flex items-center gap-2 rounded-full bg-white/70 px-4 py-2 text-xs font-black text-[#087f8c] shadow-sm"
          >
            <ArrowLeft size={14} />
            Back to clubs
          </Link>

          <p className="mt-5 text-sm font-black text-[#087f8c]">Club profile</p>

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
                Follow fixtures, recent scores and squad information for this
                club.
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
                        <div className="min-w-0">
                          <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-[#087f8c]">
                            {match.competition?.name ?? "Competition"}
                          </p>
                          <p className="mt-2 truncate text-sm font-black">
                            {getClubName(match.homeClub)} vs{" "}
                            {getClubName(match.awayClub)}
                          </p>
                        </div>

                        <div className="shrink-0 rounded-full bg-[#ff6b8a] px-3 py-2 text-xs font-black text-white">
                          VS
                        </div>
                      </div>

                      <div className="mt-4 grid gap-2 text-xs font-bold text-black/50 sm:grid-cols-2">
                        <span>{formatDate(match.scheduledAt)}</span>
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <MapPin size={13} className="shrink-0" />
                          <span className="truncate">
                            {match.venue?.name ?? "Venue TBC"}
                          </span>
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[1.4rem] border border-dashed border-[#087f8c]/25 bg-white/45 p-6 text-center">
                  <p className="text-sm font-black">No upcoming fixtures</p>
                  <p className="mt-2 text-xs font-semibold text-black/50">
                    This club has no scheduled fixtures yet.
                  </p>
                </div>
              )}
            </section>

            <section className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">Squad</h2>
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
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#087f8c]/10 text-[#087f8c]">
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

                      <div className="shrink-0 rounded-xl bg-white px-3 py-2 text-xs font-black text-[#087f8c]">
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

                      <div className="shrink-0 rounded-2xl bg-[#10201c] px-4 py-2 text-sm font-black text-white">
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
    </ViewerShell>
  );
}
