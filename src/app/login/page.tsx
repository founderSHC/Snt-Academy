import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { loginAction } from "@/lib/actions";

const errorMessages: Record<string, string> = {
  missing: "Please enter your username and password.",
  invalid: "Incorrect username or password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getSession();
  if (session) {
    redirect(session.role === "teacher" ? "/teacher" : "/student/announcements");
  }

  const { error } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--brand)] text-xl font-bold text-white">
            SNT
          </div>
          <h1 className="text-2xl font-semibold text-slate-900">SNT Academy</h1>
          <p className="mt-1 text-sm text-slate-500">Sign in to view announcements, grades, and rankings.</p>
        </div>

        <form action={loginAction} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessages[error] ?? "Something went wrong. Please try again."}
            </div>
          )}
          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              autoFocus
              autoComplete="username"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-light)]"
          >
            Sign in
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          Students: use the username and password your teacher gave you.
        </p>
      </div>
    </div>
  );
}
