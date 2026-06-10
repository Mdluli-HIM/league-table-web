"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarDays,
  CircleDot,
  Loader2,
  MapPin,
  Shield,
  Trophy,
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

function getWinnerLabel(match: Match) {
  const homeScore = numberFrom(match.homeScore);
  const awayScore = numberFrom(match.awayScore);

  if (homeScore === awayScore) {
    return "Draw";
  }

  if (match.winnerClub) {
    return `${getClubName(match.winnerClub)} won`;
  }

  return homeScore > awayScore
    ? `${getClubName(match.homeClub)} won`
    : `${getClubName(match.awayClub)} won`;
}

function getTotalGoals(match: Match) {
  return numberFrom(match.homeScore) + numberFrom(match.awayScore);
}

async function fetchResults() {
  const response = await api.get<ApiResponse<unknown>>("/public/results");

  return unwrapArray<Match>(response.data.data, [
    "results",
    "completedMatches",
    "matches",
    "items",
    "data",
  ]);
}

export default function ResultsPage() {
  const resultsQuery = useQuery({
    queryKey: ["public-results"],
    queryFn: fetchResults,
  });

  const results = resultsQuery.data ?? [];

  const totalGoals = results.reduce((total, match) => {
    return total + getTotalGoals(match);
  }, 0);

  return (
    <ViewerShell
      activeKey="results"
      sidebarLabel="Viewer Mode"
      sidebarValue="Completed matches"
    >
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 lg:hidden">
            <Link href="/" className="text-base font-black tracking-[-0.05em]">
              League<span className="text-[#087f8c]">Centre</span>
            </Link>
            <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#087f8c]">
              Results
            </span>
          </div>

          <p className="mt-3 text-sm font-black text-[#087f8c] lg:mt-0">
            Completed games
          </p>

          <h1 className="mt-1 text-4xl font-black tracking-[-0.07em] text-[#10201c] sm:text-5xl lg:text-6xl">
            Results
          </h1>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
            <CircleDot size={14} />
            {results.length} results
          </div>

          <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
            <Trophy size={14} />
            {totalGoals} goals
          </div>
        </div>
      </header>

      {resultsQuery.isLoading ? (
        <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60">
          <div className="flex items-center gap-2 text-sm font-black text-[#087f8c]">
            <Loader2 className="animate-spin" size={18} />
            Loading results
          </div>
        </div>
      ) : results.length > 0 ? (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {results.map((result) => (
            <article
              key={result.id}
              className="flex min-h-[320px] flex-col rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-[#087f8c]">
                    {result.competition?.name ?? "Competition"}
                  </p>

                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-black/50">
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays size={14} />
                      {formatDate(result.scheduledAt)}
                    </span>
                  </div>
                </div>

                <span className="shrink-0 rounded-full bg-[#10201c] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white">
                  FT
                </span>
              </div>

              <div className="mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="min-w-0 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
                    <Shield className="text-[#087f8c]" size={28} />
                  </div>
                  <p className="mt-3 truncate text-sm font-black">
                    {getClubName(result.homeClub)}
                  </p>
                </div>

                <div className="shrink-0 rounded-3xl bg-[#10201c] px-5 py-3 text-center text-xl font-black tracking-[-0.05em] text-white">
                  {numberFrom(result.homeScore)} -{" "}
                  {numberFrom(result.awayScore)}
                </div>

                <div className="min-w-0 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white shadow-sm">
                    <Shield className="text-[#087f8c]" size={28} />
                  </div>
                  <p className="mt-3 truncate text-sm font-black">
                    {getClubName(result.awayClub)}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl bg-white/50 px-4 py-3 text-center text-sm font-black text-[#087f8c]">
                {getWinnerLabel(result)}
              </div>

              <div className="mt-auto flex items-center gap-2 rounded-2xl bg-white/50 px-4 py-3 text-sm font-bold text-black/60">
                <MapPin size={16} className="shrink-0 text-[#087f8c]" />
                <span className="truncate">
                  {result.venue?.name ?? "Venue TBC"}
                </span>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="mt-8 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60 p-6 text-center">
          <div>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#087f8c]/10 text-[#087f8c]">
              <CircleDot size={28} />
            </div>
            <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
              No results yet
            </h2>
            <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-black/50">
              Completed results from the backend will appear here once match
              scores are submitted.
            </p>
          </div>
        </div>
      )}
    </ViewerShell>
  );
}
