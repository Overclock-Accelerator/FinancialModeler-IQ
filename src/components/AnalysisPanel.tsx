"use client";

import { AnalysisResult } from "@/lib/types";
import { MetricsBar } from "./MetricsBar";

export function AnalysisPanel({ analysis }: { analysis: AnalysisResult }) {
  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">
          Model Analysis
        </h3>
        <MetricsBar metrics={analysis.metrics} />
      </div>

      <p className="text-sm leading-relaxed text-slate-600">
        {analysis.summary}
      </p>

      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-emerald-600">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
            Strengths
          </h4>
          <ul className="space-y-1.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="text-sm text-slate-600">
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-amber-600">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
            Risks
          </h4>
          <ul className="space-y-1.5">
            {analysis.risks.map((r, i) => (
              <li key={i} className="text-sm text-slate-600">
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <h4 className="flex items-center gap-2 text-sm font-semibold text-blue-600">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
            Suggestions
          </h4>
          <ul className="space-y-1.5">
            {analysis.suggestions.map((s, i) => (
              <li key={i} className="text-sm text-slate-600">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
