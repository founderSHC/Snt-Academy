import db from "@/lib/db";
import { addAnnouncement, deleteAnnouncement } from "@/lib/actions";
import { formatDate } from "@/lib/utils";

type ClassRow = { id: number; name: string };
type AnnouncementRow = {
  id: number;
  title: string;
  body: string;
  class_id: number | null;
  class_name: string | null;
  created_at: string;
};

const messages: Record<string, string> = {
  added: "Announcement posted.",
  deleted: "Announcement removed.",
};
const errors: Record<string, string> = {
  missing: "Please fill in the title and message.",
};

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { success, error } = await searchParams;

  const classes = db.prepare("SELECT id, name FROM classes ORDER BY id").all() as ClassRow[];
  const announcements = db
    .prepare(
      `SELECT a.id, a.title, a.body, a.class_id, c.name as class_name, a.created_at
       FROM announcements a
       LEFT JOIN classes c ON c.id = a.class_id
       ORDER BY a.created_at DESC`
    )
    .all() as AnnouncementRow[];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">Post updates for all students or a specific class.</p>
      </div>

      {success && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {messages[success] ?? "Done."}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors[error] ?? "Something went wrong."}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-semibold text-slate-900">New announcement</h2>
        <form action={addAnnouncement} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
              <input
                name="title"
                required
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Audience</label>
              <select
                name="classId"
                defaultValue="all"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
              >
                <option value="all">All classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Message</label>
            <textarea
              name="body"
              required
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-light)]"
          >
            Post announcement
          </button>
        </form>
      </section>

      <section className="space-y-4">
        {announcements.length === 0 ? (
          <p className="text-sm text-slate-400">No announcements posted yet.</p>
        ) : (
          announcements.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-slate-900">{a.title}</h3>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      {a.class_name ?? "All classes"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(a.created_at)}</p>
                </div>
                <form action={deleteAnnouncement}>
                  <input type="hidden" name="id" value={a.id} />
                  <button type="submit" className="text-sm text-red-600 hover:underline">
                    Delete
                  </button>
                </form>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{a.body}</p>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
