"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Shield,
  Sparkles,
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

type Player = {
  id?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  position?: string | null;
  isActive?: boolean;
};

type Club = {
  id?: string;
  name?: string;
  shortName?: string;
  isActive?: boolean;
};

type Season = {
  id?: string;
  name?: string;
  slug?: string;
  status?: string;
  isCurrent?: boolean;
};

type PlayerRegistration = {
  id?: string;
  playerId?: string;
  clubId?: string;
  seasonId?: string;
  jerseyNumber?: number | null;
  status?: string;
};

type CreateRegistrationPayload = {
  playerId: string;
  clubId: string;
  seasonId: string;
  jerseyNumber?: number;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
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

function getErrorMessage(error: unknown) {
  if (isRecord(error)) {
    const response = error.response;

    if (isRecord(response)) {
      const data = response.data;

      if (isRecord(data) && typeof data.message === "string") {
        return data.message;
      }
    }

    if (typeof error.message === "string") {
      return error.message;
    }
  }

  return "Could not register player. Please check the details and try again.";
}

function getPlayerFromResponse(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  if (isRecord(value.player)) {
    return value.player;
  }

  return value;
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

async function getWithFallback<T>(paths: string[], keys: string[]) {
  for (const path of paths) {
    try {
      const response = await api.get<ApiResponse<unknown>>(path);
      return unwrapArray<T>(response.data.data, keys);
    } catch {
      // Try the next possible endpoint.
    }
  }

  return [];
}

async function getOneWithFallback(paths: string[]) {
  for (const path of paths) {
    try {
      const response = await api.get<ApiResponse<unknown>>(path);

      if (isRecord(response.data.data)) {
        return response.data.data;
      }
    } catch {
      // Try the next possible endpoint.
    }
  }

  return {};
}

async function fetchPlayer(id: string) {
  const data = await getOneWithFallback([
    `/admin/players/${id}`,
    `/players/${id}`,
  ]);

  return getPlayerFromResponse(data) as Player;
}

async function fetchClubs() {
  return getWithFallback<Club>(
    ["/admin/clubs", "/clubs"],
    ["clubs", "items", "data", "results"],
  );
}

async function fetchSeasons() {
  return getWithFallback<Season>(
    ["/admin/seasons", "/seasons"],
    ["seasons", "items", "data", "results"],
  );
}

async function createRegistration(payload: CreateRegistrationPayload) {
  const possiblePaths = [
    "/admin/player-registrations",
    "/player-registrations",
    `/admin/players/${payload.playerId}/registrations`,
    `/players/${payload.playerId}/registrations`,
  ];

  let lastError: unknown = null;

  for (const path of possiblePaths) {
    try {
      const response = await api.post<ApiResponse<PlayerRegistration>>(
        path,
        payload,
      );

      return response.data.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export default function AdminRegisterPlayerPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const playerId = params.id;

  const [clubId, setClubId] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [status, setStatus] =
    useState<CreateRegistrationPayload["status"]>("ACTIVE");
  const [formError, setFormError] = useState("");

  const playerQuery = useQuery({
    queryKey: ["admin-player", playerId],
    queryFn: () => fetchPlayer(playerId),
    enabled: Boolean(playerId),
  });

  const clubsQuery = useQuery({
    queryKey: ["admin-clubs"],
    queryFn: fetchClubs,
  });

  const seasonsQuery = useQuery({
    queryKey: ["admin-seasons"],
    queryFn: fetchSeasons,
  });

  const player = useMemo(() => playerQuery.data ?? {}, [playerQuery.data]);
  const clubs = useMemo(() => clubsQuery.data ?? [], [clubsQuery.data]);
  const seasons = useMemo(() => seasonsQuery.data ?? [], [seasonsQuery.data]);

  const activeClubs = clubs.filter((club) => club.isActive !== false);

  const selectedClub = activeClubs.find((club) => club.id === clubId);
  const selectedSeason = seasons.find((season) => season.id === seasonId);

  const currentSeason = seasons.find((season) => season.isCurrent);
  const defaultSeasonId = currentSeason?.id ?? seasons[0]?.id ?? "";

  const registerMutation = useMutation({
    mutationFn: createRegistration,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-player", playerId],
      });
      router.push(`/admin/players/${playerId}`);
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const cleanClubId = clubId.trim();
    const cleanSeasonId = seasonId.trim() || defaultSeasonId;
    const cleanJerseyNumber = jerseyNumber.trim();

    if (!cleanClubId) {
      setFormError("Please select a club.");
      return;
    }

    if (!cleanSeasonId) {
      setFormError("Please select a season.");
      return;
    }

    const parsedJerseyNumber = cleanJerseyNumber
      ? Number(cleanJerseyNumber)
      : undefined;

    if (
      parsedJerseyNumber !== undefined &&
      (!Number.isInteger(parsedJerseyNumber) ||
        parsedJerseyNumber < 1 ||
        parsedJerseyNumber > 999)
    ) {
      setFormError("Jersey number must be a whole number between 1 and 999.");
      return;
    }

    registerMutation.mutate({
      playerId,
      clubId: cleanClubId,
      seasonId: cleanSeasonId,
      jerseyNumber: parsedJerseyNumber,
      status,
    });
  }

  const errorMessage =
    formError ||
    (registerMutation.isError ? getErrorMessage(registerMutation.error) : "");

  const loading =
    playerQuery.isLoading || clubsQuery.isLoading || seasonsQuery.isLoading;

  return (
    <AdminShell
      activeKey="players"
      title="Register player"
      description="Connect a player to a club and season."
    >
      <div className="mb-5">
        <Link
          href={`/admin/players/${playerId}`}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to player
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
            <Loader2 className="animate-spin" size={18} />
            Loading registration data
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] bg-emerald-400 px-2 text-center text-xl font-black leading-none text-[#07110f]">
                {getPlayerInitials(player)}
              </div>

              <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
                Player registration
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
                {getPlayerName(player)}
              </h2>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                Select the club and season this player belongs to. This will
                make the player part of that club’s squad.
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-300"
                  />
                  <div>
                    <p className="text-sm font-black text-emerald-200">
                      Registration connects the records.
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-white/45">
                      A player record alone is not enough for squads. Register
                      them to the correct club and season.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  Registration details
                </h2>

                <span className="rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                  Draft
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                    Club
                  </label>

                  <select
                    value={clubId}
                    onChange={(event) => setClubId(event.target.value)}
                    className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                  >
                    <option value="">Select club</option>
                    {activeClubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {getClubName(club)}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs font-semibold text-white/35">
                    Only active clubs are shown here.
                  </p>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                    Season
                  </label>

                  <select
                    value={seasonId || defaultSeasonId}
                    onChange={(event) => setSeasonId(event.target.value)}
                    className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                  >
                    <option value="">Select season</option>
                    {seasons.map((season) => (
                      <option key={season.id} value={season.id}>
                        {season.name}
                        {season.isCurrent ? " — Current" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Jersey number
                    </label>

                    <input
                      value={jerseyNumber}
                      onChange={(event) => setJerseyNumber(event.target.value)}
                      placeholder="e.g. 10"
                      inputMode="numeric"
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Status
                    </label>

                    <select
                      value={status}
                      onChange={(event) =>
                        setStatus(
                          event.target
                            .value as CreateRegistrationPayload["status"],
                        )
                      }
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                  </div>
                </div>

                {errorMessage ? (
                  <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                    <p className="text-sm font-black text-red-200">
                      {errorMessage}
                    </p>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={registerMutation.isPending}
                  className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={17} />
                      Registering player
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Register player
                    </>
                  )}
                </button>
              </form>
            </article>
          </section>

          <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-[-0.03em]">Preview</h2>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300/70">
                Squad card
              </span>
            </div>

            <div className="mt-5 max-w-xl rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-emerald-400 px-2 text-center text-base font-black leading-none text-[#07110f]">
                    {getPlayerInitials(player)}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-xl font-black text-white">
                      {getPlayerName(player)}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-white/40">
                      {selectedClub
                        ? getClubName(selectedClub)
                        : "No club selected"}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 rounded-xl bg-white/8 px-3 py-2 text-xs font-black text-emerald-300">
                  #{jerseyNumber.trim() || "--"}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <UsersRound className="mx-auto text-emerald-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Club
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {selectedClub
                      ? getClubShortName(selectedClub)
                      : "Not selected"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <Trophy className="mx-auto text-violet-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Season
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {selectedSeason?.name ??
                      currentSeason?.name ??
                      "Not selected"}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <Shield className="mx-auto text-cyan-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Status
                  </p>
                  <p className="mt-1 truncate text-sm font-black">{status}</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
