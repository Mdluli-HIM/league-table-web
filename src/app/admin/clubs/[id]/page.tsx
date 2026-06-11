"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  ArrowLeft,
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
  slug?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    competitionTeams?: number;
    playerRegistrations?: number;
    matchesHome?: number;
    matchesAway?: number;
  };
};

type UpdateClubPayload = {
  name: string;
  shortName?: string;
  isActive: boolean;
};

type DraftClub = {
  name: string;
  shortName: string;
  isActive: boolean;
};

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

function getClubFromResponse(value: unknown) {
  if (!isRecord(value)) {
    return {};
  }

  if (isRecord(value.club)) {
    return value.club;
  }

  return value;
}

function getClubName(club: Club) {
  return club.name || club.shortName || "Unknown Club";
}

function getClubShortName(club: Club) {
  const rawShortName = club.shortName?.trim();

  if (rawShortName && rawShortName.length <= 4) {
    return rawShortName.toUpperCase();
  }

  if (!club.name) {
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

function createInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 3)
    .toUpperCase();

  return initials || "FC";
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
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

async function fetchAdminClub(id: string) {
  const response = await api.get<ApiResponse<unknown>>(`/admin/clubs/${id}`);
  return getClubFromResponse(response.data.data) as Club;
}

async function updateAdminClub(id: string, payload: UpdateClubPayload) {
  const response = await api.patch<ApiResponse<Club>>(
    `/admin/clubs/${id}`,
    payload,
  );

  return response.data.data;
}

export default function AdminClubDetailPage() {
  const params = useParams<{ id: string }>();

  const queryClient = useQueryClient();

  const clubId = params.id;

  const [isEditing, setIsEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [draft, setDraft] = useState<DraftClub>({
    name: "",
    shortName: "",
    isActive: true,
  });

  const clubQuery = useQuery({
    queryKey: ["admin-club", clubId],
    queryFn: () => fetchAdminClub(clubId),
    enabled: Boolean(clubId),
  });

  const club = useMemo(() => clubQuery.data ?? {}, [clubQuery.data]);

  const previewShortName = useMemo(() => {
    if (isEditing) {
      return draft.shortName.trim() || createInitials(draft.name);
    }

    return getClubShortName(club);
  }, [club, draft.name, draft.shortName, isEditing]);

  const previewName = isEditing ? draft.name : getClubName(club);
  const previewSlug = slugify(previewName) || club.slug || "club-slug";
  const previewActive = isEditing ? draft.isActive : club.isActive !== false;

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateClubPayload) =>
      updateAdminClub(clubId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-club", clubId] });
      setIsEditing(false);
      setFormError("");
    },
  });

  function startEditing() {
    setDraft({
      name: getClubName(club),
      shortName: club.shortName ?? getClubShortName(club),
      isActive: club.isActive !== false,
    });
    setFormError("");
    setIsEditing(true);
  }

  function cancelEditing() {
    setIsEditing(false);
    setFormError("");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const cleanName = draft.name.trim();
    const cleanShortName = draft.shortName.trim();

    if (!cleanName) {
      setFormError("Club name is required.");
      return;
    }

    if (cleanName.length < 2) {
      setFormError("Club name must be at least 2 characters.");
      return;
    }

    if (cleanShortName && cleanShortName.length > 8) {
      setFormError("Short name should be 8 characters or less.");
      return;
    }

    updateMutation.mutate({
      name: cleanName,
      shortName: cleanShortName || createInitials(cleanName),
      isActive: draft.isActive,
    });
  }

  const errorMessage =
    formError ||
    (updateMutation.isError ? getErrorMessage(updateMutation.error) : "");

  return (
    <AdminShell
      activeKey="clubs"
      title={clubQuery.isLoading ? "Club" : getClubName(club)}
      description="Review and manage this club record."
    >
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin/clubs"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to clubs
        </Link>

        {!clubQuery.isLoading && !isEditing ? (
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-4 py-2 text-xs font-black text-[#07110f] transition hover:bg-emerald-300"
          >
            <Edit3 size={14} />
            Edit club
          </button>
        ) : null}
      </div>

      {clubQuery.isLoading ? (
        <div className="flex min-h-[420px] items-center justify-center rounded-[2rem] border border-white/10 bg-white/[0.04]">
          <div className="flex items-center gap-3 text-sm font-black text-emerald-300">
            <Loader2 className="animate-spin" size={18} />
            Loading club
          </div>
        </div>
      ) : clubQuery.isError ? (
        <div className="rounded-[2rem] border border-red-400/20 bg-red-400/10 p-6">
          <p className="text-sm font-black text-red-200">
            Could not load club.
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
                {previewShortName}
              </div>

              <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
                Club record
              </p>

              <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
                {previewName}
              </h2>

              <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
                This club can be used in competitions, fixtures, results and the
                public club directory.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <UserRound size={21} className="text-cyan-300" />
                  <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                    {numberFrom(club._count?.playerRegistrations)}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Players
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <Trophy size={21} className="text-violet-300" />
                  <p className="mt-5 text-3xl font-black tracking-[-0.06em]">
                    {numberFrom(club._count?.competitionTeams)}
                  </p>
                  <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-white/35">
                    Entries
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
                  {isEditing ? "Edit club" : "Club details"}
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
                  <div>
                    <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                      Club name
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
                      Short name
                    </label>
                    <input
                      value={draft.shortName}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          shortName: event.target.value.toUpperCase(),
                        }))
                      }
                      className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold uppercase text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                    />
                    <p className="mt-2 text-xs font-semibold text-white/35">
                      Keep it short because it appears inside badges and tables.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <label className="flex cursor-pointer items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-black text-white">
                          Active club
                        </p>
                        <p className="mt-1 text-sm font-semibold text-white/40">
                          Turn this off to archive the club.
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
                      {getClubName(club)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      Short name
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {getClubShortName(club)}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                      Slug
                    </p>
                    <p className="mt-2 text-sm font-black text-white">
                      {club.slug ?? previewSlug}
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Created
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {formatDate(club.createdAt)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                        Updated
                      </p>
                      <p className="mt-2 text-sm font-black text-white">
                        {formatDate(club.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={startEditing}
                    className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300"
                  >
                    <Edit3 size={17} />
                    Edit club
                  </button>
                </div>
              )}
            </article>
          </section>

          <section className="mt-5 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-black/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black tracking-[-0.03em]">
                Public preview
              </h2>
              <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-300/70">
                Club card
              </span>
            </div>

            <div className="mt-5 max-w-md rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-emerald-400 px-2 text-center text-base font-black leading-none text-[#07110f]">
                  {previewShortName}
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                    previewActive
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-red-400/10 text-red-200"
                  }`}
                >
                  {previewActive ? "Active" : "Archived"}
                </div>
              </div>

              <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
                Club
              </p>

              <h3 className="mt-2 text-2xl font-black leading-none tracking-[-0.05em]">
                {previewName}
              </h3>

              <p className="mt-3 text-sm font-semibold leading-6 text-white/40">
                Slug preview: {previewSlug}
              </p>

              <div className="mt-6 flex items-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/45">
                <CheckCircle2 size={16} className="text-emerald-300" />
                Ready for competitions and fixtures.
              </div>
            </div>
          </section>
        </>
      )}
    </AdminShell>
  );
}
