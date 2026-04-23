"use client";

import { FinancialModel } from "@/lib/types";

const CATEGORY_COLORS: Record<string, string> = {
  Revenue: "bg-emerald-50 text-emerald-700",
  COGS: "bg-amber-50 text-amber-700",
  "Operating Expenses": "bg-rose-50 text-rose-700",
  "Other Income/Expenses": "bg-purple-50 text-purple-700",
  Taxes: "bg-slate-100 text-slate-600",
  Summary: "bg-blue-50 text-blue-700 font-semibold",
};

function formatCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

export function ModelTable({ model }: { model: FinancialModel }) {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-800">{model.title}</h3>
        <p className="mt-1 text-sm text-slate-500">{model.description}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-6 py-3 text-left font-medium text-slate-500">
                Category
              </th>
              <th className="px-6 py-3 text-left font-medium text-slate-500">
                Item
              </th>
              <th className="px-6 py-3 text-right font-medium text-slate-500">
                Year 1
              </th>
              <th className="px-6 py-3 text-right font-medium text-slate-500">
                Year 2
              </th>
              <th className="px-6 py-3 text-right font-medium text-slate-500">
                Year 3
              </th>
              <th className="px-6 py-3 text-left font-medium text-slate-500">
                Notes
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {model.rows.map((row, i) => {
              const colorClass =
                CATEGORY_COLORS[row.category] || "bg-white text-slate-700";
              const isSummary = row.category === "Summary";
              return (
                <tr
                  key={i}
                  className={`${isSummary ? "border-t-2 border-slate-300" : ""} transition-colors hover:bg-slate-50`}
                >
                  <td className="px-6 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${colorClass}`}
                    >
                      {row.category}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-2.5 text-slate-700 ${isSummary ? "font-semibold" : ""}`}
                  >
                    {row.item}
                  </td>
                  <td
                    className={`px-6 py-2.5 text-right tabular-nums ${isSummary ? "font-semibold text-slate-800" : "text-slate-600"}`}
                  >
                    {formatCurrency(row.year1)}
                  </td>
                  <td
                    className={`px-6 py-2.5 text-right tabular-nums ${isSummary ? "font-semibold text-slate-800" : "text-slate-600"}`}
                  >
                    {formatCurrency(row.year2)}
                  </td>
                  <td
                    className={`px-6 py-2.5 text-right tabular-nums ${isSummary ? "font-semibold text-slate-800" : "text-slate-600"}`}
                  >
                    {formatCurrency(row.year3)}
                  </td>
                  <td className="px-6 py-2.5 text-xs text-slate-400">
                    {row.notes}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {model.assumptions.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Key Assumptions
          </h4>
          <ul className="grid grid-cols-2 gap-x-8 gap-y-1">
            {model.assumptions.map((a, i) => (
              <li key={i} className="text-sm text-slate-600">
                <span className="mr-2 text-slate-300">&bull;</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
