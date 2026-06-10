"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
  CircleDot,
  Home,
  ListOrdered,
  Loader2,
  Search,
  Shield,
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
  isActive?: boolean;
  createdAt?: string;
  _count?: {
    competitionTeams?: number;
    playerRegistrations?: number;
    matchesHome?: number;
    matchesAway?: number;
  };
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

async function fetchClubs() {
  const response = await api.get<ApiResponse<unknown>>("/public/clubs");

  return unwrapArray<Club>(response.data.data, [
    "clubs",
    "activeClubs",
    "items",
    "data",
  ]);
}

export default function ClubsPage() {
  const [search, setSearch] = useState("");

  const clubsQuery = useQuery({
    queryKey: ["public-clubs"],
    queryFn: fetchClubs,
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

  const totalPlayers = clubs.reduce((total, club) => {
    return total + numberFrom(club._count?.playerRegistrations);
  }, 0);

  const totalCompetitionEntries = clubs.reduce((total, club) => {
    return total + numberFrom(club._count?.competitionTeams);
  }, 0);

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
                Viewer Mode
              </p>
              <p className="mt-2 text-sm font-bold">Club directory</p>
            </div>
          </aside>

          <div className="min-w-0 rounded-[1.6rem] bg-white/25 p-3 backdrop-blur-xl sm:p-4 lg:p-5">
            <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex items-center gap-2 lg:hidden">
                  <Link
                    href="/"
                    className="text-base font-black tracking-[-0.05em]"
                  >
                    League<span className="text-[#087f8c]">Centre</span>
                  </Link>
                  <span className="rounded-full bg-white/60 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#087f8c]">
                    Clubs
                  </span>
                </div>

                <p className="mt-3 text-sm font-black text-[#087f8c] lg:mt-0">
                  Competing teams
                </p>

                <h1 className="mt-1 text-4xl font-black tracking-[-0.07em] text-[#10201c] sm:text-5xl lg:text-6xl">
                  Clubs
                </h1>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                  <UsersRound size={14} />
                  {activeClubs} active
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                  <Trophy size={14} />
                  {totalCompetitionEntries} entries
                </div>

                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/80 px-4 py-3 text-xs font-black text-[#087f8c] shadow-sm">
                  <Shield size={14} />
                  {totalPlayers} players
                </div>
              </div>
            </header>

            <div className="mt-6 grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
              <article className="rounded-[1.7rem] border border-white/60 bg-gradient-to-br from-[#0891b2] to-[#0f766e] p-5 text-white shadow-xl shadow-[#0f766e]/20">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
                  <UsersRound size={24} />
                </div>

                <p className="mt-8 text-xs font-black uppercase tracking-[0.18em] text-white/65">
                  League Clubs
                </p>

                <h2 className="mt-2 text-4xl font-black leading-[0.95] tracking-[-0.06em]">
                  {clubs.length} teams listed.
                </h2>

                <p className="mt-4 max-w-sm text-sm font-semibold leading-6 text-white/70">
                  Browse every club competing in the league. Club detail pages
                  will show squads, fixtures and recent results next.
                </p>
              </article>

              <article className="rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#087f8c]">
                  Find a club
                </p>

                <div className="mt-5 flex h-14 items-center gap-3 rounded-2xl border border-[#0f766e]/10 bg-white/55 px-4">
                  <Search size={18} className="text-[#087f8c]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by club name..."
                    className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-[#10201c] outline-none placeholder:text-black/35"
                  />
                </div>

                <div className="mt-5 grid grid-cols-3 gap-3">
                  <div className="rounded-2xl bg-white/55 p-4 text-center">
                    <p className="text-xl font-black">{clubs.length}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-black/35">
                      Total
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/55 p-4 text-center">
                    <p className="text-xl font-black">{activeClubs}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-black/35">
                      Active
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/55 p-4 text-center">
                    <p className="text-xl font-black">{filteredClubs.length}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.14em] text-black/35">
                      Showing
                    </p>
                  </div>
                </div>
              </article>
            </div>

            {clubsQuery.isLoading ? (
              <div className="mt-4 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60">
                <div className="flex items-center gap-2 text-sm font-black text-[#087f8c]">
                  <Loader2 className="animate-spin" size={18} />
                  Loading clubs
                </div>
              </div>
            ) : filteredClubs.length > 0 ? (
              <section className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredClubs.map((club, index) => {
                  const clubHref = club.id ? `/clubs/${club.id}` : "/clubs";
                  const shortName = getClubShortName(club);

                  return (
                    <Link
                      key={club.id ?? `${getClubName(club)}-${index}`}
                      href={clubHref}
                      className="group flex min-h-[300px] flex-col rounded-[1.7rem] border border-white/60 bg-white/60 p-5 shadow-lg shadow-[#5c7c7c]/10 transition hover:-translate-y-1 hover:bg-white/75"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-[#087f8c] px-2 text-center text-base font-black leading-none text-white shadow-lg shadow-[#087f8c]/20">
                          {shortName}
                        </div>

                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-[#087f8c] transition group-hover:rotate-12">
                          <ArrowUpRight size={17} />
                        </div>
                      </div>

                      <div className="mt-8">
                        <p className="text-xs font-black uppercase tracking-[0.16em] text-[#087f8c]">
                          Club
                        </p>

                        <h2 className="mt-2 text-2xl font-black leading-none tracking-[-0.05em]">
                          {getClubName(club)}
                        </h2>

                        <p className="mt-3 text-sm font-semibold leading-6 text-black/50">
                          {club.isActive === false
                            ? "This club is currently archived."
                            : "Active club competing in the league."}
                        </p>
                      </div>

                      <div className="mt-auto grid grid-cols-3 gap-2 pt-6">
                        <div className="rounded-2xl bg-white/55 p-3 text-center">
                          <p className="text-sm font-black">
                            {numberFrom(club._count?.playerRegistrations)}
                          </p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-black/35">
                            Players
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white/55 p-3 text-center">
                          <p className="text-sm font-black">
                            {numberFrom(club._count?.competitionTeams)}
                          </p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-black/35">
                            Entries
                          </p>
                        </div>

                        <div className="rounded-2xl bg-white/55 p-3 text-center">
                          <p className="text-sm font-black">
                            {club.isActive === false ? "Off" : "On"}
                          </p>
                          <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-black/35">
                            Status
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </section>
            ) : (
              <div className="mt-4 flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-white/60 bg-white/60 p-6 text-center">
                <div>
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-[#087f8c]/10 text-[#087f8c]">
                    <UsersRound size={28} />
                  </div>
                  <h2 className="mt-5 text-2xl font-black tracking-[-0.04em]">
                    No clubs found
                  </h2>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-black/50">
                    Clubs created in the backend will appear here.
                  </p>
                </div>
              </div>
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
