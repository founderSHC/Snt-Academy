import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";
import { formatDate } from "@/lib/utils";

type AnnouncementRow = {
  id: number;
  title: string;
  body: string;
  class_id: number | null;
  created_at: string;
};

export default async function StudentAnnouncementsPage() {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/login");

  const announcements = db
    .prepare(
      `SELECT id, title, body, class_id, created_at
       FROM announcements
       WHERE class_id IS NULL OR class_id = ?
       ORDER BY created_at DESC`
    )
    .all(session.classId) as AnnouncementRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-xl font-semibold text-slate-900">Announcements</h1>
        <p className="mt-1 text-sm text-slate-500">Updates from your teacher.</p>
      </div>

      {announcements.length === 0 ? (
        <p className="text-sm text-slate-400">No announcements yet.</p>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div key={a.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-slate-900">{a.title}</h2>
                {a.class_id === null && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                    All classes
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-400">{formatDate(a.created_at)}</p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{a.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
