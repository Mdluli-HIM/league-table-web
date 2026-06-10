"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

type LoginResponse = {
  success: boolean;
  message: string;
  data: {
    accessToken: string;
    tokenType: string;
    expiresInSeconds: number;
    admin: {
      id: string;
      name: string;
      email: string;
      role: string;
      status: string;
    };
  };
};

export default function AdminLoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);

  const [email, setEmail] = useState("admin@league.local");
  const [password, setPassword] = useState("AdminPassword123!");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setIsSubmitting(true);

    try {
      const response = await api.post<LoginResponse>("/auth/login", {
        email,
        password,
      });

      setAuth(response.data.data.accessToken, response.data.data.admin);

      router.push("/admin/dashboard");
    } catch {
      setError("Login failed. Please check your email and password.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f7f4] px-4 py-8">
      <section className="w-full max-w-md rounded-[2rem] border border-black/10 bg-white p-5 shadow-sm sm:p-8">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#14532d]">
            Admin access
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.06em] text-black">
            Sign in to manage the league.
          </h1>
          <p className="mt-3 text-sm leading-6 text-black/60">
            Use your admin account to manage seasons, clubs, fixtures, results,
            competitions and venues.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-black/50">
              Email
            </span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-14 w-full rounded-2xl border border-black/10 bg-[#f6f7f4] px-4 text-sm font-semibold outline-none transition focus:border-[#14532d]"
              required
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-black/50">
              Password
            </span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-14 w-full rounded-2xl border border-black/10 bg-[#f6f7f4] px-4 text-sm font-semibold outline-none transition focus:border-[#14532d]"
              required
            />
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-black text-sm font-black text-white transition hover:bg-[#14532d] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : null}
            {isSubmitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}
