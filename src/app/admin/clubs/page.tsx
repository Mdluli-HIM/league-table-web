"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Loader2,
  Plus,
  Search,
  Shield,
  Trophy,
  UserRound,
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
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    competitionTeams?: number;
    playerRegistrations?: number;
    matchesHome?: number;
    matchesAway?: number;
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

function getClubName(club: Club) {
  return club.name || club.shortName || "Unknown Club";
}

function getClubShortName(club: Club) {
  const rawShortName = club.shortName?.trim();

  if (rawShortName && rawShortName.length <= 4) {
    return rawShortName.toUpperCase();
  }

  if (!club.name) {
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

function formatDate(value?: string) {
  if (!value) return "Date TBC";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date TBC";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

async function fetchAdminClubs() {
  const response = await api.get<ApiResponse<unknown>>("/admin/clubs");

  return unwrapArray<Club>(response.data.data, [
    "clubs",
    "items",
    "data",
    "results",
  ]);
}

export default function AdminClubsPage() {
  const [search, setSearch] = useState("");

  const clubsQuery = useQuery({
    queryKey: ["admin-clubs"],
    queryFn: fetchAdminClubs,
  });

  const clubs = useMemo(() => clubsQuery.data ?? [], [clubsQuery.data]);

  const filteredClubs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return clubs;
    }

    return clubs.filter((club) => {
      const name = getClubName(club).toLowerCase();
      const shortName = getClubShortName(club).toLowerCase();

      return name.includes(query) || shortName.includes(query);
    });
  }, [clubs, search]);

  const activeClubs = clubs.filter((club) => club.isActive !== false).length;
  const archivedClubs = clubs.length - activeClubs;

  const totalPlayers = clubs.reduce((total, club) => {
    return total + numberFrom(club._count?.playerRegistrations);
  }, 0);

  const totalCompetitionEntries = clubs.reduce((total, club) => {
    return total + numberFrom(club._count?.competitionTeams);
  }, 0);

  return (
    <AdminShell
      activeKey="clubs"
      title="Clubs"
      description="Manage clubs that appear in the public league centre."
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <UsersRound size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            Club Management
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
            Maintain the clubs in your league.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            Clubs created here will be used across competitions, fixtures,
            results, tables and the public club directory.
          </p>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Club summary
            </h2>

            <Link
              href="/admin/clubs/new"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              <Plus size={14} />
              New club
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <UsersRound size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {clubs.length}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Total clubs
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Shield size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {activeClubs}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Active
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <UserRound size={21} className="text-cyan-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {totalPlayers}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Players
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Trophy size={21} className="text-violet-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {totalCompetitionEntries}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Entries
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-[-0.03em]">All clubs</h2>
            <p className="mt-1 text-sm font-semibold text-white/40">
              Search, review and open club records.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:w-[320px]">
              <Search size={17} className="shrink-0 text-emerald-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search clubs..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/25"
              />
            </div>

            <Link
              href="/admin/clubs/new"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              <Plus size={16} />
              New club
            </Link>
          </div>
        </div>

        {clubsQuery.isLoading ? (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
              <Loader2 className="animate-spin" size={18} />
              Loading clubs
            </div>
          </div>
        ) : clubsQuery.isError ? (
          <div className="mt-5 rounded-[1.5rem] border border-red-400/20 bg-red-400/10 p-5">
            <p className="text-sm font-black text-red-200">
              Could not load clubs.
            </p>
            <p className="mt-2 text-sm font-semibold text-white/45">
              Make sure the backend is running and your admin token is valid.
            </p>
          </div>
        ) : filteredClubs.length > 0 ? (
          <>
            <div className="mt-5 hidden overflow-hidden rounded-[1.5rem] border border-white/10 lg:block">
              <div className="grid grid-cols-[1fr_120px_120px_120px_120px_90px] bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                <span>Club</span>
                <span>Players</span>
                <span>Entries</span>
                <span>Status</span>
                <span>Created</span>
                <span></span>
              </div>

              <div className="divide-y divide-white/10">
                {filteredClubs.map((club, index) => (
                  <div
                    key={club.id ?? `${getClubName(club)}-${index}`}
                    className="grid grid-cols-[1fr_120px_120px_120px_120px_90px] items-center px-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 text-sm font-black text-[#07110f]">
                        {getClubShortName(club)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {getClubName(club)}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-white/35">
                          {club.slug ?? "No slug"}
                        </p>
                      </div>
                    </div>

                    <p className="text-sm font-black text-white/70">
                      {numberFrom(club._count?.playerRegistrations)}
                    </p>

                    <p className="text-sm font-black text-white/70">
                      {numberFrom(club._count?.competitionTeams)}
                    </p>

                    <div>
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                          club.isActive === false
                            ? "bg-red-400/10 text-red-200"
                            : "bg-emerald-400/10 text-emerald-300"
                        }`}
                      >
                        {club.isActive === false ? "Archived" : "Active"}
                      </span>
                    </div>

                    <p className="text-xs font-bold text-white/40">
                      {formatDate(club.createdAt)}
                    </p>

                    <Link
                      href={
                        club.id ? `/admin/clubs/${club.id}` : "/admin/clubs"
                      }
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white/8 text-white transition hover:bg-emerald-400 hover:text-[#07110f]"
                    >
                      <ArrowUpRight size={16} />
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 grid gap-3 lg:hidden">
              {filteredClubs.map((club, index) => (
                <Link
                  key={club.id ?? `${getClubName(club)}-mobile-${index}`}
                  href={club.id ? `/admin/clubs/${club.id}` : "/admin/clubs"}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 text-sm font-black text-[#07110f]">
                        {getClubShortName(club)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {getClubName(club)}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-white/35">
                          {club.slug ?? "No slug"}
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
                      <p className="text-sm font-black">
                        {numberFrom(club._count?.playerRegistrations)}
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                        Players
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                      <p className="text-sm font-black">
                        {numberFrom(club._count?.competitionTeams)}
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                        Entries
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                      <p className="text-sm font-black">
                        {club.isActive === false ? "Off" : "On"}
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                        Status
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
                <UsersRound size={26} />
              </div>
              <h2 className="mt-5 text-xl font-black">No clubs found</h2>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/40">
                Try a different search or create your first club.
              </p>
            </div>
          </div>
        )}

        {archivedClubs > 0 ? (
          <p className="mt-4 text-xs font-bold text-white/35">
            {archivedClubs} archived club{archivedClubs === 1 ? "" : "s"} are
            included in this admin view.
          </p>
        ) : null}
      </section>
    </AdminShell>
  );
}
