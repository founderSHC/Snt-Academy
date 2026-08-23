"use client";

import { useState } from "react";
import { addTest } from "@/lib/actions";

type Category = { name: string; max: string; retestThreshold: string; countsTowardTotal: boolean };

export default function NewTestForm({ classId }: { classId: number }) {
  const [categories, setCategories] = useState<Category[]>([
    { name: "", max: "", retestThreshold: "", countsTowardTotal: true },
  ]);

  const updateCategory = (i: number, field: keyof Category, value: string | boolean) => {
    setCategories((prev) => prev.map((c, idx) => (idx === i ? { ...c, [field]: value } : c)));
  };
  const addRow = () =>
    setCategories((prev) => [
      ...prev,
      { name: "", max: "", retestThreshold: "", countsTowardTotal: true },
    ]);
  const removeRow = (i: number) => setCategories((prev) => prev.filter((_, idx) => idx !== i));

  const total = categories
    .filter((c) => c.countsTowardTotal)
    .reduce((sum, c) => sum + (Number(c.max) || 0), 0);

  return (
    <form action={addTest} className="space-y-3">
      <input type="hidden" name="classId" value={classId} />
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Title</label>
        <input
          name="title"
          required
          placeholder="Week 5 Test"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Date</label>
        <input
          name="testDate"
          type="date"
          required
          defaultValue={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Categories</label>
        <div className="space-y-2">
          {categories.map((c, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                name="categoryName"
                required
                placeholder="Vocab"
                value={c.name}
                onChange={(e) => updateCategory(i, "name", e.target.value)}
                className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
              />
              <input
                name="categoryMax"
                type="number"
                min={1}
                required
                placeholder="30"
                value={c.max}
                onChange={(e) => updateCategory(i, "max", e.target.value)}
                className="w-16 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
              />
              <input
                name="categoryRetestThreshold"
                type="number"
                min={0}
                placeholder="Retest if <"
                title="Optional: score below this triggers a retest label"
                value={c.retestThreshold}
                onChange={(e) => updateCategory(i, "retestThreshold", e.target.value)}
                className="w-28 rounded-lg border border-slate-300 px-3 py-1.5 text-sm outline-none focus:border-[var(--brand)] focus:ring-1 focus:ring-[var(--brand)]"
              />
              <label className="flex items-center gap-1 text-xs text-slate-600" title="Uncheck for extra categories like Task Completion that shouldn't add into the test total">
                <input
                  type="checkbox"
                  checked={c.countsTowardTotal}
                  onChange={(e) => updateCategory(i, "countsTowardTotal", e.target.checked)}
                  className="rounded border-slate-300"
                />
                In total
              </label>
              <input type="hidden" name="categoryCountsTowardTotal" value={String(c.countsTowardTotal)} />
              {categories.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          &ldquo;Retest if &lt;&rdquo; is optional. Uncheck &ldquo;In total&rdquo; for standalone categories
          (e.g. Task Completion) that shouldn&apos;t be added into the test total.
        </p>
        <button
          type="button"
          onClick={addRow}
          className="mt-2 text-xs font-medium text-[var(--brand)] hover:underline"
        >
          + Add category
        </button>
      </div>

      <p className="text-xs text-slate-500">Test total (categories marked &ldquo;In total&rdquo;): {total} pts</p>

      <button
        type="submit"
        className="w-full rounded-lg bg-[var(--brand)] px-3 py-2 text-sm font-semibold text-white transition hover:bg-[var(--brand-light)]"
      >
        Create test
      </button>
    </form>
  );
}
