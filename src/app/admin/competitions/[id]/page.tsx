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
  Plus,
  Save,
  Shield,
  Trophy,
  UsersRound,
  X,
} from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { api } from "@/lib/api";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type Season = {
  id?: string;
  name?: string;
  slug?: string;
  status?: string;
  isCurrent?: boolean;
};

type Club = {
  id?: string;
  name?: string;
  shortName?: string;
  slug?: string;
};

type CompetitionTeam = {
  id?: string;
  clubId?: string;
  competitionId?: string;
  club?: Club | null;
  createdAt?: string;
};

type Competition = {
  id?: string;
  name?: string;
  slug?: string;
  seasonId?: string;
  type?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  season?: Season | null;
  competitionTeams?: CompetitionTeam[];
  teams?: CompetitionTeam[];
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    competitionTeams?: number;
    teams?: number;
    fixtures?: number;
    matches?: number;
  };
};

type UpdateCompetitionPayload = {
  name: string;
  seasonId?: string;
  type: "LEAGUE" | "KNOCKOUT";
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDate?: string;
  endDate?: string;
};

type DraftCompetition = {
  name: string;
  seasonId: string;
  type: UpdateCompetitionPayload["type"];
  status: UpdateCompetitionPayload["status"];
  startDate: string;
  endDate: string;
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

function getCompetitionFromResponse(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  if (isRecord(value.competition)) {
    return value.competition;
  }

  return value;
}

function getCompetitionName(competition: Competition) {
  return competition.name || "Untitled Competition";
}

function getCompetitionType(competition: Competition) {
  return competition.type || "LEAGUE";
}

function getCompetitionStatus(competition: Competition) {
  return competition.status || "DRAFT";
}

function normalizeCompetitionType(value?: string) {
  if (value === "KNOCKOUT") {
    return "KNOCKOUT";
  }

  return "LEAGUE";
}

function normalizeCompetitionStatus(value?: string) {
  if (
    value === "DRAFT" ||
    value === "ACTIVE" ||
    value === "COMPLETED" ||
    value === "CANCELLED"
  ) {
    return value;
  }

  return "ACTIVE";
}

function getSeasonName(competition: Competition) {
  return competition.season?.name || "No season";
}

function getTeams(competition: Competition) {
  return competition.competitionTeams ?? competition.teams ?? [];
}

function getTeamCount(competition: Competition) {
  return numberFrom(
    competition._count?.competitionTeams,
    competition._count?.teams,
    getTeams(competition).length,
  );
}

function getMatchCount(competition: Competition) {
  return numberFrom(competition._count?.fixtures, competition._count?.matches);
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

function toInputDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function formatDate(value?: string | null) {
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

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("active") || normalized.includes("published")) {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (normalized.includes("completed") || normalized.includes("finished")) {
    return "bg-cyan-400/10 text-cyan-300";
  }

  if (normalized.includes("cancelled") || normalized.includes("archived")) {
    return "bg-red-400/10 text-red-200";
  }

  return "bg-white/[0.06] text-white/50";
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

async function fetchCompetition(id: string) {
  const data = await getOneWithFallback([
    `/admin/competitions/${id}`,
    `/competitions/${id}`,
  ]);

  return getCompetitionFromResponse(data) as Competition;
}

async function fetchSeasons() {
  const possiblePaths = ["/admin/seasons", "/seasons"];

  for (const path of possiblePaths) {
    try {
      const response = await api.get<ApiResponse<unknown>>(path);

      return unwrapArray<Season>(response.data.data, [
        "seasons",
        "items",
        "data",
        "results",
      ]);
    } catch {
      // Try the next possible endpoint.
    }
  }

  return [];
}

async function updateCompetition(
  id: string,
  payload: UpdateCompetitionPayload,
) {
  const possiblePaths = [`/admin/competitions/${id}`, `/competitions/${id}`];

  let lastError: unknown = null;

  for (const path of possiblePaths) {
    try {
      const response = await api.patch<ApiResponse<Competition>>(path, payload);
      return response.data.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export default function AdminCompetitionDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const competitionId = params.id;

  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<DraftCompetition>({
    name: "",
    seasonId: "",
    type: "LEAGUE",
    status: "ACTIVE",
    startDate: "",
    endDate: "",
  });

  const competitionQuery = useQuery({
    queryKey: ["admin-competition", competitionId],
    queryFn: () => fetchCompetition(competitionId),
    enabled: Boolean(competitionId),
  });

  const seasonsQuery = useQuery({
    queryKey: ["admin-seasons"],
    queryFn: fetchSeasons,
  });

  const competition = useMemo(
    () => competitionQuery.data ?? {},
    [competitionQuery.data],
  );

  const seasons = useMemo(() => seasonsQuery.data ?? [], [seasonsQuery.data]);
  const teams = getTeams(competition);

  const previewName = isEditing
    ? draft.name.trim() || "Competition name"
    : getCompetitionName(competition);

  const previewType = isEditing ? draft.type : getCompetitionType(competition);
  const previewStatus = isEditing
    ? draft.status
    : getCompetitionStatus(competition);

  const previewStartDate = isEditing ? draft.startDate : competition.startDate;
  const previewEndDate = isEditing ? draft.endDate : competition.endDate;

  const selectedSeason = seasons.find((season) => season.id === draft.seasonId);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateCompetitionPayload) =>
      updateCompetition(competitionId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-competitions"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-competition", competitionId],
      });
      setIsEditing(false);
      setFormError("");
    },
  });

  function startEditing() {
    setDraft({
      name: getCompetitionName(competition),
      seasonId: competition.seasonId ?? competition.season?.id ?? "",
      type: normalizeCompetitionType(competition.type),
      status: normalizeCompetitionStatus(competition.status),
      startDate: toInputDate(competition.startDate),
      endDate: toInputDate(competition.endDate),
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

    const cleanName = draft.name.trim();
    const cleanSeasonId = draft.seasonId.trim();
    const cleanStartDate = draft.startDate.trim();
    const cleanEndDate = draft.endDate.trim();

    if (!cleanName) {
      setFormError("Competition name is required.");
      return;
    }

    if (cleanName.length < 2) {
      setFormError("Competition name must be at least 2 characters.");
      return;
    }

    if (cleanStartDate && cleanEndDate) {
      const start = new Date(cleanStartDate);
      const end = new Date(cleanEndDate);

      if (
        !Number.isNaN(start.getTime()) &&
        !Number.isNaN(end.getTime()) &&
        end < start
      ) {
        setFormError("End date cannot be before the start date.");
        return;
      }
    }

    updateMutation.mutate({
      name: cleanName,
      seasonId: cleanSeasonId || undefined,
      type: draft.type,
      status: draft.status,
      startDate: cleanStartDate || undefined,
      endDate: cleanEndDate || undefined,
    });
  }

  const errorMessage =
    formError ||
    (updateMutation.isError ? getErrorMessage(updateMutation.error) : "");

  return (
    <AdminShell
      activeKey="competitions"
      title={competitionQuery.isLoading ? "Competition" : previewName}
      description="Review and manage this competition."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/competitions"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to competitions
        </Link>

        {!competitionQuery.isLoading && !isEditing ? (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-[#07110f] transition hover:bg-emerald-300"
          >
            <Edit3 size={14} />
            Edit competition
          </button>
        ) : null}
      </div>

      {competitionQuery.isLoading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
            <Loader2 className="animate-spin" size={18} />
            Loading competition
          </div>
        </div>
      ) : competitionQuery.isError ? (
        <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-6">
          <p className="text-sm font-black text-red-200">
            Could not load competition.
          </p>
          <p className="mt-2 text-sm font-semibold text-white/45">
            Make sure the backend is running and your admin token is valid.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-[2rem] bg-emerald-400 text-[#07110f]">
                <Trophy size={34} />
              </div>

              <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
                Competition record
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
                {previewName}
              </h2>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                This competition connects teams, fixtures, results and the
                public league table.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <UsersRound size={21} className="text-cyan-300" />
                  <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                    {getTeamCount(competition)}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Teams
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <CalendarDays size={21} className="text-violet-300" />
                  <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                    {getMatchCount(competition)}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Matches
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Shield size={21} className="text-emerald-300" />
                  <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                    {previewStatus}
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
                  {isEditing ? "Edit competition" : "Competition details"}
                </h2>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${getStatusClass(
                    previewStatus,
                  )}`}
                >
                  {previewStatus}
                </span>
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Competition name
                    </label>
                    <input
                      value={draft.name}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          name: event.target.value,
                        }))
                      }
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Season
                    </label>

                    <select
                      value={draft.seasonId}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          seasonId: event.target.value,
                        }))
                      }
                      disabled={seasonsQuery.isLoading}
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">Keep current season</option>
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
                        Type
                      </label>

                      <select
                        value={draft.type}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            type: event.target
                              .value as UpdateCompetitionPayload["type"],
                          }))
                        }
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                      >
                        <option value="LEAGUE">League</option>
                        <option value="KNOCKOUT">Knockout</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        Status
                      </label>

                      <select
                        value={draft.status}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            status: event.target
                              .value as UpdateCompetitionPayload["status"],
                          }))
                        }
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="ACTIVE">Active</option>
                        <option value="COMPLETED">Completed</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        Start date
                      </label>
                      <input
                        type="date"
                        value={draft.startDate}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            startDate: event.target.value,
                          }))
                        }
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-white/[0.07]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        End date
                      </label>
                      <input
                        type="date"
                        value={draft.endDate}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            endDate: event.target.value,
                          }))
                        }
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-white/[0.07]"
                      />
                    </div>
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
                      {getCompetitionName(competition)}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Type
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {getCompetitionType(competition)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Season
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {getSeasonName(competition)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Start
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {formatDate(competition.startDate)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        End
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {formatDate(competition.endDate)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      Slug
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {competition.slug ?? "No slug"}
                    </p>
                  </div>

                  <button
                    onClick={startEditing}
                    className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
                  >
                    <Edit3 size={17} />
                    Edit competition
                  </button>
                </div>
              )}
            </article>
          </section>

          <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  Competition teams
                </h2>
                <p className="mt-1 text-sm font-semibold text-white/40">
                  Clubs connected to this competition.
                </p>
              </div>

              <Link
                href={`/admin/competitions/${competitionId}/teams`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
              >
                <Plus size={16} />
                Add teams
              </Link>
            </div>

            {teams.length > 0 ? (
              <div className="mt-5 grid gap-3 lg:grid-cols-2">
                {teams.map((team, index) => (
                  <article
                    key={team.id ?? index}
                    className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 px-2 text-center text-sm font-black text-[#07110f]">
                        {getClubShortName(team.club)}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-white">
                          {getClubName(team.club)}
                        </p>
                        <p className="mt-1 truncate text-xs font-bold text-white/35">
                          Added {formatDate(team.createdAt)}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 flex min-h-[220px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                <div>
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                    <UsersRound size={26} />
                  </div>
                  <h2 className="mt-5 text-xl font-black">
                    No teams added yet
                  </h2>
                  <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/40">
                    Add clubs to this competition before scheduling fixtures.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-[-0.03em]">
                Public preview
              </h2>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300/70">
                Competition card
              </span>
            </div>

            <div className="mt-5 max-w-xl rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-emerald-400 text-[#07110f]">
                  <Trophy size={26} />
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${getStatusClass(
                    previewStatus,
                  )}`}
                >
                  {previewStatus}
                </div>
              </div>

              <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                {previewType}
              </p>

              <h3 className="mt-2 text-2xl font-black leading-none tracking-[-0.05em]">
                {previewName}
              </h3>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <CalendarDays
                    className="mx-auto text-emerald-300"
                    size={20}
                  />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Season
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {isEditing
                      ? (selectedSeason?.name ?? getSeasonName(competition))
                      : getSeasonName(competition)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <UsersRound className="mx-auto text-cyan-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Teams
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {getTeamCount(competition)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <CheckCircle2 className="mx-auto text-violet-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Matches
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {getMatchCount(competition)}
                  </p>
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/45">
                {formatDate(previewStartDate)} — {formatDate(previewEndDate)}
              </div>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
