"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CalendarDays,
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
};

type PlayerRegistration = {
  id?: string;
  jerseyNumber?: number | null;
  status?: string;
  club?: Club | null;
  competitionTeam?: {
    id?: string;
    club?: Club | null;
  } | null;
};

type Player = {
  id?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  position?: string | null;
  status?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  registrations?: PlayerRegistration[];
  playerRegistrations?: PlayerRegistration[];
  _count?: {
    registrations?: number;
    playerRegistrations?: number;
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

function getPlayerName(player: Player) {
  const fullName = `${player.firstName ?? ""} ${player.lastName ?? ""}`.trim();

  return player.displayName || fullName || "Unnamed Player";
}

function getPlayerInitials(player: Player) {
  const name = getPlayerName(player);

  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return initials || "PL";
}

function getRegistrations(player: Player) {
  return player.playerRegistrations ?? player.registrations ?? [];
}

function getRegistrationCount(player: Player) {
  return numberFrom(
    player._count?.playerRegistrations,
    player._count?.registrations,
    getRegistrations(player).length,
  );
}

function getPrimaryClubName(player: Player) {
  const registrations = getRegistrations(player);
  const firstRegistration = registrations[0];

  const club =
    firstRegistration?.club ?? firstRegistration?.competitionTeam?.club ?? null;

  return club?.shortName || club?.name || "No club";
}

function getPlayerStatus(player: Player) {
  if (player.isActive === false) {
    return "Archived";
  }

  return player.status ?? "Active";
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

async function fetchAdminPlayers() {
  const response = await api.get<ApiResponse<unknown>>("/admin/players");

  return unwrapArray<Player>(response.data.data, [
    "players",
    "items",
    "data",
    "results",
  ]);
}

export default function AdminPlayersPage() {
  const [search, setSearch] = useState("");

  const playersQuery = useQuery({
    queryKey: ["admin-players"],
    queryFn: fetchAdminPlayers,
  });

  const players = useMemo(() => playersQuery.data ?? [], [playersQuery.data]);

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return players;
    }

    return players.filter((player) => {
      const name = getPlayerName(player).toLowerCase();
      const clubName = getPrimaryClubName(player).toLowerCase();
      const position = player.position?.toLowerCase() ?? "";

      return (
        name.includes(query) ||
        clubName.includes(query) ||
        position.includes(query)
      );
    });
  }, [players, search]);

  const activePlayers = players.filter(
    (player) => player.isActive !== false,
  ).length;

  const archivedPlayers = players.length - activePlayers;

  const totalRegistrations = players.reduce((total, player) => {
    return total + getRegistrationCount(player);
  }, 0);

  const registeredPlayers = players.filter(
    (player) => getRegistrationCount(player) > 0,
  ).length;

  return (
    <AdminShell
      activeKey="players"
      title="Players"
      description="View and manage player records for league clubs."
    >
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <UserRound size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            Player Management
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
            Maintain player records and registrations.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            Players can be registered to clubs and used across squads,
            competitions, fixtures and results.
          </p>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Player summary
            </h2>

            <Link
              href="/admin/players/new"
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              <Plus size={14} />
              New player
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <UsersRound size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {players.length}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Total players
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Shield size={21} className="text-emerald-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {activePlayers}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Active
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <Trophy size={21} className="text-violet-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {registeredPlayers}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Registered
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <CalendarDays size={21} className="text-cyan-300" />
              <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                {totalRegistrations}
              </p>
              <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                Registrations
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="text-lg font-black tracking-[-0.03em]">
              All players
            </h2>
            <p className="mt-1 text-sm font-semibold text-white/40">
              Search and review player records.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 sm:w-[320px]">
              <Search size={17} className="shrink-0 text-emerald-300" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search players..."
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/25"
              />
            </div>

            <Link
              href="/admin/players/new"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
            >
              <Plus size={16} />
              New player
            </Link>
          </div>
        </div>

        {playersQuery.isLoading ? (
          <div className="mt-5 flex min-h-[320px] items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
            <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
              <Loader2 className="animate-spin" size={18} />
              Loading players
            </div>
          </div>
        ) : playersQuery.isError ? (
          <div className="mt-5 rounded-[1.5rem] border border-red-400/20 bg-red-400/10 p-5">
            <p className="text-sm font-black text-red-200">
              Could not load players.
            </p>
            <p className="mt-2 text-sm font-semibold text-white/45">
              Make sure the backend is running and your admin token is valid.
            </p>
          </div>
        ) : filteredPlayers.length > 0 ? (
          <>
            <div className="mt-5 hidden overflow-hidden rounded-[1.5rem] border border-white/10 lg:block">
              <div className="grid grid-cols-[1fr_160px_150px_120px_120px_90px] bg-white/[0.04] px-4 py-3 text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
                <span>Player</span>
                <span>Primary club</span>
                <span>Position</span>
                <span>Registrations</span>
                <span>Created</span>
                <span></span>
              </div>

              <div className="divide-y divide-white/10">
                {filteredPlayers.map((player, index) => (
                  <div
                    key={player.id ?? `${getPlayerName(player)}-${index}`}
                    className="grid grid-cols-[1fr_160px_150px_120px_120px_90px] items-center px-4 py-4"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 text-sm font-black text-[#07110f]">
                        {getPlayerInitials(player)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {getPlayerName(player)}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-white/35">
                          {getPlayerStatus(player)}
                        </p>
                      </div>
                    </div>

                    <p className="truncate text-sm font-black text-white/70">
                      {getPrimaryClubName(player)}
                    </p>

                    <p className="truncate text-sm font-black text-white/70">
                      {player.position ?? "Not set"}
                    </p>

                    <p className="text-sm font-black text-white/70">
                      {getRegistrationCount(player)}
                    </p>

                    <p className="text-xs font-bold text-white/40">
                      {formatDate(player.createdAt)}
                    </p>

                    <Link
                      href={
                        player.id
                          ? `/admin/players/${player.id}`
                          : "/admin/players"
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
              {filteredPlayers.map((player, index) => (
                <Link
                  key={player.id ?? `${getPlayerName(player)}-mobile-${index}`}
                  href={
                    player.id ? `/admin/players/${player.id}` : "/admin/players"
                  }
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 text-sm font-black text-[#07110f]">
                        {getPlayerInitials(player)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {getPlayerName(player)}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-white/35">
                          {getPrimaryClubName(player)}
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
                        {player.position ?? "N/A"}
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                        Position
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                      <p className="text-sm font-black">
                        {getRegistrationCount(player)}
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/30">
                        Reg.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/[0.05] p-3 text-center">
                      <p className="text-sm font-black">
                        {player.isActive === false ? "Off" : "On"}
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
                <UserRound size={26} />
              </div>
              <h2 className="mt-5 text-xl font-black">No players found</h2>
              <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/40">
                Try a different search or create your first player.
              </p>
            </div>
          </div>
        )}

        {archivedPlayers > 0 ? (
          <p className="mt-4 text-xs font-bold text-white/35">
            {archivedPlayers} archived player{archivedPlayers === 1 ? "" : "s"}{" "}
            are included in this admin view.
          </p>
        ) : null}
      </section>
    </AdminShell>
  );
}
