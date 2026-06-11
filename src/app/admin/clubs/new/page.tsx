"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Plus,
  Shield,
  Sparkles,
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

type CreateClubPayload = {
  name: string;
  shortName?: string;
  isActive: boolean;
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

  return "Could not create club. Please check the details and try again.";
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

async function createClub(payload: CreateClubPayload) {
  const response = await api.post<ApiResponse<Club>>("/admin/clubs", payload);
  return response.data.data;
}

export default function AdminCreateClubPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState("");
  const [shortName, setShortName] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState("");

  const suggestedShortName = useMemo(() => createInitials(name), [name]);
  const previewShortName = shortName.trim() || suggestedShortName;
  const previewSlug = slugify(name) || "club-slug";

  const createClubMutation = useMutation({
    mutationFn: createClub,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-clubs"] });
      router.push("/admin/clubs");
    },
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const cleanName = name.trim();
    const cleanShortName = shortName.trim();

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

    createClubMutation.mutate({
      name: cleanName,
      shortName: cleanShortName || suggestedShortName,
      isActive,
    });
  }

  const errorMessage =
    formError ||
    (createClubMutation.isError
      ? getErrorMessage(createClubMutation.error)
      : "");

  return (
    <AdminShell
      activeKey="clubs"
      title="Create club"
      description="Add a new club to the league system."
    >
      <div className="mb-5">
        <Link
          href="/admin/clubs"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to clubs
        </Link>
      </div>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <Plus size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            New club
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
            Add a team to the league.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            Once created, this club can be added to competitions, fixtures,
            results and the public club directory.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="flex items-start gap-3">
              <Sparkles
                size={18}
                className="mt-0.5 shrink-0 text-emerald-300"
              />
              <div>
                <p className="text-sm font-black text-emerald-200">
                  Keep names clean and consistent.
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-white/45">
                  Use a proper club name like “Pretoria Stars” and a short code
                  like “PRS”.
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Club details
            </h2>

            <span className="rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
              Draft
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                Club name
              </label>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Pretoria Stars"
                className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                Short name
              </label>
              <input
                value={shortName}
                onChange={(event) => setShortName(event.target.value)}
                placeholder={`e.g. ${suggestedShortName}`}
                className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold uppercase text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
              />
              <p className="mt-2 text-xs font-semibold text-white/35">
                This appears inside small badges and tables. Keep it short.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-white">Active club</p>
                  <p className="mt-1 text-sm font-semibold text-white/40">
                    Active clubs appear in public lists and can be used in
                    competitions.
                  </p>
                </div>

                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => setIsActive(event.target.checked)}
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

            <button
              type="submit"
              disabled={createClubMutation.isPending}
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createClubMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={17} />
                  Creating club
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Create club
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
            Public card
          </span>
        </div>

        <div className="mt-5 max-w-md rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-emerald-400 px-2 text-center text-base font-black leading-none text-[#07110f]">
              {previewShortName}
            </div>

            <div
              className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                isActive
                  ? "bg-emerald-400/10 text-emerald-300"
                  : "bg-red-400/10 text-red-200"
              }`}
            >
              {isActive ? "Active" : "Archived"}
            </div>
          </div>

          <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-emerald-300">
            Club
          </p>

          <h3 className="mt-2 text-2xl font-black leading-none tracking-[-0.05em]">
            {name.trim() || "Club name"}
          </h3>

          <p className="mt-3 text-sm font-semibold leading-6 text-white/40">
            Slug preview: {previewSlug}
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/45">
            <Shield size={16} className="text-emerald-300" />
            Ready for competitions and fixtures.
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
