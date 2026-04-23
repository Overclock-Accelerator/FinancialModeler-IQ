import {
  ComputedLineItem,
  ComputedModel,
  Driver,
  DriverUnit,
  FinancialModel,
  LineItem,
} from "./types";

const SAFE_FORMULA = /^[a-zA-Z0-9_+\-*/().,\s]*$/;
const ALLOWED_FUNCS = new Set([
  "min",
  "max",
  "abs",
  "round",
  "floor",
  "ceil",
  "sqrt",
  "pow",
]);

/**
 * Evaluate an arithmetic formula against a numeric scope.
 *
 * Allowed: +, -, *, /, parentheses, numbers, identifiers from `scope`, and
 * the whitelisted Math functions in ALLOWED_FUNCS. Everything else is rejected.
 */
export function evaluateFormula(
  formula: string,
  scope: Record<string, number>
): number {
  const trimmed = formula.trim();
  if (!trimmed) return 0;
  if (!SAFE_FORMULA.test(trimmed)) {
    throw new Error(`Unsafe characters in formula: ${formula}`);
  }

  const replaced = trimmed.replace(
    /[a-zA-Z_][a-zA-Z0-9_]*/g,
    (ident: string) => {
      if (ALLOWED_FUNCS.has(ident)) return `Math.${ident}`;
      if (ident === "true" || ident === "false") return ident;
      if (Object.prototype.hasOwnProperty.call(scope, ident)) {
        const v = scope[ident];
        return `(${Number.isFinite(v) ? v : 0})`;
      }
      throw new Error(`Unknown identifier "${ident}" in formula: ${formula}`);
    }
  );

  try {
    const fn = new Function(`"use strict"; return (${replaced});`);
    const result = fn();
    if (typeof result !== "number" || !Number.isFinite(result)) {
      return 0;
    }
    return result;
  } catch (err) {
    throw new Error(
      `Failed to evaluate "${formula}": ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}

/**
 * Compute all line items for every period, given driver values.
 *
 * Line items are evaluated in declaration order — the LLM is instructed to
 * emit them topologically (a line item may reference drivers or earlier
 * line items, but never later ones).
 */
export function computeModel(
  model: FinancialModel,
  driverOverrides?: Record<string, number[]>
): ComputedModel {
  const periodCount = model.periods.length;

  const driverValues: Record<string, number[]> = {};
  for (const d of model.drivers) {
    const override = driverOverrides?.[d.id];
    const base = override ?? d.values;
    const normalized: number[] = [];
    for (let p = 0; p < periodCount; p++) {
      const v = base[p];
      normalized.push(typeof v === "number" && Number.isFinite(v) ? v : 0);
    }
    driverValues[d.id] = normalized;
  }

  const lineItemValues: Record<string, number[]> = {};
  const computed: ComputedLineItem[] = [];

  for (const li of model.lineItems) {
    const values: number[] = [];
    for (let p = 0; p < periodCount; p++) {
      const scope: Record<string, number> = {};
      for (const [id, vals] of Object.entries(driverValues)) {
        scope[id] = vals[p] ?? 0;
      }
      for (const [id, vals] of Object.entries(lineItemValues)) {
        scope[id] = vals[p] ?? 0;
      }
      try {
        values.push(evaluateFormula(li.formula, scope));
      } catch {
        values.push(0);
      }
    }
    lineItemValues[li.id] = values;
    computed.push({ ...li, values });
  }

  return { model, driverValues, lineItems: computed };
}

/**
 * Basic structural validation — throws if the LLM returned something we
 * cannot compute against.
 */
export function validateModelShape(raw: unknown): FinancialModel {
  if (!raw || typeof raw !== "object") {
    throw new Error("Model is not an object");
  }
  const m = raw as Partial<FinancialModel>;
  if (!Array.isArray(m.periods) || m.periods.length === 0) {
    throw new Error("Model must include non-empty `periods`");
  }
  if (!Array.isArray(m.drivers)) {
    throw new Error("Model must include `drivers` array");
  }
  if (!Array.isArray(m.lineItems)) {
    throw new Error("Model must include `lineItems` array");
  }

  const periodCount = m.periods.length;
  const idSet = new Set<string>();

  for (const d of m.drivers as Driver[]) {
    if (!d.id || !/^[a-z_][a-z0-9_]*$/.test(d.id)) {
      throw new Error(`Invalid driver id: ${d.id}`);
    }
    if (idSet.has(d.id)) throw new Error(`Duplicate id: ${d.id}`);
    idSet.add(d.id);
    if (!Array.isArray(d.values) || d.values.length !== periodCount) {
      throw new Error(
        `Driver "${d.id}" must have values.length === ${periodCount}`
      );
    }
  }

  for (const li of m.lineItems as LineItem[]) {
    if (!li.id || !/^[a-z_][a-z0-9_]*$/.test(li.id)) {
      throw new Error(`Invalid line item id: ${li.id}`);
    }
    if (idSet.has(li.id)) throw new Error(`Duplicate id: ${li.id}`);
    idSet.add(li.id);
    if (typeof li.formula !== "string") {
      throw new Error(`Line item "${li.id}" missing formula`);
    }
  }

  return {
    id: m.id ?? "",
    title: m.title ?? "Untitled Model",
    description: m.description ?? "",
    periods: m.periods,
    drivers: m.drivers as Driver[],
    lineItems: m.lineItems as LineItem[],
    assumptions: Array.isArray(m.assumptions) ? m.assumptions : [],
    createdAt: m.createdAt ?? new Date().toISOString(),
  };
}

export function formatValue(value: number, unit: DriverUnit = "currency"): string {
  if (!Number.isFinite(value)) return "—";
  switch (unit) {
    case "percent":
      return `${(value * 100).toFixed(1)}%`;
    case "count":
      return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
    case "multiplier":
      return `${value.toFixed(2)}x`;
    case "currency":
    default:
      return formatCurrency(value);
  }
}

export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 10_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
