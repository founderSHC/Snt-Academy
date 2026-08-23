import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import db from "@/lib/db";
import { formatDate, ordinal } from "@/lib/utils";

type TestRow = { id: number; title: string; test_date: string; total_max: number };
type ScoreRow = {
  category_id: number;
  category_name: string;
  max_score: number;
  counts_toward_total: number;
  student_id: number;
  score: number;
};

type Stat = {
  label: string;
  maxScore: number;
  myScore: number | null;
  rank: number | null;
  participants: number;
  highest: number;
  average: number;
  countsTowardTotal: boolean;
};

function buildStat(
  label: string,
  maxScore: number,
  scores: number[],
  mine: number | undefined,
  countsTowardTotal = true
): Stat {
  const participants = scores.length;
  const highest = participants > 0 ? Math.max(...scores) : 0;
  const average = participants > 0 ? scores.reduce((a, b) => a + b, 0) / participants : 0;
  const rank = mine !== undefined ? 1 + scores.filter((s) => s > mine).length : null;
  return {
    label,
    maxScore,
    myScore: mine ?? null,
    rank,
    participants,
    highest,
    average,
    countsTowardTotal,
  };
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ testId?: string }>;
}) {
  const session = await getSession();
  if (!session || session.role !== "student") redirect("/login");

  const classRow = db
    .prepare("SELECT show_rank FROM classes WHERE id = ?")
    .get(session.classId) as { show_rank: number } | undefined;
  const showRank = !!classRow?.show_rank;

  const { testId: testIdParam } = await searchParams;

  // Only list tests where this student actually has a score — an untouched
  // test means they were absent that week, so it shouldn't appear at all.
  const tests = db
    .prepare(
      `SELECT t.id, t.title, t.test_date,
              COALESCE(SUM(CASE WHEN tc.counts_toward_total = 1 THEN tc.max_score ELSE 0 END), 0) as total_max
       FROM tests t
       JOIN test_categories tc ON tc.test_id = t.id
       WHERE t.class_id = ? AND t.id IN (
         SELECT tc2.test_id FROM scores sc2 JOIN test_categories tc2 ON tc2.id = sc2.test_category_id
         WHERE sc2.student_id = ?
       )
       GROUP BY t.id
       ORDER BY t.test_date DESC, t.id DESC`
    )
    .all(session.classId, session.id) as TestRow[];

  const testId = Number(testIdParam) || tests[0]?.id || null;
  const currentTest = testId ? tests.find((t) => t.id === testId) : null;

  let stats: Stat[] = [];
  if (currentTest) {
    const rows = db
      .prepare(
        `SELECT tc.id as category_id, tc.name as category_name, tc.max_score, tc.counts_toward_total,
                sc.student_id, sc.score
         FROM test_categories tc
         JOIN scores sc ON sc.test_category_id = tc.id
         WHERE tc.test_id = ?
         ORDER BY tc.sort_order, tc.id`
      )
      .all(currentTest.id) as ScoreRow[];

    const categoryOrder: number[] = [];
    const categoryInfo = new Map<
      number,
      { name: string; maxScore: number; countsTowardTotal: boolean; scores: number[]; mine?: number }
    >();
    const totalByStudent = new Map<number, number>();

    for (const r of rows) {
      if (!categoryInfo.has(r.category_id)) {
        categoryOrder.push(r.category_id);
        categoryInfo.set(r.category_id, {
          name: r.category_name,
          maxScore: r.max_score,
          countsTowardTotal: !!r.counts_toward_total,
          scores: [],
        });
      }
      const info = categoryInfo.get(r.category_id)!;
      info.scores.push(r.score);
      if (r.student_id === session.id) info.mine = r.score;

      if (r.counts_toward_total) {
        totalByStudent.set(r.student_id, (totalByStudent.get(r.student_id) ?? 0) + r.score);
      }
    }

    const totalScores = Array.from(totalByStudent.values());
    const myTotal = totalByStudent.get(session.id);

    stats = [
      buildStat("Total", currentTest.total_max, totalScores, myTotal),
      ...categoryOrder.map((catId) => {
        const info = categoryInfo.get(catId)!;
        return buildStat(info.name, info.maxScore, info.scores, info.mine, info.countsTowardTotal);
      }),
    ];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Ranking</h1>
        <p className="mt-1 text-sm text-slate-500">
          {showRank
            ? "Your rank and class stats"
            : "Your class stats"}{" "}
          in {session.className}. Other students&apos; individual scores aren&apos;t shown.
        </p>
      </div>

      {tests.length === 0 ? (
        <p className="text-sm text-slate-400">No ranked tests yet.</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {tests.map((t) => (
              <Link
                key={t.id}
                href={`/student/ranking?testId=${t.id}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                  currentTest?.id === t.id
                    ? "border-[var(--brand)] bg-[var(--brand)] text-white"
                    : "border-slate-300 text-slate-600 hover:bg-slate-100"
                }`}
              >
                {t.title}
              </Link>
            ))}
          </div>

          {currentTest && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">{formatDate(currentTest.test_date)}</p>
              {stats.map((s) => (
                <div
                  key={s.label}
                  className={`rounded-2xl border p-5 shadow-sm ${
                    s.label === "Total" ? "border-[var(--brand)] bg-blue-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                      {s.label}
                      {!s.countsTowardTotal && (
                        <span className="ml-2 text-xs font-normal text-slate-400">(not in total)</span>
                      )}
                    </h2>
                    {showRank && s.rank !== null && s.participants > 0 && (
                      <span className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-[var(--brand)] shadow-sm">
                        {ordinal(s.rank)} of {s.participants}
                      </span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-xs text-slate-500">Your score</p>
                      <p className="mt-0.5 text-lg font-semibold text-slate-900">
                        {s.myScore !== null ? `${s.myScore} / ${s.maxScore}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Highest</p>
                      <p className="mt-0.5 text-lg font-semibold text-slate-900">
                        {s.participants > 0 ? `${s.highest} / ${s.maxScore}` : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Average</p>
                      <p className="mt-0.5 text-lg font-semibold text-slate-900">
                        {s.participants > 0 ? `${s.average.toFixed(1)} / ${s.maxScore}` : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
