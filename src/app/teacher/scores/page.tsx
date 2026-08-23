import Link from "next/link";
import db from "@/lib/db";
import { deleteTest, saveScores, updateCategory, deleteCategory } from "@/lib/actions";
import { formatDate } from "@/lib/utils";
import NewTestForm from "./NewTestForm";
import AddCategoryForm from "./AddCategoryForm";

type ClassRow = { id: number; name: string };
type TestRow = { id: number; title: string; test_date: string; total_max: number };
type CategoryRow = {
  id: number;
  name: string;
  max_score: number;
  retest_threshold: number | null;
  counts_toward_total: number;
};
type StudentRow = { id: number; name: string; username: string };
type ScoreRow = { category_id: number; student_id: number; score: number };

const messages: Record<string, string> = {
  testAdded: "Test created.",
  testDeleted: "Test deleted.",
  scoresSaved: "Scores saved.",
  categoryAdded: "Category added.",
  categoryUpdated: "Category updated.",
  categoryDeleted: "Category deleted.",
};
const errors: Record<string, string> = {
  missing: "Please fill in all required fields, including at least one category.",
};

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<{
    classId?: string;
    testId?: string;
    success?: string;
    error?: string;
    editCategory?: string;
  }>;
}) {
  const params = await searchParams;
  const classes = db.prepare("SELECT id, name FROM classes ORDER BY id").all() as ClassRow[];
  const classId = Number(params.classId) || classes[0]?.id;
  const currentClass = classes.find((c) => c.id === classId);

  const tests = db
    .prepare(
      `SELECT t.id, t.title, t.test_date,
              COALESCE(SUM(CASE WHEN tc.counts_toward_total = 1 THEN tc.max_score ELSE 0 END), 0) as total_max
       FROM tests t
       LEFT JOIN test_categories tc ON tc.test_id = t.id
       WHERE t.class_id = ?
       GROUP BY t.id
       ORDER BY t.test_date DESC, t.id DESC`
    )
    .all(classId) as TestRow[];

  const testId = Number(params.testId) || tests[0]?.id || null;
  const currentTest = testId ? tests.find((t) => t.id === testId) : null;

  const categories = currentTest
    ? (db
        .prepare(
          "SELECT id, name, max_score, retest_threshold, counts_toward_total FROM test_categories WHERE test_id = ? ORDER BY sort_order, id"
        )
        .all(currentTest.id) as CategoryRow[])
    : [];

  const editCategoryId = params.editCategory ? Number(params.editCategory) : null;

  const students = db
    .prepare("SELECT id, name, username FROM students WHERE class_id = ? ORDER BY name")
    .all(classId) as StudentRow[];

  const existingScores = currentTest
    ? (db
        .prepare(
          `SELECT tc.id as category_id, sc.student_id, sc.score
           FROM scores sc
           JOIN test_categories tc ON tc.id = sc.test_category_id
           WHERE tc.test_id = ?`
        )
        .all(currentTest.id) as ScoreRow[])
    : [];
  const scoreMap = new Map(existingScores.map((s) => [`${s.student_id}_${s.category_id}`, s.score]));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Scores</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create weekly tests with your own categories and point values, then enter each student&apos;s score.
        </p>
      </div>

      {params.success && (
        <div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {messages[params.success] ?? "Done."}
        </div>
      )}
      {params.error && (
        <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {errors[params.error] ?? "Something went wrong."}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200">
        {classes.map((c) => (
          <Link
            key={c.id}
            href={`/teacher/scores?classId=${c.id}`}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium ${
              c.id === classId
                ? "border-b-2 border-[var(--brand)] text-[var(--brand)]"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {c.name}
          </Link>
        ))}
      </div>

      {currentClass && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-1">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">New test</h2>
              <NewTestForm classId={classId} />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-5 py-3">
                <h2 className="text-sm font-semibold text-slate-900">Tests</h2>
              </div>
              {tests.length === 0 ? (
                <p className="px-5 py-4 text-sm text-slate-400">No tests yet for this class.</p>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {tests.map((t) => (
                    <li key={t.id} className="flex items-center justify-between px-5 py-3">
                      <Link
                        href={`/teacher/scores?classId=${classId}&testId=${t.id}`}
                        className={`text-sm ${
                          currentTest?.id === t.id
                            ? "font-semibold text-[var(--brand)]"
                            : "text-slate-700 hover:text-slate-900"
                        }`}
                      >
                        {t.title}
                        <span className="ml-2 text-xs text-slate-400">
                          {formatDate(t.test_date)} · {t.total_max} pts
                        </span>
                      </Link>
                      <form action={deleteTest}>
                        <input type="hidden" name="id" value={t.id} />
                        <input type="hidden" name="classId" value={classId} />
                        <button type="submit" className="text-xs text-red-600 hover:underline">
                          Delete
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <div className="space-y-4 lg:col-span-2">
            {currentTest ? (
              <>
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-slate-900">{currentTest.title}</h2>
                      <p className="text-xs text-slate-400">
                        {formatDate(currentTest.test_date)} · {currentTest.total_max} pts total
                        {categories.some((c) => !c.counts_toward_total) && (
                          <>
                            {" "}
                            ·{" "}
                            {categories
                              .filter((c) => !c.counts_toward_total)
                              .map((c) => `${c.name} (${c.max_score})`)
                              .join(", ")}{" "}
                            not included in total
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 overflow-hidden rounded-xl border border-slate-100">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
                          <th className="px-3 py-2 font-medium">Category</th>
                          <th className="px-3 py-2 text-right font-medium">Max</th>
                          <th className="px-3 py-2 text-right font-medium">In total</th>
                          <th className="px-3 py-2 text-right font-medium">Retest if &lt;</th>
                          <th className="px-3 py-2 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {categories.map((cat) =>
                          editCategoryId === cat.id ? (
                            <tr key={cat.id} className="bg-slate-50">
                              <td colSpan={5} className="px-3 py-3">
                                <form
                                  action={updateCategory}
                                  className="flex flex-wrap items-end gap-2"
                                >
                                  <input type="hidden" name="id" value={cat.id} />
                                  <input type="hidden" name="testId" value={currentTest.id} />
                                  <input type="hidden" name="classId" value={classId} />
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">
                                      Name
                                    </label>
                                    <input
                                      name="name"
                                      required
                                      defaultValue={cat.name}
                                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">
                                      Max score
                                    </label>
                                    <input
                                      name="maxScore"
                                      type="number"
                                      min={1}
                                      required
                                      defaultValue={cat.max_score}
                                      className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-medium text-slate-600">
                                      Retest if &lt;
                                    </label>
                                    <input
                                      name="retestThreshold"
                                      type="number"
                                      min={0}
                                      defaultValue={cat.retest_threshold ?? ""}
                                      placeholder="—"
                                      className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                                    />
                                  </div>
                                  <label className="mb-2 flex items-center gap-1 text-xs text-slate-600">
                                    <input
                                      type="checkbox"
                                      name="countsTowardTotal"
                                      defaultChecked={!!cat.counts_toward_total}
                                      className="rounded border-slate-300"
                                    />
                                    In total
                                  </label>
                                  <button
                                    type="submit"
                                    className="rounded-lg bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-light)]"
                                  >
                                    Save
                                  </button>
                                  <Link
                                    href={`/teacher/scores?classId=${classId}&testId=${currentTest.id}`}
                                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 transition hover:bg-slate-100"
                                  >
                                    Cancel
                                  </Link>
                                </form>
                              </td>
                            </tr>
                          ) : (
                            <tr key={cat.id}>
                              <td className="px-3 py-2 font-medium text-slate-900">{cat.name}</td>
                              <td className="px-3 py-2 text-right text-slate-700">{cat.max_score}</td>
                              <td className="px-3 py-2 text-right text-slate-700">
                                {cat.counts_toward_total ? "Yes" : "No"}
                              </td>
                              <td className="px-3 py-2 text-right text-slate-700">
                                {cat.retest_threshold ?? "—"}
                              </td>
                              <td className="px-3 py-2 text-right">
                                <div className="flex justify-end gap-3">
                                  <Link
                                    href={`/teacher/scores?classId=${classId}&testId=${currentTest.id}&editCategory=${cat.id}`}
                                    className="text-xs text-[var(--brand)] hover:underline"
                                  >
                                    Edit
                                  </Link>
                                  <form action={deleteCategory}>
                                    <input type="hidden" name="id" value={cat.id} />
                                    <input type="hidden" name="testId" value={currentTest.id} />
                                    <input type="hidden" name="classId" value={classId} />
                                    <button
                                      type="submit"
                                      className="text-xs text-red-600 hover:underline"
                                    >
                                      Delete
                                    </button>
                                  </form>
                                </div>
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>

                  <AddCategoryForm testId={currentTest.id} classId={classId} />
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {students.length === 0 ? (
                    <p className="text-sm text-slate-400">No students registered in this class yet.</p>
                  ) : categories.length === 0 ? (
                    <p className="text-sm text-slate-400">Add a category above to start entering scores.</p>
                  ) : (
                    <form action={saveScores} className="space-y-4">
                      <input type="hidden" name="testId" value={currentTest.id} />
                      <input type="hidden" name="classId" value={classId} />
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-400">
                              <th className="py-2 pr-3 font-medium">Student</th>
                              {categories.map((cat) => (
                                <th key={cat.id} className="px-2 py-2 text-right font-medium">
                                  {cat.name}
                                  <span className="block font-normal normal-case text-slate-400">
                                    / {cat.max_score}
                                    {!cat.counts_toward_total && " (extra)"}
                                  </span>
                                </th>
                              ))}
                              <th className="px-2 py-2 text-right font-medium">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {students.map((s) => {
                              const studentTotal = categories
                                .filter((cat) => cat.counts_toward_total)
                                .reduce((sum, cat) => sum + (scoreMap.get(`${s.id}_${cat.id}`) ?? 0), 0);
                              return (
                                <tr key={s.id}>
                                  <td className="py-2 pr-3">
                                    <p className="font-medium text-slate-900">{s.name}</p>
                                    <p className="text-xs text-slate-400">@{s.username}</p>
                                  </td>
                                  {categories.map((cat) => (
                                    <td key={cat.id} className="px-2 py-2 text-right">
                                      <input
                                        name={`score_${s.id}_${cat.id}`}
                                        type="number"
                                        step="0.1"
                                        min={0}
                                        max={cat.max_score}
                                        defaultValue={scoreMap.get(`${s.id}_${cat.id}`) ?? ""}
                                        placeholder="—"
                                        className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-right text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
                                      />
                                    </td>
                                  ))}
                                  <td className="px-2 py-2 text-right font-medium text-slate-700">
                                    {studentTotal} / {currentTest.total_max}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                      <button
                        type="submit"
                        className="rounded-lg bg-[var(--brand)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-light)]"
                      >
                        Save scores
                      </button>
                    </form>
                  )}
                </section>
              </>
            ) : (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 p-10 text-sm text-slate-400">
                Create a test to start entering scores.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
