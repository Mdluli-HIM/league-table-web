"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Plus,
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

type Season = {
  id?: string;
  name?: string;
  slug?: string;
  status?: string;
  isCurrent?: boolean;
};

type Competition = {
  id?: string;
  name?: string;
  seasonId?: string;
  type?: string;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
};

type CreateCompetitionPayload = {
  name: string;
  seasonId: string;
  type: "LEAGUE" | "KNOCKOUT";
  status: "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
  startDate?: string;
  endDate?: string;
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

  return "Could not create competition. Please check the details and try again.";
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

async function createCompetition(payload: CreateCompetitionPayload) {
  const possiblePaths = ["/admin/competitions", "/competitions"];

  let lastError: unknown = null;

  for (const path of possiblePaths) {
    try {
      const response = await api.post<ApiResponse<Competition>>(path, payload);
      return response.data.data;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError;
}

export default function AdminCreateCompetitionPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [type, setType] = useState<CreateCompetitionPayload["type"]>("LEAGUE");
  const [status, setStatus] =
    useState<CreateCompetitionPayload["status"]>("ACTIVE");
  const [startDate, setStartDate] = useState("2026-01-15");
  const [endDate, setEndDate] = useState("2026-11-30");
  const [formError, setFormError] = useState("");

  const seasonsQuery = useQuery({
    queryKey: ["admin-seasons"],
    queryFn: fetchSeasons,
  });

  const seasons = useMemo(() => seasonsQuery.data ?? [], [seasonsQuery.data]);
  const currentSeason = seasons.find((season) => season.isCurrent);
  const defaultSeasonId = currentSeason?.id ?? seasons[0]?.id ?? "";
  const selectedSeason = seasons.find(
    (season) => season.id === (seasonId || defaultSeasonId),
  );

  const createCompetitionMutation = useMutation({
    mutationFn: createCompetition,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-competitions"],
      });
      router.push("/admin/competitions");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const cleanName = name.trim();
    const cleanSeasonId = seasonId.trim() || defaultSeasonId;
    const cleanStartDate = startDate.trim();
    const cleanEndDate = endDate.trim();

    if (!cleanName) {
      setFormError("Competition name is required.");
      return;
    }

    if (cleanName.length < 2) {
      setFormError("Competition name must be at least 2 characters.");
      return;
    }

    if (!cleanSeasonId) {
      setFormError("Please select a season.");
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

    createCompetitionMutation.mutate({
      name: cleanName,
      seasonId: cleanSeasonId,
      type,
      status,
      startDate: cleanStartDate || undefined,
      endDate: cleanEndDate || undefined,
    });
  }

  const errorMessage =
    formError ||
    (createCompetitionMutation.isError
      ? getErrorMessage(createCompetitionMutation.error)
      : "");

  return (
    <AdminShell
      activeKey="competitions"
      title="Create competition"
      description="Create a league or knockout competition for a season."
    >
      <div className="mb-5">
        <Link
          href="/admin/competitions"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to competitions
        </Link>
      </div>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <Plus size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            New competition
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
            Create the structure for matches and standings.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            A competition connects clubs, fixtures, results and league tables
            inside a season.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="flex items-start gap-3">
              <Sparkles
                size={18}
                className="mt-0.5 shrink-0 text-emerald-300"
              />
              <div>
                <p className="text-sm font-black text-emerald-200">
                  Start with a clean structure.
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-white/45">
                  Create the competition first. Then we will add teams, fixtures
                  and results to it.
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Competition details
            </h2>

            <span className="rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
              Draft
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                Competition name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Premier League"
                className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                Season
              </label>

              <select
                value={seasonId || defaultSeasonId}
                onChange={(event) => setSeasonId(event.target.value)}
                disabled={seasonsQuery.isLoading}
                className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select season</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                    {season.isCurrent ? " — Current" : ""}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs font-semibold text-white/35">
                The demo seed should show “2026 League Season” here.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                  Type
                </label>

                <select
                  value={type}
                  onChange={(event) =>
                    setType(
                      event.target.value as CreateCompetitionPayload["type"],
                    )
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
                  value={status}
                  onChange={(event) =>
                    setStatus(
                      event.target.value as CreateCompetitionPayload["status"],
                    )
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
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-white/[0.07]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                  End date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
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

            <button
              type="submit"
              disabled={
                createCompetitionMutation.isPending || seasonsQuery.isLoading
              }
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createCompetitionMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={17} />
                  Creating competition
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Create competition
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
            Competition card
          </span>
        </div>

        <div className="mt-5 max-w-xl rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-emerald-400 text-[#07110f]">
              <Trophy size={26} />
            </div>

            <div
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                status === "ACTIVE"
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-white/[0.06] text-white/50"
              }`}
            >
              {status}
            </div>
          </div>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
            {type}
          </p>

          <h3 className="mt-2 text-2xl font-black leading-none tracking-[-0.05em]">
            {name.trim() || "Competition name"}
          </h3>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
              <CalendarDays className="mx-auto text-emerald-300" size={20} />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                Season
              </p>
              <p className="mt-1 truncate text-sm font-black">
                {selectedSeason?.name ?? "Not selected"}
              </p>
            </div>

            <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
              <Shield className="mx-auto text-cyan-300" size={20} />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                Status
              </p>
              <p className="mt-1 truncate text-sm font-black">{status}</p>
            </div>

            <div className="rounded-2xl bg-white/[0.05] p-4 text-center">
              <UsersRound className="mx-auto text-violet-300" size={20} />
              <p className="mt-3 text-xs font-black uppercase tracking-[0.12em] text-white/35">
                Teams
              </p>
              <p className="mt-1 truncate text-sm font-black">0</p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/45">
            {formatDate(startDate)} — {formatDate(endDate)}
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
