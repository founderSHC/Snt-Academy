import Link from "next/link";
import db from "@/lib/db";

type ClassRow = { id: number; name: string; student_count: number };

export default function TeacherDashboard() {
  const classes = db
    .prepare(
      `SELECT c.id, c.name, COUNT(s.id) as student_count
       FROM classes c
       LEFT JOIN students s ON s.class_id = c.id
       GROUP BY c.id
       ORDER BY c.id`
    )
    .all() as ClassRow[];

  const announcementCount = (
    db.prepare("SELECT COUNT(*) as c FROM announcements").get() as { c: number }
  ).c;
  const testCount = (db.prepare("SELECT COUNT(*) as c FROM tests").get() as { c: number }).c;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Overview of your classes at Jiwon English.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {classes.map((c) => (
          <div key={c.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{c.name}</p>
            <p className="mt-1 text-3xl font-semibold text-slate-900">{c.student_count}</p>
            <p className="text-xs text-slate-400">students</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/teacher/students"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[var(--brand)]"
        >
          <p className="font-medium text-slate-900">Manage students</p>
          <p className="mt-1 text-sm text-slate-500">Register and organize students by class.</p>
        </Link>
        <Link
          href="/teacher/scores"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[var(--brand)]"
        >
          <p className="font-medium text-slate-900">Post test scores</p>
          <p className="mt-1 text-sm text-slate-500">{testCount} test(s) recorded so far.</p>
        </Link>
        <Link
          href="/teacher/announcements"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[var(--brand)]"
        >
          <p className="font-medium text-slate-900">Announcements</p>
          <p className="mt-1 text-sm text-slate-500">{announcementCount} posted so far.</p>
        </Link>
        <Link
          href="/teacher/settings"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[var(--brand)]"
        >
          <p className="font-medium text-slate-900">Account settings</p>
          <p className="mt-1 text-sm text-slate-500">Change your teacher login password.</p>
        </Link>
      </div>
    </div>
  );
}
