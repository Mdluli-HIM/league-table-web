"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
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

type Venue = {
  id?: string;
  name?: string;
  address?: string | null;
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

type Match = {
  id?: string;
  competitionId?: string;
  venueId?: string | null;
  homeClubId?: string;
  awayClubId?: string;
  scheduledAt?: string;
  matchday?: number | null;
  status?: string;
};

type CreateFixturePayload = {
  competitionId: string;
  homeClubId: string;
  awayClubId: string;
  scheduledAt: string;
  matchday?: number;
  venueId?: string;
  status: "SCHEDULED" | "POSTPONED" | "CANCELLED";
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

  return "Could not create fixture. Please check the details and try again.";
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

function getCompetitionName(competition?: Competition | null) {
  return competition?.name || "No competition selected";
}

function getTeams(competition?: Competition | null) {
  return competition?.competitionTeams ?? competition?.teams ?? [];
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

function getVenueName(venue?: Venue | null) {
  return venue?.name || "Venue TBC";
}

function combineDateAndTime(dateValue: string, timeValue: string) {
  const dateTime = new Date(`${dateValue}T${timeValue}`);

  if (Number.isNaN(dateTime.getTime())) {
    return "";
  }

  return dateTime.toISOString();
}

function formatDateTime(dateValue: string, timeValue: string) {
  const iso = combineDateAndTime(dateValue, timeValue);

  if (!iso) {
    return "Date TBC";
  }

  const date = new Date(iso);

  return new Intl.DateTimeFormat("en-ZA", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
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

async function fetchCompetitions() {
  return getArrayWithFallback<Competition>(
    ["/admin/competitions", "/competitions", "/public/competitions"],
    ["competitions", "items", "data", "results"],
  );
}

async function fetchCompetition(id: string) {
  const data = await getOneWithFallback([
    `/admin/competitions/${id}`,
    `/competitions/${id}`,
  ]);

  return getCompetitionFromResponse(data) as Competition;
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

async function createFixture(payload: CreateFixturePayload) {
  const possiblePaths = [
    "/admin/fixtures",
    "/admin/matches",
    "/fixtures",
    "/matches",
  ];

  let lastError: unknown = null;

  for (const path of possiblePaths) {
    try {
      const response = await api.post<ApiResponse<Match>>(path, payload);
      return response.data.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export default function AdminCreateFixturePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [competitionId, setCompetitionId] = useState("");
  const [homeClubId, setHomeClubId] = useState("");
  const [awayClubId, setAwayClubId] = useState("");
  const [venueId, setVenueId] = useState("");
  const [matchDate, setMatchDate] = useState("2026-02-01");
  const [matchTime, setMatchTime] = useState("15:00");
  const [matchday, setMatchday] = useState("1");
  const [status, setStatus] =
    useState<CreateFixturePayload["status"]>("SCHEDULED");
  const [formError, setFormError] = useState("");

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

  const competitionQuery = useQuery({
    queryKey: ["admin-competition", competitionId],
    queryFn: () => fetchCompetition(competitionId),
    enabled: Boolean(competitionId),
  });

  const competitions = useMemo(
    () => competitionsQuery.data ?? [],
    [competitionsQuery.data],
  );

  const clubs = useMemo(() => clubsQuery.data ?? [], [clubsQuery.data]);
  const venues = useMemo(() => venuesQuery.data ?? [], [venuesQuery.data]);

  const selectedCompetition = useMemo(() => {
    return (
      competitionQuery.data ??
      competitions.find((item) => item.id === competitionId)
    );
  }, [competitionId, competitionQuery.data, competitions]);

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

  const homeClub = competitionClubs.find((club) => club.id === homeClubId);
  const awayClub = competitionClubs.find((club) => club.id === awayClubId);
  const selectedVenue = venues.find((venue) => venue.id === venueId);

  const createFixtureMutation = useMutation({
    mutationFn: createFixture,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-fixtures"] });
      router.push("/admin/fixtures");
    },
  });

  function handleCompetitionChange(value: string) {
    setCompetitionId(value);
    setHomeClubId("");
    setAwayClubId("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const cleanCompetitionId = competitionId.trim();
    const cleanHomeClubId = homeClubId.trim();
    const cleanAwayClubId = awayClubId.trim();
    const cleanVenueId = venueId.trim();
    const cleanMatchday = matchday.trim();
    const scheduledAt = combineDateAndTime(matchDate, matchTime);

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

    createFixtureMutation.mutate({
      competitionId: cleanCompetitionId,
      homeClubId: cleanHomeClubId,
      awayClubId: cleanAwayClubId,
      scheduledAt,
      matchday: parsedMatchday,
      venueId: cleanVenueId || undefined,
      status,
    });
  }

  const errorMessage =
    formError ||
    (createFixtureMutation.isError
      ? getErrorMessage(createFixtureMutation.error)
      : "");

  const loading =
    competitionsQuery.isLoading ||
    clubsQuery.isLoading ||
    venuesQuery.isLoading;

  return (
    <AdminShell
      activeKey="fixtures"
      title="Create fixture"
      description="Schedule a new match between two clubs."
    >
      <div className="mb-5">
        <Link
          href="/admin/fixtures"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to fixtures
        </Link>
      </div>

      {loading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
            <Loader2 className="animate-spin" size={18} />
            Loading fixture data
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
                <CalendarDays size={28} />
              </div>

              <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
                New fixture
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
                Schedule a match for the league.
              </h2>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                Select the competition, home club, away club and match time. The
                fixture will appear in the admin and public fixture lists.
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-300"
                  />
                  <div>
                    <p className="text-sm font-black text-emerald-200">
                      Add teams first.
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-white/45">
                      For best results, make sure clubs have already been added
                      to the competition before scheduling fixtures.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  Fixture details
                </h2>

                <span className="rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
                  Draft
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                    Competition
                  </label>

                  <select
                    value={competitionId}
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
                      value={homeClubId}
                      onChange={(event) => setHomeClubId(event.target.value)}
                      disabled={!competitionId}
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
                      value={awayClubId}
                      onChange={(event) => setAwayClubId(event.target.value)}
                      disabled={!competitionId}
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
                    value={venueId}
                    onChange={(event) => setVenueId(event.target.value)}
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
                      value={matchDate}
                      onChange={(event) => setMatchDate(event.target.value)}
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-white/[0.07]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Time
                    </label>
                    <input
                      type="time"
                      value={matchTime}
                      onChange={(event) => setMatchTime(event.target.value)}
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-white/[0.07]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Matchday
                    </label>
                    <input
                      value={matchday}
                      onChange={(event) => setMatchday(event.target.value)}
                      inputMode="numeric"
                      placeholder="1"
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                    Status
                  </label>

                  <select
                    value={status}
                    onChange={(event) =>
                      setStatus(
                        event.target.value as CreateFixturePayload["status"],
                      )
                    }
                    className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                  >
                    <option value="SCHEDULED">Scheduled</option>
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

                <button
                  type="submit"
                  disabled={createFixtureMutation.isPending}
                  className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createFixtureMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={17} />
                      Creating fixture
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Create fixture
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
                Fixture card
              </span>
            </div>

            <div className="mt-5 max-w-3xl rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-[1.5rem] bg-white/[0.05] p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-emerald-400 px-2 text-center text-base font-black leading-none text-[#07110f]">
                    {getClubShortName(homeClub)}
                  </div>
                  <p className="mt-4 text-sm font-black text-white">
                    {getClubName(homeClub)}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-white/30">
                    Home
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/30">
                    Matchday {matchday || "TBC"}
                  </p>
                  <p className="mt-2 text-3xl font-black tracking-[-0.08em] text-white">
                    VS
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-white/[0.05] p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-cyan-300 px-2 text-center text-base font-black leading-none text-[#07110f]">
                    {getClubShortName(awayClub)}
                  </div>
                  <p className="mt-4 text-sm font-black text-white">
                    {getClubName(awayClub)}
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
                    {formatDateTime(matchDate, matchTime)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <MapPin className="mx-auto text-violet-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Venue
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {getVenueName(selectedVenue)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <Shield className="mx-auto text-emerald-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Status
                  </p>
                  <p className="mt-1 truncate text-sm font-black">{status}</p>
                </div>
              </div>

              {competitionId && competitionQuery.isLoading ? (
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/45">
                  <Loader2
                    className="animate-spin text-emerald-300"
                    size={16}
                  />
                  Loading competition teams...
                </div>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/45">
                  <UsersRound size={16} className="text-emerald-300" />
                  {competitionClubs.length} club
                  {competitionClubs.length === 1 ? "" : "s"} available for this
                  fixture.
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
