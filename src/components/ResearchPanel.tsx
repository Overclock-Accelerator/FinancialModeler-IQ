"use client";

import { ResearchResult } from "@/lib/types";
import { MetricsBar } from "./MetricsBar";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";

export function ResearchPanel({ research }: { research: ResearchResult }) {
  return (
    <CollapsiblePanel
      title="Industry Benchmarks"
      headerRight={<MetricsBar metrics={research.metrics} />}
      contentClassName="space-y-5 p-6 pt-0"
    >
      <p className="text-sm leading-loose text-[#aaa]">
        {research.summary}
      </p>

      <div className="overflow-hidden border border-[#222]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#222] bg-[#0d0d0d]">
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest text-[#666] uppercase">
                Metric
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest text-[#666] uppercase">
                Benchmark Value
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold tracking-widest text-[#666] uppercase">
                Source
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1a1a1a]">
            {research.benchmarks.map((b, i) => (
              <tr key={i} className="transition-colors hover:bg-[#161616]">
                <td className="px-4 py-3 text-sm font-medium text-[#ddd]">
                  {b.metric}
                </td>
                <td className="px-4 py-3 text-sm tabular-nums text-[#aaa]">
                  {b.value}
                </td>
                <td className="px-4 py-3">
                  {b.url ? (
                    <a
                      href={b.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#888] underline decoration-[#444] underline-offset-2 transition-colors hover:text-white"
                    >
                      {b.source}
                    </a>
                  ) : (
                    <span className="text-sm text-[#666]">{b.source}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {research.adjustments.length > 0 && (
        <div>
          <h4 className="mb-3 text-xs font-semibold tracking-widest text-[#666] uppercase">
            Suggested Adjustments
          </h4>
          <ul className="space-y-2.5">
            {research.adjustments.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm leading-relaxed text-[#b0b0b0]">
                <span className="mt-2 inline-block h-px w-3 flex-shrink-0 bg-[#444]" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </CollapsiblePanel>
  );
}
