import Link from "next/link";
import db from "@/lib/db";
import { addStudent, updateStudent, deleteStudent } from "@/lib/actions";

type ClassRow = { id: number; name: string };
type StudentRow = {
  id: number;
  name: string;
  username: string;
  class_id: number;
};

const messages: Record<string, string> = {
  added: "Student registered.",
  updated: "Student updated.",
  deleted: "Student removed.",
};
const errors: Record<string, string> = {
  missing: "Please fill in all required fields.",
  duplicate: "That username is already taken.",
};

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; edit?: string }>;
}) {
  const { success, error, edit } = await searchParams;
  const editId = edit ? Number(edit) : null;

  const classes = db.prepare("SELECT id, name FROM classes ORDER BY id").all() as ClassRow[];
  const students = db
    .prepare("SELECT id, name, username, class_id FROM students ORDER BY name")
    .all() as StudentRow[];

  const editingStudent = editId ? students.find((s) => s.id === editId) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Students</h1>
        <p className="mt-1 text-sm text-slate-500">Register students and assign them to a class.</p>
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
        <h2 className="mb-4 text-sm font-semibold text-slate-900">Register a new student</h2>
        <form action={addStudent} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
            <input
              name="name"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Username</label>
            <input
              name="username"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Password</label>
            <input
              name="password"
              type="text"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
            <select
              name="classId"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-light)]"
            >
              Add student
            </button>
          </div>
        </form>
      </section>

      {classes.map((cls) => {
        const classStudents = students.filter((s) => s.class_id === cls.id);
        return (
          <section key={cls.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-semibold text-slate-900">
                {cls.name}{" "}
                <span className="font-normal text-slate-400">({classStudents.length})</span>
              </h2>
            </div>
            {classStudents.length === 0 ? (
              <p className="px-6 py-6 text-sm text-slate-400">No students registered yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {classStudents.map((s) =>
                  editingStudent && editingStudent.id === s.id ? (
                    <li key={s.id} className="bg-slate-50 px-6 py-4">
                      <form action={updateStudent} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                        <input type="hidden" name="id" value={s.id} />
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Name</label>
                          <input
                            name="name"
                            defaultValue={s.name}
                            required
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Username</label>
                          <input
                            name="username"
                            defaultValue={s.username}
                            required
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">
                            New password
                          </label>
                          <input
                            name="password"
                            type="text"
                            placeholder="Leave blank to keep"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-slate-600">Class</label>
                          <select
                            name="classId"
                            defaultValue={s.class_id}
                            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                          >
                            {classes.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-end gap-2">
                          <button
                            type="submit"
                            className="rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-light)]"
                          >
                            Save
                          </button>
                          <Link
                            href="/teacher/students"
                            className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                          >
                            Cancel
                          </Link>
                        </div>
                      </form>
                    </li>
                  ) : (
                    <li key={s.id} className="flex items-center justify-between px-6 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{s.name}</p>
                        <p className="text-xs text-slate-400">@{s.username}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/teacher/students?edit=${s.id}`}
                          className="text-sm text-[var(--brand)] hover:underline"
                        >
                          Edit
                        </Link>
                        <form action={deleteStudent}>
                          <input type="hidden" name="id" value={s.id} />
                          <button type="submit" className="text-sm text-red-600 hover:underline">
                            Remove
                          </button>
                        </form>
                      </div>
                    </li>
                  )
                )}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
