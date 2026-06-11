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
};

type Competition = {
  id?: string;
  name?: string;
  slug?: string;
  type?: string;
  status?: string;
};

type Venue = {
  id?: string;
  name?: string;
  address?: string | null;
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
  homePenaltyScore?: number | null;
  awayPenaltyScore?: number | null;
  winnerClubId?: string | null;
  status?: string;
  competition?: Competition | null;
  homeClub?: Club | null;
  awayClub?: Club | null;
  homeTeam?: Club | null;
  awayTeam?: Club | null;
  venue?: Venue | null;
};

type RecordResultPayload = {
  matchId: string;
  homeScore: number;
  awayScore: number;
  homePenaltyScore?: number;
  awayPenaltyScore?: number;
  winnerClubId?: string;
  status: "COMPLETED";
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

  return "Could not record result. Please check the score and try again.";
}

function getHomeClub(match?: Match | null) {
  return match?.homeClub ?? match?.homeTeam ?? null;
}

function getAwayClub(match?: Match | null) {
  return match?.awayClub ?? match?.awayTeam ?? null;
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

function getMatchName(match?: Match | null) {
  return `${getClubName(getHomeClub(match))} vs ${getClubName(
    getAwayClub(match),
  )}`;
}

function getCompetitionName(match?: Match | null) {
  return match?.competition?.name || "No competition";
}

function getVenueName(match?: Match | null) {
  return match?.venue?.name || "Venue TBC";
}

function getMatchStatus(match?: Match | null) {
  return match?.status || "SCHEDULED";
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

function isRecordableFixture(match: Match) {
  const status = getMatchStatus(match).toLowerCase();

  return (
    !status.includes("completed") &&
    !status.includes("finished") &&
    !status.includes("cancelled")
  );
}

function getWinnerClubId(match: Match, homeScore: number, awayScore: number) {
  if (homeScore > awayScore) {
    return match.homeClubId ?? getHomeClub(match)?.id;
  }

  if (awayScore > homeScore) {
    return match.awayClubId ?? getAwayClub(match)?.id;
  }

  return undefined;
}

function getResultLabel(
  match: Match | null,
  homeScore: string,
  awayScore: string,
) {
  const parsedHome = Number(homeScore);
  const parsedAway = Number(awayScore);

  if (!match || !Number.isFinite(parsedHome) || !Number.isFinite(parsedAway)) {
    return "Result preview";
  }

  if (parsedHome > parsedAway) {
    return `${getClubName(getHomeClub(match))} win`;
  }

  if (parsedAway > parsedHome) {
    return `${getClubName(getAwayClub(match))} win`;
  }

  return "Draw";
}

async function fetchFixtures() {
  const possiblePaths = [
    "/admin/fixtures",
    "/admin/matches",
    "/fixtures",
    "/matches",
    "/public/fixtures",
  ];

  for (const path of possiblePaths) {
    try {
      const response = await api.get<ApiResponse<unknown>>(path);

      return unwrapArray<Match>(response.data.data, [
        "fixtures",
        "matches",
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

async function recordResult(payload: RecordResultPayload) {
  const scoreBody = {
    homeScore: payload.homeScore,
    awayScore: payload.awayScore,
    homePenaltyScore: payload.homePenaltyScore,
    awayPenaltyScore: payload.awayPenaltyScore,
    winnerClubId: payload.winnerClubId,
    status: payload.status,
  };

  const postBody = {
    matchId: payload.matchId,
    ...scoreBody,
  };

  const possibleRequests = [
    {
      method: "post",
      path: `/admin/matches/${payload.matchId}/result`,
      body: scoreBody,
    },
    {
      method: "post",
      path: `/admin/fixtures/${payload.matchId}/result`,
      body: scoreBody,
    },
    {
      method: "post",
      path: "/admin/results",
      body: postBody,
    },
    {
      method: "post",
      path: "/results",
      body: postBody,
    },
    {
      method: "patch",
      path: `/admin/matches/${payload.matchId}`,
      body: scoreBody,
    },
    {
      method: "patch",
      path: `/admin/fixtures/${payload.matchId}`,
      body: scoreBody,
    },
    {
      method: "patch",
      path: `/matches/${payload.matchId}`,
      body: scoreBody,
    },
    {
      method: "patch",
      path: `/fixtures/${payload.matchId}`,
      body: scoreBody,
    },
  ];

  let lastError: unknown = null;

  for (const request of possibleRequests) {
    try {
      if (request.method === "post") {
        const response = await api.post<ApiResponse<Match>>(
          request.path,
          request.body,
        );

        return response.data.data;
      }

      const response = await api.patch<ApiResponse<Match>>(
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

export default function AdminRecordResultPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fixtureId, setFixtureId] = useState("");
  const [homeScore, setHomeScore] = useState("");
  const [awayScore, setAwayScore] = useState("");
  const [homePenaltyScore, setHomePenaltyScore] = useState("");
  const [awayPenaltyScore, setAwayPenaltyScore] = useState("");
  const [formError, setFormError] = useState("");

  const fixturesQuery = useQuery({
    queryKey: ["admin-fixtures"],
    queryFn: fetchFixtures,
  });

  const fixtures = useMemo(
    () => fixturesQuery.data ?? [],
    [fixturesQuery.data],
  );

  const recordableFixtures = useMemo(() => {
    return fixtures.filter(isRecordableFixture);
  }, [fixtures]);

  const selectedFixture = useMemo(() => {
    return recordableFixtures.find((match) => match.id === fixtureId) ?? null;
  }, [fixtureId, recordableFixtures]);

  const recordResultMutation = useMutation({
    mutationFn: recordResult,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-results"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-fixtures"] });
      router.push("/admin/results");
    },
  });

  function handleFixtureChange(value: string) {
    setFixtureId(value);
    setHomeScore("");
    setAwayScore("");
    setHomePenaltyScore("");
    setAwayPenaltyScore("");
    setFormError("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    if (!selectedFixture?.id) {
      setFormError("Please select a fixture.");
      return;
    }

    const parsedHomeScore = Number(homeScore);
    const parsedAwayScore = Number(awayScore);

    if (!Number.isInteger(parsedHomeScore) || parsedHomeScore < 0) {
      setFormError("Home score must be a whole number of 0 or higher.");
      return;
    }

    if (!Number.isInteger(parsedAwayScore) || parsedAwayScore < 0) {
      setFormError("Away score must be a whole number of 0 or higher.");
      return;
    }

    const cleanHomePenaltyScore = homePenaltyScore.trim();
    const cleanAwayPenaltyScore = awayPenaltyScore.trim();

    const parsedHomePenaltyScore = cleanHomePenaltyScore
      ? Number(cleanHomePenaltyScore)
      : undefined;

    const parsedAwayPenaltyScore = cleanAwayPenaltyScore
      ? Number(cleanAwayPenaltyScore)
      : undefined;

    if (
      parsedHomePenaltyScore !== undefined &&
      (!Number.isInteger(parsedHomePenaltyScore) || parsedHomePenaltyScore < 0)
    ) {
      setFormError("Home penalty score must be a whole number of 0 or higher.");
      return;
    }

    if (
      parsedAwayPenaltyScore !== undefined &&
      (!Number.isInteger(parsedAwayPenaltyScore) || parsedAwayPenaltyScore < 0)
    ) {
      setFormError("Away penalty score must be a whole number of 0 or higher.");
      return;
    }

    recordResultMutation.mutate({
      matchId: selectedFixture.id,
      homeScore: parsedHomeScore,
      awayScore: parsedAwayScore,
      homePenaltyScore: parsedHomePenaltyScore,
      awayPenaltyScore: parsedAwayPenaltyScore,
      winnerClubId: getWinnerClubId(
        selectedFixture,
        parsedHomeScore,
        parsedAwayScore,
      ),
      status: "COMPLETED",
    });
  }

  const errorMessage =
    formError ||
    (recordResultMutation.isError
      ? getErrorMessage(recordResultMutation.error)
      : "");

  return (
    <AdminShell
      activeKey="results"
      title="Record result"
      description="Select a fixture and capture the final score."
    >
      <div className="mb-5">
        <Link
          href="/admin/results"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to results
        </Link>
      </div>

      {fixturesQuery.isLoading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
            <Loader2 className="animate-spin" size={18} />
            Loading fixtures
          </div>
        </div>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
                <Trophy size={28} />
              </div>

              <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
                Match result
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
                Capture the final score.
              </h2>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                Once saved, the match will be marked as completed and will feed
                the results section and league table.
              </p>

              <div className="mt-8 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
                <div className="flex items-start gap-3">
                  <Sparkles
                    size={18}
                    className="mt-0.5 shrink-0 text-emerald-300"
                  />
                  <div>
                    <p className="text-sm font-black text-emerald-200">
                      Record results carefully.
                    </p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-white/45">
                      League standings depend on these scores, so double-check
                      the teams before saving.
                    </p>
                  </div>
                </div>
              </div>
            </article>

            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-black tracking-[-0.03em]">
                  Result details
                </h2>

                <span className="rounded-full border border-cyan-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-cyan-300">
                  Final
                </span>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                    Fixture
                  </label>

                  <select
                    value={fixtureId}
                    onChange={(event) =>
                      handleFixtureChange(event.target.value)
                    }
                    className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
                  >
                    <option value="">Select fixture</option>
                    {recordableFixtures.map((match) => (
                      <option key={match.id} value={match.id}>
                        {getMatchName(match)} — {formatDate(match.scheduledAt)}
                      </option>
                    ))}
                  </select>

                  <p className="mt-2 text-xs font-semibold text-white/35">
                    Completed and cancelled matches are hidden from this list.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Home score
                    </label>
                    <input
                      value={homeScore}
                      onChange={(event) => setHomeScore(event.target.value)}
                      inputMode="numeric"
                      placeholder="0"
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Away score
                    </label>
                    <input
                      value={awayScore}
                      onChange={(event) => setAwayScore(event.target.value)}
                      inputMode="numeric"
                      placeholder="0"
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Home penalties
                    </label>
                    <input
                      value={homePenaltyScore}
                      onChange={(event) =>
                        setHomePenaltyScore(event.target.value)
                      }
                      inputMode="numeric"
                      placeholder="Optional"
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Away penalties
                    </label>
                    <input
                      value={awayPenaltyScore}
                      onChange={(event) =>
                        setAwayPenaltyScore(event.target.value)
                      }
                      inputMode="numeric"
                      placeholder="Optional"
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
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

                <button
                  type="submit"
                  disabled={recordResultMutation.isPending}
                  className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {recordResultMutation.isPending ? (
                    <>
                      <Loader2 className="animate-spin" size={17} />
                      Recording result
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      Record result
                    </>
                  )}
                </button>
              </form>
            </article>
          </section>

          <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-[-0.03em]">Preview</h2>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300/70">
                Result card
              </span>
            </div>

            <div className="mt-5 max-w-3xl rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-[1.5rem] bg-white/[0.05] p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-emerald-400 px-2 text-center text-base font-black leading-none text-[#07110f]">
                    {getClubShortName(getHomeClub(selectedFixture))}
                  </div>
                  <p className="mt-4 text-sm font-black text-white">
                    {getClubName(getHomeClub(selectedFixture))}
                  </p>
                  <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-white/30">
                    Home
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-white/30">
                    Final score
                  </p>
                  <p className="mt-2 text-5xl font-black tracking-[-0.1em] text-white">
                    {homeScore || "-"} - {awayScore || "-"}
                  </p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                    {getResultLabel(selectedFixture, homeScore, awayScore)}
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-white/[0.05] p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-cyan-300 px-2 text-center text-base font-black leading-none text-[#07110f]">
                    {getClubShortName(getAwayClub(selectedFixture))}
                  </div>
                  <p className="mt-4 text-sm font-black text-white">
                    {getClubName(getAwayClub(selectedFixture))}
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
                    {getCompetitionName(selectedFixture)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <CalendarDays className="mx-auto text-cyan-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Date
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {formatDate(selectedFixture?.scheduledAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <Clock className="mx-auto text-violet-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Time
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {formatTime(selectedFixture?.scheduledAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <MapPin className="mx-auto text-emerald-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Venue
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {getVenueName(selectedFixture)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/45">
                <Shield size={16} className="text-emerald-300" />
                Saving will mark this match as COMPLETED.
              </div>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
