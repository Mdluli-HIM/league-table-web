"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Edit3,
  Loader2,
  MapPin,
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

type Club = {
  id?: string;
  name?: string;
  shortName?: string;
  slug?: string;
  isActive?: boolean;
};

type CompetitionTeam = {
  id?: string;
  clubId?: string;
  club?: Club | null;
};

type Competition = {
  id?: string;
  name?: string;
  slug?: string;
  type?: string;
  status?: string;
  competitionTeams?: CompetitionTeam[];
  teams?: CompetitionTeam[];
};

type Venue = {
  id?: string;
  name?: string;
  address?: string | null;
  isActive?: boolean;
};

type Match = {
  id?: string;
  competitionId?: string;
  venueId?: string | null;
  homeClubId?: string;
  awayClubId?: string;
  scheduledAt?: string | null;
  matchday?: number | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status?: string;
  competition?: Competition | null;
  homeClub?: Club | null;
  awayClub?: Club | null;
  homeTeam?: Club | null;
  awayTeam?: Club | null;
  venue?: Venue | null;
  createdAt?: string;
  updatedAt?: string;
};

type UpdateFixturePayload = {
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  scheduledAt: string;
  matchday?: number;
  venueId?: string;
  status: "SCHEDULED" | "COMPLETED" | "POSTPONED" | "CANCELLED";
};

type DraftFixture = {
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  venueId: string;
  matchDate: string;
  matchTime: string;
  matchday: string;
  status: UpdateFixturePayload["status"];
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

  return "Something went wrong. Please try again.";
}

function getMatchFromResponse(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  if (isRecord(value.fixture)) {
    return value.fixture;
  }

  if (isRecord(value.match)) {
    return value.match;
  }

  return value;
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

function getHomeClub(match: Match) {
  return match.homeClub ?? match.homeTeam ?? null;
}

function getAwayClub(match: Match) {
  return match.awayClub ?? match.awayTeam ?? null;
}

function getClubName(club?: Club | null) {
  return club?.name || club?.shortName || "TBC";
}

function getClubShortName(club?: Club | null) {
  const rawShortName = club?.shortName?.trim();

  if (rawShortName && rawShortName.length <= 4) {
    return rawShortName.toUpperCase();
  }

  if (!club?.name) {
    return "TBC";
  }

  const initials = club.name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return initials || "TBC";
}

function getCompetitionName(competition?: Competition | null) {
  return competition?.name || "No competition";
}

function getVenueName(venue?: Venue | null) {
  return venue?.name || "Venue TBC";
}

function getMatchName(match: Match) {
  return `${getClubName(getHomeClub(match))} vs ${getClubName(
    getAwayClub(match),
  )}`;
}

function getMatchStatus(match: Match) {
  return match.status || "SCHEDULED";
}

function normalizeStatus(value?: string): UpdateFixturePayload["status"] {
  if (
    value === "SCHEDULED" ||
    value === "COMPLETED" ||
    value === "POSTPONED" ||
    value === "CANCELLED"
  ) {
    return value;
  }

  return "SCHEDULED";
}

function getTeams(competition?: Competition | null) {
  return competition?.competitionTeams ?? competition?.teams ?? [];
}

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("scheduled")) {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (normalized.includes("completed") || normalized.includes("finished")) {
    return "bg-cyan-400/10 text-cyan-300";
  }

  if (normalized.includes("cancelled") || normalized.includes("postponed")) {
    return "bg-red-400/10 text-red-200";
  }

  return "bg-white/[0.06] text-white/50";
}

function toInputDate(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().slice(0, 10);
}

function toInputTime(value?: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toTimeString().slice(0, 5);
}

function combineDateAndTime(dateValue: string, timeValue: string) {
  const dateTime = new Date(`${dateValue}T${timeValue}`);

  if (Number.isNaN(dateTime.getTime())) {
    return "";
  }

  return dateTime.toISOString();
}

function formatDate(value?: string | null) {
  if (!value) return "Date TBC";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date TBC";
  }

  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value?: string | null) {
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

async function getArrayWithFallback<T>(paths: string[], keys: string[]) {
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

async function fetchFixture(id: string) {
  const data = await getOneWithFallback([
    `/admin/fixtures/${id}`,
    `/admin/matches/${id}`,
    `/fixtures/${id}`,
    `/matches/${id}`,
  ]);

  return getMatchFromResponse(data) as Match;
}

async function fetchCompetition(id: string) {
  const data = await getOneWithFallback([
    `/admin/competitions/${id}`,
    `/competitions/${id}`,
  ]);

  return getCompetitionFromResponse(data) as Competition;
}

async function fetchCompetitions() {
  return getArrayWithFallback<Competition>(
    ["/admin/competitions", "/competitions", "/public/competitions"],
    ["competitions", "items", "data", "results"],
  );
}

async function fetchClubs() {
  return getArrayWithFallback<Club>(
    ["/admin/clubs", "/clubs", "/public/clubs"],
    ["clubs", "items", "data", "results"],
  );
}

async function fetchVenues() {
  return getArrayWithFallback<Venue>(
    ["/admin/venues", "/venues", "/public/venues"],
    ["venues", "items", "data", "results"],
  );
}

async function updateFixture(id: string, payload: UpdateFixturePayload) {
  const possiblePaths = [
    `/admin/fixtures/${id}`,
    `/admin/matches/${id}`,
    `/fixtures/${id}`,
    `/matches/${id}`,
  ];

  let lastError: unknown = null;

  for (const path of possiblePaths) {
    try {
      const response = await api.patch<ApiResponse<Match>>(path, payload);
      return response.data.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export default function AdminFixtureDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const fixtureId = params.id;

  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<DraftFixture>({
    competitionId: "",
    homeClubId: "",
    awayClubId: "",
    venueId: "",
    matchDate: "",
    matchTime: "",
    matchday: "",
    status: "SCHEDULED",
  });

  const fixtureQuery = useQuery({
    queryKey: ["admin-fixture", fixtureId],
    queryFn: () => fetchFixture(fixtureId),
    enabled: Boolean(fixtureId),
  });

  const competitionsQuery = useQuery({
    queryKey: ["admin-competitions"],
    queryFn: fetchCompetitions,
  });

  const clubsQuery = useQuery({
    queryKey: ["admin-clubs"],
    queryFn: fetchClubs,
  });

  const venuesQuery = useQuery({
    queryKey: ["admin-venues"],
    queryFn: fetchVenues,
  });

  const fixture = useMemo(() => fixtureQuery.data ?? {}, [fixtureQuery.data]);
  const competitions = useMemo(
    () => competitionsQuery.data ?? [],
    [competitionsQuery.data],
  );
  const clubs = useMemo(() => clubsQuery.data ?? [], [clubsQuery.data]);
  const venues = useMemo(() => venuesQuery.data ?? [], [venuesQuery.data]);

  const activeCompetitionId = isEditing
    ? draft.competitionId
    : (fixture.competitionId ?? fixture.competition?.id ?? "");

  const competitionQuery = useQuery({
    queryKey: ["admin-competition", activeCompetitionId],
    queryFn: () => fetchCompetition(activeCompetitionId),
    enabled: Boolean(activeCompetitionId),
  });

  const selectedCompetition =
    competitionQuery.data ??
    fixture.competition ??
    competitions.find((competition) => competition.id === activeCompetitionId);

  const competitionTeams = useMemo(() => {
    return getTeams(selectedCompetition);
  }, [selectedCompetition]);

  const competitionClubs = useMemo(() => {
    const teamsWithClubs = competitionTeams
      .map((team) => team.club)
      .filter((club): club is Club => Boolean(club?.id));

    if (teamsWithClubs.length > 0) {
      return teamsWithClubs;
    }

    return clubs.filter((club) => club.isActive !== false);
  }, [clubs, competitionTeams]);

  const previewHomeClub = isEditing
    ? competitionClubs.find((club) => club.id === draft.homeClubId)
    : getHomeClub(fixture);

  const previewAwayClub = isEditing
    ? competitionClubs.find((club) => club.id === draft.awayClubId)
    : getAwayClub(fixture);

  const previewVenue = isEditing
    ? venues.find((venue) => venue.id === draft.venueId)
    : fixture.venue;

  const previewStatus = isEditing ? draft.status : getMatchStatus(fixture);

  const previewScheduledAt = isEditing
    ? combineDateAndTime(draft.matchDate, draft.matchTime)
    : fixture.scheduledAt;

  const previewMatchday = isEditing
    ? draft.matchday || "TBC"
    : (fixture.matchday ?? "TBC");

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateFixturePayload) =>
      updateFixture(fixtureId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-fixtures"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-fixture", fixtureId],
      });
      setIsEditing(false);
      setFormError("");
    },
  });

  function startEditing() {
    setDraft({
      competitionId: fixture.competitionId ?? fixture.competition?.id ?? "",
      homeClubId: fixture.homeClubId ?? getHomeClub(fixture)?.id ?? "",
      awayClubId: fixture.awayClubId ?? getAwayClub(fixture)?.id ?? "",
      venueId: fixture.venueId ?? fixture.venue?.id ?? "",
      matchDate: toInputDate(fixture.scheduledAt),
      matchTime: toInputTime(fixture.scheduledAt),
      matchday: fixture.matchday ? String(fixture.matchday) : "",
      status: normalizeStatus(fixture.status),
    });
    setFormError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setFormError("");
  }

  function handleCompetitionChange(value: string) {
    setDraft((current) => ({
      ...current,
      competitionId: value,
      homeClubId: "",
      awayClubId: "",
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const cleanCompetitionId = draft.competitionId.trim();
    const cleanHomeClubId = draft.homeClubId.trim();
    const cleanAwayClubId = draft.awayClubId.trim();
    const cleanVenueId = draft.venueId.trim();
    const cleanMatchday = draft.matchday.trim();
    const scheduledAt = combineDateAndTime(draft.matchDate, draft.matchTime);

    if (!cleanCompetitionId) {
      setFormError("Please select a competition.");
      return;
    }

    if (!cleanHomeClubId) {
      setFormError("Please select the home club.");
      return;
    }

    if (!cleanAwayClubId) {
      setFormError("Please select the away club.");
      return;
    }

    if (cleanHomeClubId === cleanAwayClubId) {
      setFormError("Home club and away club cannot be the same.");
      return;
    }

    if (!scheduledAt) {
      setFormError("Please select a valid date and time.");
      return;
    }

    const parsedMatchday = cleanMatchday ? Number(cleanMatchday) : undefined;

    if (
      parsedMatchday !== undefined &&
      (!Number.isInteger(parsedMatchday) ||
        parsedMatchday < 1 ||
        parsedMatchday > 999)
    ) {
      setFormError("Matchday must be a whole number between 1 and 999.");
      return;
    }

    updateMutation.mutate({
      competitionId: cleanCompetitionId,
      homeClubId: cleanHomeClubId,
      awayClubId: cleanAwayClubId,
      scheduledAt,
      matchday: parsedMatchday,
      venueId: cleanVenueId || undefined,
      status: draft.status,
    });
  }

  const errorMessage =
    formError ||
    (updateMutation.isError ? getErrorMessage(updateMutation.error) : "");

  const loading =
    fixtureQuery.isLoading ||
    competitionsQuery.isLoading ||
    clubsQuery.isLoading ||
    venuesQuery.isLoading;

  return (
    <AdminShell
      activeKey="fixtures"
      title={fixtureQuery.isLoading ? "Fixture" : getMatchName(fixture)}
      description="Review and manage this fixture."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/fixtures"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to fixtures
        </Link>

        {!loading && !isEditing ? (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-[#07110f] transition hover:bg-emerald-300"
          >
            <Edit3 size={14} />
            Edit fixture
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
            <Loader2 className="animate-spin" size={18} />
            Loading fixture
          </div>
        </div>
      ) : fixtureQuery.isError ? (
        <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-6">
          <p className="text-sm font-black text-red-200">
            Could not load fixture.
          </p>
          <p className="mt-2 text-sm font-semibold text-white/45">
            Make sure the backend is running and your admin token is valid.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
                <CalendarDays size={28} />
              </div>

              <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
                Fixture record
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
                {getClubName(previewHomeClub)} vs {getClubName(previewAwayClub)}
              </h2>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                This fixture controls the match schedule shown to viewers before
                a result is captured.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Clock size={21} className="text-emerald-300" />
                  <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                    {formatTime(previewScheduledAt)}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Kickoff
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Shield size={21} className="text-cyan-300" />
                  <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                    {previewStatus}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Status
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Trophy size={21} className="text-violet-300" />
                  <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                    MD {previewMatchday}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Matchday
                  </p>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  {isEditing ? "Edit fixture" : "Fixture details"}
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
                      Competition
                    </label>

                    <select
                      value={draft.competitionId}
                      onChange={(event) =>
                        handleCompetitionChange(event.target.value)
                      }
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                    >
                      <option value="">Select competition</option>
                      {competitions.map((competition) => (
                        <option key={competition.id} value={competition.id}>
                          {getCompetitionName(competition)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        Home club
                      </label>

                      <select
                        value={draft.homeClubId}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            homeClubId: event.target.value,
                          }))
                        }
                        disabled={!draft.competitionId}
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Select home club</option>
                        {competitionClubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {getClubName(club)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        Away club
                      </label>

                      <select
                        value={draft.awayClubId}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            awayClubId: event.target.value,
                          }))
                        }
                        disabled={!draft.competitionId}
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <option value="">Select away club</option>
                        {competitionClubs.map((club) => (
                          <option key={club.id} value={club.id}>
                            {getClubName(club)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Venue
                    </label>

                    <select
                      value={draft.venueId}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          venueId: event.target.value,
                        }))
                      }
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                    >
                      <option value="">Venue TBC</option>
                      {venues
                        .filter((venue) => venue.isActive !== false)
                        .map((venue) => (
                          <option key={venue.id} value={venue.id}>
                            {getVenueName(venue)}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        Date
                      </label>
                      <input
                        type="date"
                        value={draft.matchDate}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            matchDate: event.target.value,
                          }))
                        }
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-white/[0.07]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        Time
                      </label>
                      <input
                        type="time"
                        value={draft.matchTime}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            matchTime: event.target.value,
                          }))
                        }
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-white/[0.07]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        Matchday
                      </label>
                      <input
                        value={draft.matchday}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            matchday: event.target.value,
                          }))
                        }
                        inputMode="numeric"
                        className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-white/[0.07]"
                      />
                    </div>
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
                            .value as UpdateFixturePayload["status"],
                        }))
                      }
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                    >
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="POSTPONED">Postponed</option>
                      <option value="CANCELLED">Cancelled</option>
                    </select>
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
                      Competition
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {getCompetitionName(fixture.competition)}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Date
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {formatDate(fixture.scheduledAt)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Time
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {formatTime(fixture.scheduledAt)}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      Venue
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {getVenueName(fixture.venue)}
                    </p>
                  </div>

                  <button
                    onClick={startEditing}
                    className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
                  >
                    <Edit3 size={17} />
                    Edit fixture
                  </button>
                </div>
              )}
            </article>
          </section>

          <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-[-0.03em]">
                Fixture preview
              </h2>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300/70">
                Public card
              </span>
            </div>

            <div className="mt-5 max-w-3xl rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-[1.5rem] bg-white/[0.05] p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-emerald-400 px-2 text-center text-base font-black leading-none text-[#07110f]">
                    {getClubShortName(previewHomeClub)}
                  </div>
                  <p className="mt-4 text-sm font-black text-white">
                    {getClubName(previewHomeClub)}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-white/30">
                    Home
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/30">
                    Matchday {previewMatchday}
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.08em] text-white">
                    VS
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-white/[0.05] p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-cyan-300 px-2 text-center text-base font-black leading-none text-[#07110f]">
                    {getClubShortName(previewAwayClub)}
                  </div>
                  <p className="mt-4 text-sm font-black text-white">
                    {getClubName(previewAwayClub)}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-white/30">
                    Away
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <Trophy className="mx-auto text-emerald-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Competition
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {getCompetitionName(selectedCompetition)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <Clock className="mx-auto text-cyan-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Kickoff
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {formatTime(previewScheduledAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <MapPin className="mx-auto text-violet-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Venue
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {getVenueName(previewVenue)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <Shield className="mx-auto text-emerald-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Status
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {previewStatus}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/45">
                <UsersRound size={16} className="text-emerald-300" />
                {competitionClubs.length} club
                {competitionClubs.length === 1 ? "" : "s"} available in this
                competition.
              </div>

              {previewStatus === "COMPLETED" ? (
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200">
                  <CheckCircle2 size={16} />
                  This fixture is marked as completed. Result editing comes in
                  the Results section.
                </div>
              ) : null}
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
