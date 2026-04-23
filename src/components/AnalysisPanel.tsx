"use client";

import { AnalysisResult } from "@/lib/types";
import { MetricsBar } from "./MetricsBar";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";

export function AnalysisPanel({ analysis }: { analysis: AnalysisResult }) {
  return (
    <CollapsiblePanel
      title="Model Analysis"
      headerRight={<MetricsBar metrics={analysis.metrics} />}
      contentClassName="space-y-5 p-6 pt-0"
    >
      <p className="text-sm leading-loose text-[#aaa]">
        {analysis.summary}
      </p>

      <div className="grid grid-cols-3 gap-8 border-t border-[#1e1e1e] pt-5">
        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-white uppercase">
            <span className="inline-block h-px w-4 bg-white" />
            Strengths
          </h4>
          <ul className="space-y-2.5">
            {analysis.strengths.map((s, i) => (
              <li key={i} className="text-sm leading-relaxed text-[#b0b0b0]">
                {s}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-[#bbb] uppercase">
            <span className="inline-block h-px w-4 bg-[#777]" />
            Risks
          </h4>
          <ul className="space-y-2.5">
            {analysis.risks.map((r, i) => (
              <li key={i} className="text-sm leading-relaxed text-[#b0b0b0]">
                {r}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-3">
          <h4 className="flex items-center gap-2 text-xs font-semibold tracking-widest text-[#999] uppercase">
            <span className="inline-block h-px w-4 bg-[#555]" />
            Suggestions
          </h4>
          <ul className="space-y-2.5">
            {analysis.suggestions.map((s, i) => (
              <li key={i} className="text-sm leading-relaxed text-[#b0b0b0]">
                {s}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </CollapsiblePanel>
  );
}
