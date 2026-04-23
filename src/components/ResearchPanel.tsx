"use client";

import { ResearchResult } from "@/lib/types";
import { MetricsBar } from "./MetricsBar";

export function ResearchPanel({ research }: { research: ResearchResult }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          Industry Benchmarks
        </h3>
        <MetricsBar metrics={research.metrics} />
      </div>

      <p className="text-sm leading-relaxed text-slate-600">
        {research.summary}
      </p>

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">
                Metric
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">
                Benchmark Value
              </th>
              <th className="px-4 py-2.5 text-left font-medium text-slate-500">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {research.benchmarks.map((b, i) => (
              <tr key={i} className="transition-colors hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium text-slate-700">
                  {b.metric}
                </td>
                <td className="px-4 py-2.5 tabular-nums text-slate-600">
                  {b.value}
                </td>
                <td className="px-4 py-2.5">
                  {b.url ? (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 underline decoration-blue-200 underline-offset-2 transition-colors hover:text-blue-700"
                    >
                      {b.source}
                    </a>
                  ) : (
                    <span className="text-slate-400">{b.source}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {research.adjustments.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold text-slate-700">
            Suggested Adjustments
          </h4>
          <ul className="space-y-1.5">
            {research.adjustments.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                <span className="mt-1 inline-block h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
