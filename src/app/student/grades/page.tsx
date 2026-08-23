import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";
import { formatDate } from "@/lib/utils";

type Row = {
  test_id: number;
  title: string;
  test_date: string;
  category_id: number;
  category_name: string;
  max_score: number;
  retest_threshold: number | null;
  counts_toward_total: number;
  score: number | null;
};

type TestGrade = {
  test_id: number;
  title: string;
  test_date: string;
  categories: {
    name: string;
    max_score: number;
    score: number | null;
    retestThreshold: number | null;
    countsTowardTotal: boolean;
  }[];
  totalScore: number;
  totalMax: number;
  hasAnyScore: boolean;
};

export default async function GradesPage() {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/login");

  const rows = db
    .prepare(
      `SELECT t.id as test_id, t.title, t.test_date,
              tc.id as category_id, tc.name as category_name, tc.max_score, tc.retest_threshold,
              tc.counts_toward_total,
              sc.score
       FROM tests t
       JOIN test_categories tc ON tc.test_id = t.id
       LEFT JOIN scores sc ON sc.test_category_id = tc.id AND sc.student_id = ?
       WHERE t.class_id = ?
       ORDER BY t.test_date DESC, t.id DESC, tc.sort_order, tc.id`
    )
    .all(session.id, session.classId) as Row[];

  const testsById = new Map<number, TestGrade>();
  for (const r of rows) {
    let test = testsById.get(r.test_id);
    if (!test) {
      test = {
        test_id: r.test_id,
        title: r.title,
        test_date: r.test_date,
        categories: [],
        totalScore: 0,
        totalMax: 0,
        hasAnyScore: false,
      };
      testsById.set(r.test_id, test);
    }
    test.categories.push({
      name: r.category_name,
      max_score: r.max_score,
      score: r.score,
      retestThreshold: r.retest_threshold,
      countsTowardTotal: !!r.counts_toward_total,
    });
    if (r.score !== null && r.counts_toward_total) {
      test.totalScore += r.score;
      test.totalMax += r.max_score;
      test.hasAnyScore = true;
    }
  }
  // A test is only shown once the teacher has entered at least one score for
  // this student; an untouched category means they were absent that week.
  const grades = Array.from(testsById.values())
    .map((g) => ({ ...g, categories: g.categories.filter((c) => c.score !== null) }))
    .filter((g) => g.categories.length > 0);
  const graded = grades.filter((g) => g.hasAnyScore);
  const average =
    graded.length > 0
      ? graded.reduce((sum, g) => sum + (g.totalScore / g.totalMax) * 100, 0) / graded.length
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Individual Grade</h1>
        <p className="mt-1 text-sm text-slate-500">Your test results in {session.className}.</p>
      </div>

      {average !== null && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Overall average</p>
          <p className="mt-1 text-3xl font-semibold text-slate-900">{average.toFixed(1)}%</p>
        </div>
      )}

      {grades.length === 0 ? (
        <p className="text-sm text-slate-400">No graded results yet.</p>
      ) : (
        <div className="space-y-4">
          {grades.map((g) => (
            <div key={g.test_id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
                <div>
                  <p className="font-medium text-slate-900">{g.title}</p>
                  <p className="text-xs text-slate-400">{formatDate(g.test_date)}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-900">
                    {g.hasAnyScore ? `${g.totalScore} / ${g.totalMax}` : "—"}
                  </p>
                  {g.hasAnyScore && (
                    <p className="text-xs text-slate-400">
                      {((g.totalScore / g.totalMax) * 100).toFixed(1)}%
                    </p>
                  )}
                </div>
              </div>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {g.categories.map((c, i) => {
                    const showsRetest = c.retestThreshold !== null && c.score !== null;
                    const needsRetest = showsRetest && c.score! < c.retestThreshold!;
                    return (
                      <tr key={i}>
                        <td className="px-5 py-2 text-slate-600">
                          {c.name}
                          {!c.countsTowardTotal && (
                            <span className="ml-2 text-xs text-slate-400">(not in total)</span>
                          )}
                        </td>
                        <td className="px-5 py-2 text-right">
                          <span className="text-slate-700">
                            {c.score !== null ? `${c.score} / ${c.max_score}` : "— / " + c.max_score}
                          </span>
                          {showsRetest && (
                            <span
                              className={`ml-2 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                                needsRetest ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                              }`}
                            >
                              {needsRetest ? "Retest" : "Pass"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
