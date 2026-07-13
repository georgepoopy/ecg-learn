"use client";

import { useActionState } from "react";
import Link from "next/link";

type Action = (prev: string | null, formData: FormData) => Promise<string | null>;

export default function AuthForm({
  mode,
  action,
}: {
  mode: "signin" | "signup";
  action: Action;
}) {
  const [error, formAction, pending] = useActionState(action, null);
  const isSignup = mode === "signup";

  return (
    <div className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-2xl font-semibold text-clinical-700 dark:text-clinical-200">
        {isSignup ? "Create your account" : "Sign in"}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {isSignup
          ? "Your practice bank and progress are private to your account."
          : "Welcome back — pick up where you left off."}
      </p>

      <form action={formAction} className="mt-6 space-y-3">
        {isSignup && (
          <input
            name="name"
            type="text"
            placeholder="Name (optional)"
            autoComplete="name"
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-clinical-500 dark:border-slate-700 dark:bg-slate-900"
          />
        )}
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          autoComplete="email"
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-clinical-500 dark:border-slate-700 dark:bg-slate-900"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-clinical-500 dark:border-slate-700 dark:bg-slate-900"
        />

        {error && (
          <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-clinical-600 px-4 py-2 text-sm font-medium text-white hover:bg-clinical-700 disabled:opacity-60"
        >
          {pending ? "…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
        {isSignup ? (
          <>Already have an account? <Link href="/signin" className="text-clinical-600 hover:underline">Sign in</Link></>
        ) : (
          <>New here? <Link href="/signup" className="text-clinical-600 hover:underline">Create an account</Link></>
        )}
      </p>
    </div>
  );
}
