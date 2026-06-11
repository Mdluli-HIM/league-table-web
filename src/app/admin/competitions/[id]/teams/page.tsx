"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Search,
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

type Club = {
  id?: string;
  name?: string;
  shortName?: string;
  slug?: string;
  isActive?: boolean;
};

type Season = {
  id?: string;
  name?: string;
  isCurrent?: boolean;
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
  season?: Season | null;
  competitionTeams?: CompetitionTeam[];
  teams?: CompetitionTeam[];
  _count?: {
    competitionTeams?: number;
    teams?: number;
  };
};

type AddTeamPayload = {
  competitionId: string;
  clubId: string;
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

  return "Could not add team. Please check the details and try again.";
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

function getCompetitionStatus(competition: Competition) {
  return competition.status || "DRAFT";
}

function getSeasonName(competition: Competition) {
  return competition.season?.name || "No season";
}

function getTeams(competition: Competition) {
  return competition.competitionTeams ?? competition.teams ?? [];
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

async function fetchClubs() {
  const possiblePaths = ["/admin/clubs", "/clubs"];

  for (const path of possiblePaths) {
    try {
      const response = await api.get<ApiResponse<unknown>>(path);

      return unwrapArray<Club>(response.data.data, [
        "clubs",
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

async function addTeamToCompetition(payload: AddTeamPayload) {
  const possibleRequests = [
    {
      path: "/admin/competition-teams",
      body: payload,
    },
    {
      path: "/competition-teams",
      body: payload,
    },
    {
      path: `/admin/competitions/${payload.competitionId}/teams`,
      body: { clubId: payload.clubId },
    },
    {
      path: `/competitions/${payload.competitionId}/teams`,
      body: { clubId: payload.clubId },
    },
  ];

  let lastError: unknown = null;

  for (const request of possibleRequests) {
    try {
      const response = await api.post<ApiResponse<CompetitionTeam>>(
        request.path,
        request.body,
      );

      return response.data.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export default function AdminCompetitionTeamsPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const competitionId = params.id;

  const [clubId, setClubId] = useState("");
  const [search, setSearch] = useState("");
  const [formError, setFormError] = useState("");

  const competitionQuery = useQuery({
    queryKey: ["admin-competition", competitionId],
    queryFn: () => fetchCompetition(competitionId),
    enabled: Boolean(competitionId),
  });

  const clubsQuery = useQuery({
    queryKey: ["admin-clubs"],
    queryFn: fetchClubs,
  });

  const competition = useMemo(
    () => competitionQuery.data ?? {},
    [competitionQuery.data],
  );

  const clubs = useMemo(() => clubsQuery.data ?? [], [clubsQuery.data]);

  const teams = useMemo(() => getTeams(competition), [competition]);

  const existingClubIds = useMemo(() => {
    return new Set(
      teams
        .map((team) => team.clubId ?? team.club?.id)
        .filter((id): id is string => Boolean(id)),
    );
  }, [teams]);

  const availableClubs = useMemo(() => {
    return clubs.filter((club) => {
      if (!club.id) return false;
      if (club.isActive === false) return false;
      return !existingClubIds.has(club.id);
    });
  }, [clubs, existingClubIds]);

  const filteredAvailableClubs = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return availableClubs;
    }

    return availableClubs.filter((club) => {
      const name = getClubName(club).toLowerCase();
      const shortName = getClubShortName(club).toLowerCase();

      return name.includes(query) || shortName.includes(query);
    });
  }, [availableClubs, search]);

  const selectedClub = availableClubs.find((club) => club.id === clubId);

  const addTeamMutation = useMutation({
    mutationFn: addTeamToCompetition,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-competitions"],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-competition", competitionId],
      });
      setClubId("");
      setFormError("");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const cleanClubId = clubId.trim();

    if (!cleanClubId) {
      setFormError("Please select a club.");
      return;
    }

    addTeamMutation.mutate({
      competitionId,
      clubId: cleanClubId,
    });
  }

  const errorMessage =
    formError ||
    (addTeamMutation.isError ? getErrorMessage(addTeamMutation.error) : "");

  const loading = competitionQuery.isLoading || clubsQuery.isLoading;

  return (
    <AdminShell
      activeKey="competitions"
      title="Competition teams"
      description="Add clubs to this competition."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/admin/competitions/${competitionId}`}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to competition
        </Link>

        <span className="rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
          {getCompetitionStatus(competition)}
        </span>
      </div>

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
            <Loader2 className="animate-spin" size={18} />
            Loading competition teams
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
                Add teams
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
                {getCompetitionName(competition)}
              </h2>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                Add clubs to this competition before creating fixtures and
                capturing results.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <UsersRound size={21} className="text-cyan-300" />
                  <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                    {teams.length}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Added
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Shield size={21} className="text-emerald-300" />
                  <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                    {availableClubs.length}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Available
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Trophy size={21} className="text-violet-300" />
                  <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                    {getSeasonName(competition)}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Season
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  Add club
                </h2>

                <span className="rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                  Team entry
                </span>
              </div>

              <div className="mt-6 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-300"
                  />
                  <div>
                    <p className="text-sm font-black text-emerald-200">
                      Only active clubs are available.
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-white/45">
                      Clubs already added to this competition are hidden from
                      the selector.
                    </p>
                  </div>
                </div>
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
                    {availableClubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {getClubName(club)}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs font-semibold text-white/35">
                    Select one club and add it to the competition.
                  </p>
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
                  disabled={addTeamMutation.isPending}
                  className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {addTeamMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={17} />
                      Adding team
                    </>
                  ) : (
                    <>
                      <Plus size={17} />
                      Add team
                    </>
                  )}
                </button>
              </form>
            </article>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black tracking-[-0.03em]">
                    Teams in competition
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-white/40">
                    Clubs already connected to this competition.
                  </p>
                </div>

                <span className="rounded-full bg-white/[0.06] px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-white/45">
                  {teams.length} total
                </span>
              </div>

              {teams.length > 0 ? (
                <div className="mt-5 grid gap-3">
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
                <div className="mt-5 flex min-h-[260px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                  <div>
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400/10 text-emerald-300">
                      <UsersRound size={26} />
                    </div>
                    <h2 className="mt-5 text-xl font-black">
                      No teams added yet
                    </h2>
                    <p className="mt-2 max-w-sm text-sm font-semibold leading-6 text-white/40">
                      Select a club on the right and add it to the competition.
                    </p>
                  </div>
                </div>
              )}
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  Available clubs
                </h2>
                <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300/70">
                  {availableClubs.length}
                </span>
              </div>

              <div className="mt-5 flex h-12 min-w-0 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4">
                <Search size={17} className="shrink-0 text-emerald-300" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search available clubs..."
                  className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none placeholder:text-white/25"
                />
              </div>

              {filteredAvailableClubs.length > 0 ? (
                <div className="mt-5 grid gap-3">
                  {filteredAvailableClubs.map((club) => (
                    <button
                      key={club.id}
                      type="button"
                      onClick={() => setClubId(club.id ?? "")}
                      className={`rounded-[1.4rem] border p-4 text-left transition ${
                        clubId === club.id
                          ? "border-emerald-300/50 bg-emerald-400/10"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-emerald-400 px-2 text-center text-xs font-black text-[#07110f]">
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
                    </button>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-white/15 bg-white/[0.03] p-6 text-center">
                  <CheckCircle2
                    className="mx-auto text-emerald-300"
                    size={28}
                  />
                  <h2 className="mt-4 text-lg font-black">
                    No available clubs
                  </h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-white/40">
                    Every active club may already be added, or your search has
                    no matches.
                  </p>
                </div>
              )}

              {selectedClub ? (
                <div className="mt-5 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                    Selected
                  </p>
                  <p className="mt-2 text-sm font-black text-white">
                    {getClubName(selectedClub)}
                  </p>
                </div>
              ) : null}
            </article>
          </section>
        </>
      )}
    </AdminShell>
  );
}
