"use client";

import { Driver, DriverCategory, DriverUnit } from "@/lib/types";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";

interface DriversPanelProps {
  drivers: Driver[];
  periods: string[];
  values: Record<string, number[]>;
  onChange: (driverId: string, periodIndex: number, value: number) => void;
  onReset: () => void;
  dirty: boolean;
}

const CATEGORY_ORDER: DriverCategory[] = [
  "Volume",
  "Pricing",
  "Unit Costs",
  "Fixed Costs",
  "Growth",
  "Other",
];

const CATEGORY_ACCENT: Record<DriverCategory, string> = {
  Volume: "border-l-2 border-white text-white",
  Pricing: "border-l-2 border-[#aaa] text-[#bbb]",
  "Unit Costs": "border-l-2 border-[#888] text-[#999]",
  "Fixed Costs": "border-l-2 border-[#666] text-[#888]",
  Growth: "border-l-2 border-[#555] text-[#777]",
  Other: "border-l-2 border-[#333] text-[#666]",
};

function parseInput(raw: string, unit: DriverUnit): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  return unit === "percent" ? n / 100 : n;
}

function toInputValue(value: number, unit: DriverUnit): string {
  if (!Number.isFinite(value)) return "0";
  if (unit === "percent") return (value * 100).toFixed(2);
  if (unit === "currency" && Math.abs(value) >= 1000) return value.toFixed(0);
  return String(value);
}

function sliderBounds(d: Driver): { min: number; max: number; step: number } {
  const baseline = d.values[0] ?? 0;
  const min = d.min ?? Math.min(0, baseline * 0.4);
  const max = d.max ?? Math.max(baseline * 2, baseline + 1);
  const step =
    d.step ??
    (d.unit === "percent"
      ? 0.005
      : d.unit === "count"
      ? 1
      : Math.max(0.01, Math.abs(baseline) / 100));
  return { min, max, step };
}

export function DriversPanel({
  drivers,
  periods,
  values,
  onChange,
  onReset,
  dirty,
}: DriversPanelProps) {
  const grouped = new Map<DriverCategory, Driver[]>();
  for (const d of drivers) {
    const list = grouped.get(d.category) ?? [];
    list.push(d);
    grouped.set(d.category, list);
  }

  return (
    <CollapsiblePanel
      title="Tunable Drivers"
      subtitle="Adjust any input — the P&L and unit economics recompute instantly."
      headerRight={
        <button
          type="button"
          onClick={onReset}
          disabled={!dirty}
          className="border border-[#333] px-3 py-1.5 text-xs font-medium tracking-widest text-[#888] uppercase transition-colors hover:border-[#555] hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
        >
          Reset to baseline
        </button>
      }
      contentClassName="divide-y divide-[#1a1a1a]"
    >
        {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((cat) => (
          <div key={cat} className="px-6 py-5">
            <div className="mb-4 flex items-center gap-3">
              <span
                className={`inline-block pl-2 text-xs font-medium tracking-widest uppercase ${CATEGORY_ACCENT[cat]}`}
              >
                {cat}
              </span>
              <span className="text-xs text-[#444]">
                {grouped.get(cat)?.length} driver
                {(grouped.get(cat)?.length ?? 0) === 1 ? "" : "s"}
              </span>
            </div>

            <div className="space-y-4">
              {grouped.get(cat)?.map((d) => {
                const bounds = sliderBounds(d);
                const current = values[d.id] ?? d.values;
                return (
                  <div
                    key={d.id}
                    className="grid grid-cols-12 gap-4 border border-[#1e1e1e] bg-[#0d0d0d] p-4"
                  >
                    <div className="col-span-12 md:col-span-4">
                      <div className="text-sm font-medium text-[#ddd]">
                        {d.label}
                      </div>
                      <div className="mt-1 text-xs leading-relaxed text-[#666]">
                        {d.notes ?? (
                          <span>
                            {d.unit === "percent"
                              ? "Percent (stored as decimal)"
                              : d.unit === "currency"
                              ? "USD"
                              : d.unit}
                          </span>
                        )}
                      </div>
                      <code className="mt-1.5 inline-block border border-[#2a2a2a] bg-[#080808] px-1.5 py-0.5 text-[10px] font-mono text-[#555]">
                        {d.id}
                      </code>
                    </div>

                    <div className="col-span-12 grid grid-cols-3 gap-4 md:col-span-8">
                      {periods.map((period, pIdx) => {
                        const raw = current[pIdx] ?? 0;
                        return (
                          <div key={pIdx} className="space-y-1.5">
                            <label className="flex items-center justify-between">
                              <span className="text-xs tracking-widest text-[#555] uppercase">{period}</span>
                              <span className="font-mono text-xs text-[#aaa]">
                                {d.unit === "percent"
                                  ? `${(raw * 100).toFixed(1)}%`
                                  : d.unit === "currency"
                                  ? `$${raw.toLocaleString(undefined, {
                                      maximumFractionDigits: 0,
                                    })}`
                                  : raw.toLocaleString(undefined, {
                                      maximumFractionDigits: 2,
                                    })}
                              </span>
                            </label>
                            <input
                              type="range"
                              min={bounds.min}
                              max={bounds.max}
                              step={bounds.step}
                              value={raw}
                              onChange={(e) =>
                                onChange(d.id, pIdx, Number(e.target.value))
                              }
                              className="w-full accent-white"
                            />
                            <input
                              type="number"
                              value={toInputValue(raw, d.unit)}
                              step={d.unit === "percent" ? 0.1 : bounds.step}
                              onChange={(e) =>
                                onChange(
                                  d.id,
                                  pIdx,
                                  parseInput(e.target.value, d.unit)
                                )
                              }
                              className="w-full border border-[#2a2a2a] bg-[#080808] px-2 py-1 text-sm tabular-nums text-[#ccc] focus:border-[#555] focus:outline-none"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
    </CollapsiblePanel>
  );
}
