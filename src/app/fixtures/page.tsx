"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock3, Loader2, MapPin, Shield } from "lucide-react";
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

function getClubName(club?: Club | null) {
  return club?.shortName || club?.name || "TBC";
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

async function fetchFixtures() {
  const response = await api.get<ApiResponse<unknown>>("/public/fixtures");

  return unwrapArray<Match>(response.data.data, [
    "fixtures",
    "upcomingFixtures",
    "matches",
    "items",
    "data",
  ]);
}

export default function FixturesPage() {
  const fixturesQuery = useQuery({
    queryKey: ["public-fixtures"],
    queryFn: fetchFixtures,
  });

  const fixtures = fixturesQuery.data ?? [];

  return (
    <ViewerShell
      activeKey="fixtures"
      sidebarLabel="Viewer Mode"
      sidebarValue="Upcoming matches"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/" className="text-base font-black tracking-[-0.05em]">
              League<span className="text-[#087f8c]">Centre</span>
            </Link>
            <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#087f8c]">
              Fixtures
            </span>
          </div>

          <p className="mt-3 text-sm font-black text-[#087f8c] lg:mt-0">
            Upcoming games
          </p>

          <h1 className="mt-1 text-4xl font-black tracking-[-0.07em] text-[#10201c] sm:text-5xl lg:text-6xl">
            Fixtures
          </h1>
        </div>

        <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
          <CalendarDays size={14} />
          {fixtures.length} scheduled
        </div>
      </header>

      {fixturesQuery.isLoading ? (
        <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60">
          <div className="flex items-center gap-2 text-sm font-black text-[#087f8c]">
            <Loader2 className="animate-spin" size={18} />
            Loading fixtures
          </div>
        </div>
      ) : fixtures.length > 0 ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {fixtures.map((fixture) => (
            <article
              key={fixture.id}
              className="flex min-h-[300px] flex-col rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087f8c]">
                    {fixture.competition?.name ?? "Competition"}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-black/50">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={14} />
                      {formatDate(fixture.scheduledAt)}
                    </span>

                    <span className="inline-flex items-center gap-1">
                      <Clock3 size={14} />
                      {formatTime(fixture.scheduledAt)}
                    </span>
                  </div>
                </div>

                <span className="shrink-0 rounded-full bg-[#087f8c]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#087f8c]">
                  {fixture.status ?? "SCHEDULED"}
                </span>
              </div>

              <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="min-w-0 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
                    <Shield className="text-[#087f8c]" size={28} />
                  </div>
                  <p className="mt-3 truncate text-sm font-black">
                    {getClubName(fixture.homeClub)}
                  </p>
                </div>

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff6b8a] text-xs font-black text-white">
                  VS
                </div>

                <div className="min-w-0 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
                    <Shield className="text-[#087f8c]" size={28} />
                  </div>
                  <p className="mt-3 truncate text-sm font-black">
                    {getClubName(fixture.awayClub)}
                  </p>
                </div>
              </div>

              <div className="mt-auto flex items-center gap-2 rounded-2xl bg-white/50 px-4 py-3 text-sm font-bold text-black/60">
                <MapPin size={16} className="shrink-0 text-[#087f8c]" />
                <span className="truncate">
                  {fixture.venue?.name ?? "Venue TBC"}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60 p-6 text-center">
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#087f8c]/10 text-[#087f8c]">
              <CalendarDays size={28} />
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
              No fixtures yet
            </h2>
            <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-black/50">
              Scheduled fixtures from the backend will appear here once they are
              created.
            </p>
          </div>
        </div>
      )}
    </ViewerShell>
  );
}
