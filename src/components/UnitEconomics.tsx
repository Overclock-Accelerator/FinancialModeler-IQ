"use client";

import { ComputedLineItem } from "@/lib/types";
import { formatValue } from "@/lib/compute";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";

interface UnitEconomicsProps {
  items: ComputedLineItem[];
  periods: string[];
}

export function UnitEconomics({ items, periods }: UnitEconomicsProps) {
  if (items.length === 0) return null;

  return (
    <CollapsiblePanel
      title="Unit Economics"
      subtitle="Per-unit profitability — the engine underneath the P&L."
      contentClassName="p-6 pt-0"
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const unit = item.unit ?? "currency";
          const baseline = item.values[0] ?? 0;
          const final = item.values[item.values.length - 1] ?? 0;
          const delta = final - baseline;
          const pct =
            baseline !== 0 ? (delta / Math.abs(baseline)) * 100 : null;
          return (
            <div
              key={item.id}
              className="border border-[#1e1e1e] bg-[#0d0d0d] p-4"
            >
              <div className="text-xs font-semibold tracking-widest text-[#666] uppercase">
                {item.label}
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span
                  className="text-3xl font-light tabular-nums text-white"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {formatValue(baseline, unit)}
                </span>
                <span className="text-xs text-[#555]">{periods[0]}</span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {item.values.map((v, i) => (
                  <div
                    key={i}
                    className="border border-[#1a1a1a] bg-[#080808] px-2 py-1.5"
                  >
                    <div className="text-[10px] tracking-widest text-[#444] uppercase">
                      {periods[i]}
                    </div>
                    <div className="mt-0.5 font-mono text-sm text-[#bbb] tabular-nums">
                      {formatValue(v, unit)}
                    </div>
                  </div>
                ))}
              </div>

              {pct !== null && (
                <div className="mt-3 text-xs">
                  <span className="text-[#555]">Y1 → Y{item.values.length}:</span>{" "}
                  <span
                    className={`font-medium tabular-nums ${
                      delta >= 0 ? "text-[#aaa]" : "text-[#ff7070]"
                    }`}
                  >
                    {delta >= 0 ? "+" : ""}
                    {pct.toFixed(1)}%
                  </span>
                </div>
              )}

              {item.notes && (
                <div className="mt-2 text-xs leading-relaxed text-[#555]">
                  {item.notes}
                </div>
              )}
              <code className="mt-2 block truncate border border-[#1a1a1a] bg-[#080808] px-1.5 py-1 text-[10px] font-mono text-[#444]">
                {item.formula}
              </code>
            </div>
          );
        })}
      </div>
    </CollapsiblePanel>
  );
}
