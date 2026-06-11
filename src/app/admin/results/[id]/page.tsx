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
  winnerClub?: Club | null;
  venue?: Venue | null;
  createdAt?: string;
  updatedAt?: string;
};

type UpdateResultPayload = {
  homeScore: number;
  awayScore: number;
  homePenaltyScore?: number;
  awayPenaltyScore?: number;
  winnerClubId?: string;
  status: "COMPLETED";
};

type DraftResult = {
  homeScore: string;
  awayScore: string;
  homePenaltyScore: string;
  awayPenaltyScore: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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

  return "Could not update result. Please check the score and try again.";
}

function getMatchFromResponse(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  if (isRecord(value.result)) {
    return value.result;
  }

  if (isRecord(value.match)) {
    return value.match;
  }

  if (isRecord(value.fixture)) {
    return value.fixture;
  }

  return value;
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

function getMatchName(match: Match) {
  return `${getClubName(getHomeClub(match))} vs ${getClubName(
    getAwayClub(match),
  )}`;
}

function getCompetitionName(match: Match) {
  return match.competition?.name || "No competition";
}

function getVenueName(match: Match) {
  return match.venue?.name || "Venue TBC";
}

function getMatchStatus(match: Match) {
  return match.status || "COMPLETED";
}

function getScoreLabel(match: Match) {
  const homeScore =
    typeof match.homeScore === "number" ? String(match.homeScore) : "-";
  const awayScore =
    typeof match.awayScore === "number" ? String(match.awayScore) : "-";

  return `${homeScore} - ${awayScore}`;
}

function getDraftScoreLabel(draft: DraftResult) {
  return `${draft.homeScore || "-"} - ${draft.awayScore || "-"}`;
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

function getResultLabel(match: Match, homeScore?: number, awayScore?: number) {
  const finalHomeScore =
    typeof homeScore === "number" ? homeScore : match.homeScore;
  const finalAwayScore =
    typeof awayScore === "number" ? awayScore : match.awayScore;

  if (
    typeof finalHomeScore !== "number" ||
    typeof finalAwayScore !== "number"
  ) {
    return "Score pending";
  }

  if (finalHomeScore > finalAwayScore) {
    return `${getClubName(getHomeClub(match))} win`;
  }

  if (finalAwayScore > finalHomeScore) {
    return `${getClubName(getAwayClub(match))} win`;
  }

  return "Draw";
}

function getWinnerBadge(match: Match, homeScore?: number, awayScore?: number) {
  const finalHomeScore =
    typeof homeScore === "number" ? homeScore : match.homeScore;
  const finalAwayScore =
    typeof awayScore === "number" ? awayScore : match.awayScore;

  if (
    typeof finalHomeScore !== "number" ||
    typeof finalAwayScore !== "number"
  ) {
    return "TBC";
  }

  if (finalHomeScore > finalAwayScore) {
    return getClubShortName(getHomeClub(match));
  }

  if (finalAwayScore > finalHomeScore) {
    return getClubShortName(getAwayClub(match));
  }

  return "DRAW";
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

function getStatusClass(status: string) {
  const normalized = status.toLowerCase();

  if (normalized.includes("completed") || normalized.includes("finished")) {
    return "bg-cyan-400/10 text-cyan-300";
  }

  if (normalized.includes("scheduled")) {
    return "bg-emerald-400/10 text-emerald-300";
  }

  if (normalized.includes("cancelled") || normalized.includes("postponed")) {
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
      // Try next endpoint.
    }
  }

  return {};
}

async function fetchResult(id: string) {
  const data = await getOneWithFallback([
    `/admin/results/${id}`,
    `/admin/matches/${id}`,
    `/admin/fixtures/${id}`,
    `/results/${id}`,
    `/matches/${id}`,
    `/fixtures/${id}`,
  ]);

  return getMatchFromResponse(data) as Match;
}

async function updateResult(id: string, payload: UpdateResultPayload) {
  const possibleRequests = [
    {
      method: "patch",
      path: `/admin/results/${id}`,
      body: payload,
    },
    {
      method: "patch",
      path: `/admin/matches/${id}/result`,
      body: payload,
    },
    {
      method: "patch",
      path: `/admin/fixtures/${id}/result`,
      body: payload,
    },
    {
      method: "post",
      path: `/admin/matches/${id}/result`,
      body: payload,
    },
    {
      method: "post",
      path: `/admin/fixtures/${id}/result`,
      body: payload,
    },
    {
      method: "patch",
      path: `/admin/matches/${id}`,
      body: payload,
    },
    {
      method: "patch",
      path: `/admin/fixtures/${id}`,
      body: payload,
    },
    {
      method: "patch",
      path: `/matches/${id}`,
      body: payload,
    },
    {
      method: "patch",
      path: `/fixtures/${id}`,
      body: payload,
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

export default function AdminResultDetailPage() {
  const params = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const resultId = params.id;

  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<DraftResult>({
    homeScore: "",
    awayScore: "",
    homePenaltyScore: "",
    awayPenaltyScore: "",
  });

  const resultQuery = useQuery({
    queryKey: ["admin-result", resultId],
    queryFn: () => fetchResult(resultId),
    enabled: Boolean(resultId),
  });

  const result = useMemo(() => resultQuery.data ?? {}, [resultQuery.data]);

  const draftHomeScore = Number(draft.homeScore);
  const draftAwayScore = Number(draft.awayScore);
  const hasValidDraftScore =
    Number.isInteger(draftHomeScore) && Number.isInteger(draftAwayScore);

  const previewScore = isEditing
    ? getDraftScoreLabel(draft)
    : getScoreLabel(result);
  const previewResultLabel =
    isEditing && hasValidDraftScore
      ? getResultLabel(result, draftHomeScore, draftAwayScore)
      : getResultLabel(result);
  const previewWinnerBadge =
    isEditing && hasValidDraftScore
      ? getWinnerBadge(result, draftHomeScore, draftAwayScore)
      : getWinnerBadge(result);

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateResultPayload) =>
      updateResult(resultId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-results"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-fixtures"] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-result", resultId],
      });
      setIsEditing(false);
      setFormError("");
    },
  });

  function startEditing() {
    setDraft({
      homeScore:
        typeof result.homeScore === "number" ? String(result.homeScore) : "",
      awayScore:
        typeof result.awayScore === "number" ? String(result.awayScore) : "",
      homePenaltyScore:
        typeof result.homePenaltyScore === "number"
          ? String(result.homePenaltyScore)
          : "",
      awayPenaltyScore:
        typeof result.awayPenaltyScore === "number"
          ? String(result.awayPenaltyScore)
          : "",
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

    const parsedHomeScore = Number(draft.homeScore);
    const parsedAwayScore = Number(draft.awayScore);

    if (!Number.isInteger(parsedHomeScore) || parsedHomeScore < 0) {
      setFormError("Home score must be a whole number of 0 or higher.");
      return;
    }

    if (!Number.isInteger(parsedAwayScore) || parsedAwayScore < 0) {
      setFormError("Away score must be a whole number of 0 or higher.");
      return;
    }

    const cleanHomePenaltyScore = draft.homePenaltyScore.trim();
    const cleanAwayPenaltyScore = draft.awayPenaltyScore.trim();

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

    updateMutation.mutate({
      homeScore: parsedHomeScore,
      awayScore: parsedAwayScore,
      homePenaltyScore: parsedHomePenaltyScore,
      awayPenaltyScore: parsedAwayPenaltyScore,
      winnerClubId: getWinnerClubId(result, parsedHomeScore, parsedAwayScore),
      status: "COMPLETED",
    });
  }

  const errorMessage =
    formError ||
    (updateMutation.isError ? getErrorMessage(updateMutation.error) : "");

  return (
    <AdminShell
      activeKey="results"
      title={resultQuery.isLoading ? "Result" : getMatchName(result)}
      description="Review and update this match result."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/results"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to results
        </Link>

        {!resultQuery.isLoading && !isEditing ? (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-[#07110f] transition hover:bg-emerald-300"
          >
            <Edit3 size={14} />
            Edit result
          </button>
        ) : null}
      </div>

      {resultQuery.isLoading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
            <Loader2 className="animate-spin" size={18} />
            Loading result
          </div>
        </div>
      ) : resultQuery.isError ? (
        <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-6">
          <p className="text-sm font-black text-red-200">
            Could not load result.
          </p>
          <p className="mt-2 text-sm font-semibold text-white/45">
            Make sure the backend is running and your admin token is valid.
          </p>
        </div>
      ) : (
        <>
          <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-300 text-[#07110f]">
                <Trophy size={28} />
              </div>

              <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-cyan-300/75">
                Result record
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
                {getMatchName(result)}
              </h2>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                This score feeds the league table, club form and public results.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Trophy size={21} className="text-cyan-300" />
                  <p className="mt-5 text-3xl font-black tracking-[-0.08em]">
                    {previewScore}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Score
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Shield size={21} className="text-emerald-300" />
                  <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                    {previewWinnerBadge}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Winner
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <CheckCircle2 size={21} className="text-violet-300" />
                  <p className="mt-5 text-xl font-black tracking-[-0.04em]">
                    {getMatchStatus(result)}
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
                  {isEditing ? "Edit score" : "Result details"}
                </h2>

                <span
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.14em] ${getStatusClass(
                    getMatchStatus(result),
                  )}`}
                >
                  {getMatchStatus(result)}
                </span>
              </div>

              {isEditing ? (
                <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                        Home score
                      </label>
                      <input
                        value={draft.homeScore}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            homeScore: event.target.value,
                          }))
                        }
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
                        value={draft.awayScore}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            awayScore: event.target.value,
                          }))
                        }
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
                        value={draft.homePenaltyScore}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            homePenaltyScore: event.target.value,
                          }))
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
                        value={draft.awayPenaltyScore}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            awayPenaltyScore: event.target.value,
                          }))
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
                      Result
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-[-0.08em] text-white">
                      {getScoreLabel(result)}
                    </p>
                    <p className="mt-2 text-sm font-bold text-cyan-300">
                      {previewResultLabel}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Competition
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {getCompetitionName(result)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Venue
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {getVenueName(result)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Date
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {formatDate(result.scheduledAt)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Time
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {formatTime(result.scheduledAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={startEditing}
                    className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
                  >
                    <Edit3 size={17} />
                    Edit result
                  </button>
                </div>
              )}
            </article>
          </section>

          <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-[-0.03em]">
                Result preview
              </h2>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-cyan-300/70">
                Public card
              </span>
            </div>

            <div className="mt-5 max-w-3xl rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
                <div className="rounded-[1.5rem] bg-white/[0.05] p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-emerald-400 px-2 text-center text-base font-black leading-none text-[#07110f]">
                    {getClubShortName(getHomeClub(result))}
                  </div>
                  <p className="mt-4 text-sm font-black text-white">
                    {getClubName(getHomeClub(result))}
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
                    {previewScore}
                  </p>
                  <p className="mt-2 text-xs font-black uppercase tracking-[0.16em] text-cyan-300">
                    {previewResultLabel}
                  </p>
                </div>

                <div className="rounded-[1.5rem] bg-white/[0.05] p-5 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-3xl bg-cyan-300 px-2 text-center text-base font-black leading-none text-[#07110f]">
                    {getClubShortName(getAwayClub(result))}
                  </div>
                  <p className="mt-4 text-sm font-black text-white">
                    {getClubName(getAwayClub(result))}
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
                    Winner
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {previewWinnerBadge}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <CalendarDays className="mx-auto text-cyan-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Date
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {formatDate(result.scheduledAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <Clock className="mx-auto text-violet-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Time
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {formatTime(result.scheduledAt)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
                  <MapPin className="mx-auto text-emerald-300" size={20} />
                  <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                    Venue
                  </p>
                  <p className="mt-1 truncate text-sm font-black">
                    {getVenueName(result)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-cyan-400/10 px-4 py-3 text-sm font-bold text-cyan-200">
                <CheckCircle2 size={16} />
                This match is marked as completed.
              </div>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
