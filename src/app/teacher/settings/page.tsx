import { changeTeacherPassword } from "@/lib/actions";

const errors: Record<string, string> = {
  wrong: "Your current password was incorrect.",
  short: "New password must be at least 6 characters.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your teacher account.</p>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          Password updated.
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors[error] ?? "Something went wrong."}
        </div>
      )}

      <section className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Change password</h2>
        <form action={changeTeacherPassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Current password</label>
            <input
              name="currentPassword"
              type="password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">New password</label>
            <input
              name="newPassword"
              type="password"
              required
              minLength={6}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-light)]"
          >
            Update password
          </button>
        </form>
      </section>
    </div>
  );
}
