"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Edit3,
  Loader2,
  Save,
  Shield,
  Trophy,
  UserRound,
  X,
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
    competition?: {
      id?: string;
      name?: string;
    } | null;
  } | null;
  createdAt?: string;
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

type UpdatePlayerPayload = {
  firstName: string;
  lastName: string;
  position?: string;
  isActive: boolean;
};

type DraftPlayer = {
  firstName: string;
  lastName: string;
  position: string;
  isActive: boolean;
};

const positions = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
  "Winger",
  "Striker",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

  return "Something went wrong. Please try again.";
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

function getDraftInitials(firstName: string, lastName: string) {
  const initials = `${firstName.trim().charAt(0)}${lastName
    .trim()
    .charAt(0)}`.toUpperCase();

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

function getClubName(club?: Club | null) {
  return club?.shortName || club?.name || "No club";
}

function getRegistrationClubName(registration: PlayerRegistration) {
  const club = registration.club ?? registration.competitionTeam?.club ?? null;

  return getClubName(club);
}

function getCompetitionName(registration: PlayerRegistration) {
  return (
    registration.competitionTeam?.competition?.name ?? "General registration"
  );
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

async function fetchAdminPlayer(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/admin/players/${id}`);
  return getPlayerFromResponse(response.data.data) as Player;
}

async function updateAdminPlayer(id: string, payload: UpdatePlayerPayload) {
  const response = await api.patch<ApiResponse<Player>>(
    `/admin/players/${id}`,
    payload,
  );

  return response.data.data;
}

export default function AdminPlayerDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const playerId = params.id;

  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<DraftPlayer>({
    firstName: "",
    lastName: "",
    position: "",
    isActive: true,
  });

  const playerQuery = useQuery({
    queryKey: ["admin-player", playerId],
    queryFn: () => fetchAdminPlayer(playerId),
    enabled: Boolean(playerId),
  });

  const player = useMemo(() => playerQuery.data ?? {}, [playerQuery.data]);
  const registrations = getRegistrations(player);

  const previewName = isEditing
    ? `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim() ||
      "Player name"
    : getPlayerName(player);

  const previewInitials = isEditing
    ? getDraftInitials(draft.firstName, draft.lastName)
    : getPlayerInitials(player);

  const previewActive = isEditing ? draft.isActive : player.isActive !== false;
  const previewPosition = isEditing
    ? draft.position || "Not set"
    : player.position || "Not set";

  const updateMutation = useMutation({
    mutationFn: (payload: UpdatePlayerPayload) =>
      updateAdminPlayer(playerId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-player", playerId],
      });
      setIsEditing(false);
      setFormError("");
    },
  });

  function startEditing() {
    setDraft({
      firstName: player.firstName ?? "",
      lastName: player.lastName ?? "",
      position: player.position ?? "",
      isActive: player.isActive !== false,
    });
    setFormError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setFormError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const cleanFirstName = draft.firstName.trim();
    const cleanLastName = draft.lastName.trim();
    const cleanPosition = draft.position.trim();

    if (!cleanFirstName) {
      setFormError("First name is required.");
      return;
    }

    if (!cleanLastName) {
      setFormError("Last name is required.");
      return;
    }

    if (cleanFirstName.length < 2) {
      setFormError("First name must be at least 2 characters.");
      return;
    }

    if (cleanLastName.length < 2) {
      setFormError("Last name must be at least 2 characters.");
      return;
    }

    updateMutation.mutate({
      firstName: cleanFirstName,
      lastName: cleanLastName,
      position: cleanPosition || undefined,
      isActive: draft.isActive,
    });
  }

  const errorMessage =
    formError ||
    (updateMutation.isError ? getErrorMessage(updateMutation.error) : "");

  return (
    <AdminShell
      activeKey="players"
      title={playerQuery.isLoading ? "Player" : previewName}
      description="Review and manage this player record."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/players"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to players
        </Link>

        {!playerQuery.isLoading && !isEditing ? (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-[#07110f] transition hover:bg-emerald-300"
          >
            <Edit3 size={14} />
            Edit player
          </button>
        ) : null}
      </div>

      {playerQuery.isLoading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
            <Loader2 className="animate-spin" size={18} />
            Loading player
          </div>
        </div>
      ) : playerQuery.isError ? (
        <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-6">
          <p className="text-sm font-black text-red-200">
            Could not load player.
          </p>
          <p className="mt-2 text-sm font-semibold text-white/45">
            Make sure the backend is running and your admin token is valid.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] bg-emerald-400 px-2 text-center text-xl font-black leading-none text-[#07110f]">
                {previewInitials}
              </div>

              <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
                Player record
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
                {previewName}
              </h2>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                This player can be registered to clubs and used in squads,
                competitions and match records.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Trophy size={21} className="text-violet-300" />
                  <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                    {getRegistrationCount(player)}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Registrations
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <UserRound size={21} className="text-cyan-300" />
                  <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                    {previewPosition}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Position
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Shield size={21} className="text-emerald-300" />
                  <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                    {previewActive ? "On" : "Off"}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Status
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  {isEditing ? "Edit player" : "Player details"}
                </h2>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${
                    previewActive
                      ? "border border-emerald-300/20 text-emerald-300"
                      : "border border-red-300/20 text-red-200"
                  }`}
                >
                  {previewActive ? "Active" : "Archived"}
                </span>
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        First name
                      </label>
                      <input
                        value={draft.firstName}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            firstName: event.target.value,
                          }))
                        }
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        Last name
                      </label>
                      <input
                        value={draft.lastName}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            lastName: event.target.value,
                          }))
                        }
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Position
                    </label>

                    <select
                      value={draft.position}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          position: event.target.value,
                        }))
                      }
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                    >
                      <option value="">Select position</option>
                      {positions.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <label className="flex cursor-pointer items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-white">
                          Active player
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white/40">
                          Turn this off to archive the player.
                        </p>
                      </div>

                      <input
                        type="checkbox"
                        checked={draft.isActive}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            isActive: event.target.checked,
                          }))
                        }
                        className="h-5 w-5 accent-emerald-400"
                      />
                    </label>
                  </div>

                  {errorMessage ? (
                    <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-4">
                      <p className="text-sm font-black text-red-200">
                        {errorMessage}
                      </p>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-black text-white transition hover:bg-white/[0.08]"
                    >
                      <X size={17} />
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={updateMutation.isPending}
                      className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {updateMutation.isPending ? (
                        <>
                          <Loader2 className="animate-spin" size={17} />
                          Saving
                        </>
                      ) : (
                        <>
                          <Save size={17} />
                          Save changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-6 space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      Name
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {getPlayerName(player)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      Position
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {player.position ?? "Not set"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      Status
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {getPlayerStatus(player)}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Created
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {formatDate(player.createdAt)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Updated
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {formatDate(player.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={startEditing}
                    className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
                  >
                    <Edit3 size={17} />
                    Edit player
                  </button>
                </div>
              )}
            </article>
          </section>

          <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  Registrations
                </h2>
                <p className="mt-1 text-sm font-semibold text-white/40">
                  Clubs and competitions connected to this player.
                </p>
              </div>

              <Link
                href={`/admin/players/${playerId}/register`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
              >
                <CheckCircle2 size={16} />
                Register player
              </Link>
            </div>

            {registrations.length > 0 ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {registrations.map((registration, index) => (
                  <article
                    key={registration.id ?? index}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {getRegistrationClubName(registration)}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-white/35">
                          {getCompetitionName(registration)}
                        </p>
                      </div>

                      <div className="shrink-0 rounded-xl bg-white/8 px-3 py-2 text-xs font-black text-emerald-300">
                        #{registration.jerseyNumber ?? "--"}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-300">
                        {registration.status ?? "Registered"}
                      </span>

                      <span className="inline-flex items-center gap-1 rounded-full bg-white/[0.05] px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/35">
                        <CalendarDays size={12} />
                        {formatDate(registration.createdAt)}
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                    <Trophy size={26} />
                  </div>
                  <h2 className="mt-5 text-xl font-black">
                    No registrations yet
                  </h2>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/40">
                    This player has not been registered to a club or competition
                    yet.
                  </p>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </AdminShell>
  );
}
