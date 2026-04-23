"use client";

import { useMemo, useState } from "react";
import {
  ComputedLineItem,
  FinancialModel,
  LineItemCategory,
} from "@/lib/types";
import { formatValue } from "@/lib/compute";
import { CollapsiblePanel } from "@/components/CollapsiblePanel";

interface ModelTableProps {
  model: FinancialModel;
  lineItems: ComputedLineItem[];
}

interface Section {
  key: string;
  label: string;
  kind: "group" | "subtotal";
  categories: LineItemCategory[];
  items: ComputedLineItem[];
}

/**
 * A real income statement has a fixed reading order:
 *   Revenue
 *   Cost of Goods Sold
 *   (Gross Profit subtotal)
 *   Operating Expenses
 *   (EBITDA / Operating Income subtotal)
 *   Other Income/Expenses
 *   (Net Income subtotal)
 *
 * Summary line items from the LLM land between groups as subtotal bars. Heuristics
 * on the id/label route them to the correct slot; anything we don't recognize
 * falls to a generic "Subtotals" tail so it's never dropped.
 */
function buildSections(lineItems: ComputedLineItem[]): Section[] {
  const pnlOrder: LineItemCategory[] = ["Revenue", "COGS", "OpEx", "Other"];
  const byCat = new Map<LineItemCategory, ComputedLineItem[]>();
  for (const li of lineItems) {
    if (li.category === "UnitEconomics") continue;
    const arr = byCat.get(li.category) ?? [];
    arr.push(li);
    byCat.set(li.category, arr);
  }

  const summaries = byCat.get("Summary") ?? [];
  const placed = new Set<ComputedLineItem>();

  const grossProfit = findSummary(summaries, [
    "gross_profit",
    "gross profit",
    "gross_margin_dollars",
  ]);
  const opIncome = findSummary(summaries, [
    "operating_income",
    "operating income",
    "ebitda",
    "ebit",
  ]);
  const netIncome = findSummary(summaries, [
    "net_income",
    "net income",
    "net_profit",
    "profit",
  ]);

  if (grossProfit) placed.add(grossProfit);
  if (opIncome) placed.add(opIncome);
  if (netIncome) placed.add(netIncome);

  const sections: Section[] = [];

  const revenue = byCat.get("Revenue") ?? [];
  if (revenue.length) {
    sections.push({
      key: "revenue",
      label: "Revenue",
      kind: "group",
      categories: ["Revenue"],
      items: revenue,
    });
  }

  const cogs = byCat.get("COGS") ?? [];
  if (cogs.length) {
    sections.push({
      key: "cogs",
      label: "Cost of Goods Sold",
      kind: "group",
      categories: ["COGS"],
      items: cogs,
    });
  }

  if (grossProfit) {
    sections.push({
      key: "gross_profit",
      label: grossProfit.label,
      kind: "subtotal",
      categories: ["Summary"],
      items: [grossProfit],
    });
  }

  const opex = byCat.get("OpEx") ?? [];
  if (opex.length) {
    sections.push({
      key: "opex",
      label: "Operating Expenses",
      kind: "group",
      categories: ["OpEx"],
      items: opex,
    });
  }

  if (opIncome) {
    sections.push({
      key: "op_income",
      label: opIncome.label,
      kind: "subtotal",
      categories: ["Summary"],
      items: [opIncome],
    });
  }

  const other = byCat.get("Other") ?? [];
  if (other.length) {
    sections.push({
      key: "other",
      label: "Other Income / Expenses",
      kind: "group",
      categories: ["Other"],
      items: other,
    });
  }

  const leftoverSummaries = summaries.filter(
    (s) => !placed.has(s) && s !== netIncome
  );
  for (const s of leftoverSummaries) {
    sections.push({
      key: s.id,
      label: s.label,
      kind: "subtotal",
      categories: ["Summary"],
      items: [s],
    });
  }

  if (netIncome) {
    sections.push({
      key: "net_income",
      label: netIncome.label,
      kind: "subtotal",
      categories: ["Summary"],
      items: [netIncome],
    });
  }

  // Push PnL categories we haven't consumed (rare — e.g. LLM used a custom category)
  for (const cat of pnlOrder) {
    if (!byCat.get(cat)?.length) continue;
    if (sections.some((s) => s.categories.includes(cat))) continue;
    sections.push({
      key: `extra_${cat}`,
      label: cat,
      kind: "group",
      categories: [cat],
      items: byCat.get(cat) ?? [],
    });
  }

  return sections;
}

function findSummary(
  summaries: ComputedLineItem[],
  needles: string[]
): ComputedLineItem | undefined {
  for (const n of needles) {
    const low = n.toLowerCase();
    const hit = summaries.find(
      (s) =>
        s.id.toLowerCase() === low ||
        s.id.toLowerCase().includes(low.replace(/\s+/g, "_")) ||
        s.label.toLowerCase() === low ||
        s.label.toLowerCase().includes(low)
    );
    if (hit) return hit;
  }
  return undefined;
}

function formatAccounting(value: number, unit: ComputedLineItem["unit"]): string {
  const u = unit ?? "currency";
  if (!Number.isFinite(value)) return "—";
  if (u !== "currency" && u !== undefined) return formatValue(value, u);
  if (value < 0) return `(${formatValue(Math.abs(value), "currency").replace(/^-/, "")})`;
  return formatValue(value, "currency");
}

export function ModelTable({ model, lineItems }: ModelTableProps) {
  const [showPctRevenue, setShowPctRevenue] = useState(false);

  const sections = useMemo(() => buildSections(lineItems), [lineItems]);

  const revenueTotals = useMemo(() => {
    const revSection = sections.find((s) => s.key === "revenue");
    if (!revSection) return null;
    const totals = model.periods.map((_, p) =>
      revSection.items.reduce((sum, li) => sum + (li.values[p] ?? 0), 0)
    );
    return totals;
  }, [sections, model.periods]);

  const periodCount = model.periods.length;

  return (
    <CollapsiblePanel
      title={model.title}
      subtitle={model.description}
      headerRight={
        <label className="flex cursor-pointer items-center gap-2 text-xs text-[#666]">
          <input
            type="checkbox"
            checked={showPctRevenue}
            onChange={(e) => setShowPctRevenue(e.target.checked)}
            className="h-3.5 w-3.5 border-[#333] bg-[#080808] accent-white"
          />
          Show % of revenue
        </label>
      }
      contentClassName="overflow-hidden"
    >
      <p className="border-b border-[#1a1a1a] bg-[#111] px-6 py-2 text-xs uppercase tracking-widest text-[#555]">
        Income Statement &middot; {model.periods.length}-Year Projection &middot; USD
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <colgroup>
            <col className="w-[40%]" />
            {model.periods.map((p) => (
              <col key={p} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-[#222] bg-[#0d0d0d]">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-widest text-[#555]">
                Line Item
              </th>
              {model.periods.map((p) => (
                <th
                  key={p}
                  className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-widest text-[#555]"
                >
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sections.map((section) => (
              <SectionBlock
                key={section.key}
                section={section}
                periodCount={periodCount}
                revenueTotals={revenueTotals}
                showPctRevenue={showPctRevenue}
              />
            ))}
          </tbody>
        </table>
      </div>

      {model.assumptions.length > 0 && (
        <div className="border-t border-[#222] bg-[#0d0d0d] px-6 py-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#666]">
            Key Assumptions
          </h4>
          <ul className="grid gap-y-1 md:grid-cols-2 md:gap-x-8">
            {model.assumptions.map((a, i) => (
              <li key={i} className="text-sm text-[#777]">
                <span className="mr-2 text-[#555]">&bull;</span>
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </CollapsiblePanel>
  );
}

function SectionBlock({
  section,
  periodCount,
  revenueTotals,
  showPctRevenue,
}: {
  section: Section;
  periodCount: number;
  revenueTotals: number[] | null;
  showPctRevenue: boolean;
}) {
  if (section.kind === "subtotal") {
    const li = section.items[0];
    return (
      <tr className="border-t-2 border-[#333] bg-[#080808]">
        <td className="px-6 py-3 text-sm font-semibold uppercase tracking-widest text-white">
          {section.label}
        </td>
        {li.values.map((v, i) => (
          <td
            key={i}
            className={`px-6 py-3 text-right font-semibold tabular-nums ${
              v < 0 ? "text-[#ff7070]" : "text-white"
            }`}
          >
            <div>{formatAccounting(v, li.unit)}</div>
            {showPctRevenue && revenueTotals && revenueTotals[i] !== 0 && (
              <div className="text-[10px] font-normal text-[#555]">
                {((v / revenueTotals[i]) * 100).toFixed(1)}%
              </div>
            )}
          </td>
        ))}
      </tr>
    );
  }

  // Group: header banner row + indented items + implicit sub-total footer row
  const totals = Array.from({ length: periodCount }, (_, p) =>
    section.items.reduce((sum, li) => sum + (li.values[p] ?? 0), 0)
  );

  return (
    <>
      <tr className="border-t border-[#222] bg-[#0d0d0d]">
        <td
          colSpan={1 + periodCount}
          className="px-6 py-2 text-xs font-semibold uppercase tracking-widest text-[#666]"
        >
          {section.label}
        </td>
      </tr>
      {section.items.map((li) => (
        <tr
          key={li.id}
          className="border-t border-[#1a1a1a] transition-colors hover:bg-[#151515]"
          title={li.formula}
        >
          <td className="px-6 py-2 pl-10 text-[#bbb]">
            <div>{li.label}</div>
            {li.notes && (
              <div className="text-[11px] italic text-[#555]">
                {li.notes}
              </div>
            )}
          </td>
          {li.values.map((v, i) => (
            <td
              key={i}
              className={`px-6 py-2 text-right tabular-nums ${
                v < 0 ? "text-[#ff7070]" : "text-[#bbb]"
              }`}
            >
              <div>{formatAccounting(v, li.unit)}</div>
              {showPctRevenue && revenueTotals && revenueTotals[i] !== 0 && (
                <div className="text-[10px] text-[#555]">
                  {((v / revenueTotals[i]) * 100).toFixed(1)}%
                </div>
              )}
            </td>
          ))}
        </tr>
      ))}
      {section.items.length > 1 && (
        <tr className="border-t border-[#222] bg-[#0d0d0d]">
          <td className="px-6 py-2 pl-10 text-sm font-medium text-[#ddd]">
            Total {section.label}
          </td>
          {totals.map((v, i) => (
            <td
              key={i}
              className={`px-6 py-2 text-right font-medium tabular-nums ${
                v < 0 ? "text-[#ff7070]" : "text-[#ccc]"
              }`}
            >
              <div>{formatAccounting(v, "currency")}</div>
              {showPctRevenue && revenueTotals && revenueTotals[i] !== 0 && (
                <div className="text-[10px] font-normal text-[#555]">
                  {((v / revenueTotals[i]) * 100).toFixed(1)}%
                </div>
              )}
            </td>
          ))}
        </tr>
      )}
    </>
  );
}
