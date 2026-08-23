import { addCategory } from "@/lib/actions";

export default function AddCategoryForm({ testId, classId }: { testId: number; classId: number }) {
  return (
    <form action={addCategory} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="testId" value={testId} />
      <input type="hidden" name="classId" value={classId} />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Category name</label>
        <input
          name="name"
          required
          placeholder="Task Completion"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Max score</label>
        <input
          name="maxScore"
          type="number"
          min={1}
          required
          placeholder="100"
          className="w-24 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Retest if &lt; (optional)</label>
        <input
          name="retestThreshold"
          type="number"
          min={0}
          placeholder="—"
          className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
        />
      </div>
      <label
        className="mb-2 flex items-center gap-1 text-xs text-slate-600"
        title="Uncheck for extra categories like Task Completion that shouldn't add into the test total"
      >
        <input type="checkbox" name="countsTowardTotal" defaultChecked className="rounded border-slate-300" />
        In total
      </label>
      <button
        type="submit"
        className="rounded-lg border border-[var(--brand)] px-3 py-1.5 text-sm font-medium text-[var(--brand)] transition hover:bg-blue-50"
      >
        + Add category
      </button>
    </form>
  );
}
