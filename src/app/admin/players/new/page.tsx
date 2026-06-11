"use client";

import Link from "next/link";
import { useMemo, useState, type FormEvent } from "react";
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

type Player = {
  id?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  position?: string | null;
  status?: string;
  isActive?: boolean;
};

type CreatePlayerPayload = {
  firstName: string;
  lastName: string;
  position?: string;
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

  return "Could not create player. Please check the details and try again.";
}

function getPlayerInitials(firstName: string, lastName: string) {
  const initials = `${firstName.trim().charAt(0)}${lastName
    .trim()
    .charAt(0)}`.toUpperCase();

  return initials || "PL";
}

async function createPlayer(payload: CreatePlayerPayload) {
  const response = await api.post<ApiResponse<Player>>(
    "/admin/players",
    payload,
  );

  return response.data.data;
}

export default function AdminCreatePlayerPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState("");

  const previewName = useMemo(() => {
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    return fullName || "Player name";
  }, [firstName, lastName]);

  const previewInitials = useMemo(() => {
    return getPlayerInitials(firstName, lastName);
  }, [firstName, lastName]);

  const createPlayerMutation = useMutation({
    mutationFn: createPlayer,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-players"] });
      router.push("/admin/players");
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanPosition = position.trim();

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

    createPlayerMutation.mutate({
      firstName: cleanFirstName,
      lastName: cleanLastName,
      position: cleanPosition || undefined,
      isActive,
    });
  }

  const errorMessage =
    formError ||
    (createPlayerMutation.isError
      ? getErrorMessage(createPlayerMutation.error)
      : "");

  return (
    <AdminShell
      activeKey="players"
      title="Create player"
      description="Add a new player record to the league system."
    >
      <div className="mb-5">
        <Link
          href="/admin/players"
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-black text-emerald-300 transition hover:bg-white/[0.08]"
        >
          <ArrowLeft size={14} />
          Back to players
        </Link>
      </div>

      <section className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-6 shadow-2xl shadow-black/20">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-[#07110f]">
            <Plus size={28} />
          </div>

          <p className="mt-10 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/75">
            New player
          </p>

          <h2 className="mt-3 max-w-3xl text-4xl font-black leading-[0.95] tracking-[-0.07em] text-white sm:text-5xl">
            Add a player to the system.
          </h2>

          <p className="mt-5 max-w-2xl text-sm font-semibold leading-6 text-white/45">
            Player records can later be registered to clubs and used in squads,
            competitions and match records.
          </p>

          <div className="mt-8 rounded-[1.5rem] border border-emerald-400/20 bg-emerald-400/10 p-4">
            <div className="flex items-start gap-3">
              <Sparkles
                size={18}
                className="mt-0.5 shrink-0 text-emerald-300"
              />
              <div>
                <p className="text-sm font-black text-emerald-200">
                  Keep player names clean.
                </p>
                <p className="mt-1 text-sm font-semibold leading-6 text-white/45">
                  Use proper first and last names. Club registration comes after
                  the player profile is created.
                </p>
              </div>
            </div>
          </div>
        </article>

        <article className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/20">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black tracking-[-0.03em]">
              Player details
            </h2>

            <span className="rounded-full border border-emerald-300/20 px-4 py-2 text-xs font-black uppercase tracking-[0.14em] text-emerald-300">
              Draft
            </span>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                  First name
                </label>
                <input
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="e.g. Thabo"
                  className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                  Last name
                </label>
                <input
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="e.g. Mokoena"
                  className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 text-sm font-bold text-white outline-none transition placeholder:text-white/25 focus:border-emerald-300/40 focus:bg-white/[0.07]"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-[0.16em] text-white/40">
                Position
              </label>

              <select
                value={position}
                onChange={(event) => setPosition(event.target.value)}
                className="mt-2 h-13 w-full rounded-2xl border border-white/10 bg-[#111c19] px-4 text-sm font-bold text-white outline-none transition focus:border-emerald-300/40 focus:bg-[#13211d]"
              >
                <option value="">Select position</option>
                {positions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>

              <p className="mt-2 text-xs font-semibold text-white/35">
                Position is optional. You can update it later.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
              <label className="flex cursor-pointer items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-black text-white">Active player</p>
                  <p className="mt-1 text-sm font-semibold text-white/40">
                    Active players can be registered and used in squads.
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
              disabled={createPlayerMutation.isPending}
              className="inline-flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-400 px-5 text-sm font-black text-[#07110f] transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createPlayerMutation.isPending ? (
                <>
                  <Loader2 className="animate-spin" size={17} />
                  Creating player
                </>
              ) : (
                <>
                  <CheckCircle2 size={17} />
                  Create player
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
            Player card
          </span>
        </div>

        <div className="mt-5 max-w-md rounded-[1.7rem] border border-white/10 bg-white/[0.04] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl bg-emerald-400 px-2 text-center text-base font-black leading-none text-[#07110f]">
              {previewInitials}
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
            Player
          </p>

          <h3 className="mt-2 text-2xl font-black leading-none tracking-[-0.05em]">
            {previewName}
          </h3>

          <p className="mt-3 text-sm font-semibold leading-6 text-white/40">
            Position: {position || "Not selected"}
          </p>

          <div className="mt-6 flex items-center gap-2 rounded-2xl bg-white/[0.05] px-4 py-3 text-sm font-bold text-white/45">
            <Shield size={16} className="text-emerald-300" />
            Ready for club registration.
          </div>
        </div>
      </section>
    </AdminShell>
  );
}
