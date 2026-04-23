import ExcelJS from "exceljs";
import { ComputedLineItem, ComputedModel, FinancialModel } from "./types";

// ── Color helpers ──────────────────────────────────────────────────────────────

type Color = { argb: string };
const rgb = (hex: string): Color => ({ argb: "FF" + hex });

const C = {
  darkNavy: rgb("1F3864"),
  lightBlue: rgb("BDD7EE"),
  veryLightBlue: rgb("DDEEFF"),
  darkGreen: rgb("375623"),
  medGreen: rgb("548235"),
  editYellow: rgb("FFFF99"),
  stripYellow: rgb("FFFFD9"),
  sectionGray: rgb("F2F2F2"),
  headerGray: rgb("D9D9D9"),
  white: rgb("FFFFFF"),
  darkText: rgb("1A1A1A"),
  mutedText: rgb("555555"),
  faintText: rgb("999999"),
  negRed: rgb("C00000"),
  purple: rgb("7030A0"),
  lightPurple: rgb("EAD1F7"),
};

function fill(color: Color): ExcelJS.Fill {
  return { type: "pattern", pattern: "solid", fgColor: color };
}

const THIN: ExcelJS.Border = { style: "thin", color: rgb("D9D9D9") };
const MEDIUM: ExcelJS.Border = { style: "medium", color: rgb("1F3864") };

// ── Column / cell address helpers ──────────────────────────────────────────────

/** 1 → "A", 2 → "B", 27 → "AA" */
function colLetter(n: number): string {
  let result = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

/** Absolute cell address like "$B$15" */
function absCell(col: number, row: number): string {
  return `$${colLetter(col)}$${row}`;
}

// ── Formula conversion: JS arithmetic → Excel formula ─────────────────────────
//
// The app stores line-item formulas as plain JS arithmetic strings, e.g.:
//   "customers * avg_ticket * 365"
//   "round(revenue * 0.05)"
//   "min(max_units, demand)"
//
// We replace each identifier with its absolute cell reference and each allowed
// function name with its Excel equivalent.

const FUNC_MAP: Record<string, string> = {
  min: "MIN",
  max: "MAX",
  abs: "ABS",
  round: "ROUND",
  floor: "INT",   // INT(x) ≈ floor(x) for positive numbers; avoids the 2-arg FLOOR
  sqrt: "SQRT",
  pow: "POWER",
};

function jsToExcelFormula(
  formula: string,
  varCells: Record<string, string>
): string {
  const converted = formula.trim().replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g,
    (ident) => {
      if (FUNC_MAP[ident]) return FUNC_MAP[ident];
      if (ident === "ceil") return "ROUNDUP";
      if (ident === "true") return "1";
      if (ident === "false") return "0";
      if (varCells[ident] !== undefined) return varCells[ident];
      return "0"; // unknown identifier — fall back to zero
    }
  );

  // Patch single-argument ROUND(x) → ROUND(x,0)  (Excel requires num_digits)
  const patched = converted
    .replace(/\bROUND\(([^()]+)\)/g, "ROUND($1,0)")
    .replace(/\bROUNDUP\(([^()]+)\)/g, "ROUNDUP($1,0)");

  return "=" + patched;
}

// ── P&L section builder (mirrors ModelTable logic) ────────────────────────────

type PnLSection = {
  kind: "group" | "subtotal";
  key: string;
  label: string;
  items: ComputedLineItem[];
};

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

function buildPnLSections(lineItems: ComputedLineItem[]): PnLSection[] {
  const byCategory = new Map<string, ComputedLineItem[]>();
  for (const li of lineItems) {
    if (li.category === "UnitEconomics") continue;
    const arr = byCategory.get(li.category) ?? [];
    arr.push(li);
    byCategory.set(li.category, arr);
  }

  const summaries = byCategory.get("Summary") ?? [];
  const placed = new Set<ComputedLineItem>();

  const grossProfit = findSummary(summaries, ["gross_profit", "gross profit", "gross_margin_dollars"]);
  const opIncome = findSummary(summaries, ["operating_income", "operating income", "ebitda", "ebit"]);
  const netIncome = findSummary(summaries, ["net_income", "net income", "net_profit", "profit"]);

  if (grossProfit) placed.add(grossProfit);
  if (opIncome) placed.add(opIncome);
  if (netIncome) placed.add(netIncome);

  const sections: PnLSection[] = [];

  const revenue = byCategory.get("Revenue") ?? [];
  if (revenue.length)
    sections.push({ kind: "group", key: "revenue", label: "Revenue", items: revenue });

  const cogs = byCategory.get("COGS") ?? [];
  if (cogs.length)
    sections.push({ kind: "group", key: "cogs", label: "Cost of Goods Sold", items: cogs });

  if (grossProfit)
    sections.push({ kind: "subtotal", key: "gross_profit", label: grossProfit.label, items: [grossProfit] });

  const opex = byCategory.get("OpEx") ?? [];
  if (opex.length)
    sections.push({ kind: "group", key: "opex", label: "Operating Expenses", items: opex });

  if (opIncome)
    sections.push({ kind: "subtotal", key: "op_income", label: opIncome.label, items: [opIncome] });

  const other = byCategory.get("Other") ?? [];
  if (other.length)
    sections.push({ kind: "group", key: "other", label: "Other Income / Expenses", items: other });

  const leftover = summaries.filter((s) => !placed.has(s) && s !== netIncome);
  for (const s of leftover)
    sections.push({ kind: "subtotal", key: s.id, label: s.label, items: [s] });

  if (netIncome)
    sections.push({ kind: "subtotal", key: "net_income", label: netIncome.label, items: [netIncome] });

  return sections;
}

// ── Shared row-writing helpers ─────────────────────────────────────────────────

function writeSectionBanner(
  ws: ExcelJS.Worksheet,
  rowNum: number,
  totalCols: number,
  label: string,
  bgColor: Color
) {
  const row = ws.getRow(rowNum);
  row.height = 22;
  for (let c = 1; c <= totalCols; c++) row.getCell(c).fill = fill(bgColor);
  const cell = row.getCell(1);
  cell.value = label;
  cell.font = { bold: true, size: 11, color: C.white };
  cell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };
  ws.mergeCells(rowNum, 1, rowNum, totalCols);
}

function applyHeaderCell(cell: ExcelJS.Cell, value: string) {
  cell.value = value;
  cell.font = { bold: true, size: 9, color: C.darkText };
  cell.fill = fill(C.headerGray);
  cell.alignment = { horizontal: "center", vertical: "middle" };
  cell.border = { bottom: THIN };
}

// ── Number format by driver/line-item unit ─────────────────────────────────────

function numFmtFor(unit: string | undefined): string {
  switch (unit) {
    case "currency":
      return '_($* #,##0_);_($* (#,##0);_($* "-"_);_(@_)';
    case "percent":
      return "0.0%";
    case "count":
      return "#,##0";
    case "multiplier":
      return '0.00"x"';
    default:
      return '_($* #,##0_);_($* (#,##0);_($* "-"_);_(@_)';
  }
}

// ── Main export ────────────────────────────────────────────────────────────────

export async function exportToExcel(
  model: FinancialModel,
  computed: ComputedModel
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FinancialModeler IQ";
  wb.created = new Date();

  const ws = wb.addWorksheet("Financial Model", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      margins: {
        left: 0.5, right: 0.5,
        top: 0.75, bottom: 0.75,
        header: 0.3, footer: 0.3,
      },
    },
    properties: { tabColor: { argb: "FF1F3864" } },
  });

  const periods = model.periods;
  const nP = periods.length;

  // Column layout: A = label, B…B+nP-1 = period values, last = notes/formula
  const NOTE_COL = nP + 2;
  const TOTAL_COLS = NOTE_COL;

  ws.getColumn(1).width = 44;
  for (let c = 2; c <= nP + 1; c++) ws.getColumn(c).width = 16;
  ws.getColumn(NOTE_COL).width = 40;

  ws.views = [{ state: "frozen", xSplit: 1, ySplit: 0, showGridLines: false }];

  // ── Row position tracking for formula generation ───────────────────────────
  // driverRowMap[driverId] = row number where that driver's values sit
  // lineItemRowMap[lineItemId] = row number where that line item's values sit
  const driverRowMap = new Map<string, number>();
  const lineItemRowMap = new Map<string, number>();

  let r = 1;

  // ══════════════════════════════════════════════════════
  //  TITLE BLOCK
  // ══════════════════════════════════════════════════════

  ws.getRow(r).height = 34;
  const titleCell = ws.getRow(r).getCell(1);
  titleCell.value = model.title;
  titleCell.font = { bold: true, size: 20, color: C.darkNavy };
  titleCell.alignment = { vertical: "middle" };
  titleCell.fill = fill(C.white);
  ws.mergeCells(r, 1, r, TOTAL_COLS);
  r++;

  ws.getRow(r).height = 18;
  ws.getRow(r).getCell(1).value = model.description;
  ws.getRow(r).getCell(1).font = { italic: true, size: 11, color: C.mutedText };
  ws.getRow(r).getCell(1).fill = fill(C.white);
  ws.mergeCells(r, 1, r, TOTAL_COLS);
  r++;

  ws.getRow(r).height = 14;
  ws.getRow(r).getCell(1).value =
    `${nP}-Year Projection  ·  USD  ·  Generated ` +
    new Date(model.createdAt).toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });
  ws.getRow(r).getCell(1).font = { size: 9, color: C.faintText };
  ws.getRow(r).getCell(1).fill = fill(C.white);
  ws.mergeCells(r, 1, r, TOTAL_COLS);
  r++;

  r++; // blank

  // ══════════════════════════════════════════════════════
  //  KEY ASSUMPTIONS
  // ══════════════════════════════════════════════════════

  writeSectionBanner(ws, r, TOTAL_COLS, "KEY ASSUMPTIONS", C.darkNavy);
  r++;

  const assumpList = model.assumptions.length
    ? model.assumptions
    : ["No key assumptions provided."];

  for (let i = 0; i < assumpList.length; i++) {
    const assRow = ws.getRow(r);
    assRow.height = 15;
    const stripe = i % 2 === 0 ? C.veryLightBlue : C.white;
    assRow.getCell(1).value = `   ${model.assumptions.length ? `${i + 1}.  ` : ""}${assumpList[i]}`;
    assRow.getCell(1).font = { size: 10, color: C.darkText, italic: !model.assumptions.length };
    for (let c = 1; c <= TOTAL_COLS; c++) assRow.getCell(c).fill = fill(stripe);
    ws.mergeCells(r, 1, r, TOTAL_COLS);
    r++;
  }

  r++; // blank

  // ══════════════════════════════════════════════════════
  //  MODEL DRIVERS  (editable yellow cells — these are the inputs)
  // ══════════════════════════════════════════════════════

  writeSectionBanner(
    ws, r, TOTAL_COLS,
    "MODEL DRIVERS  —  edit the yellow cells to update the model",
    C.medGreen
  );
  r++;

  // Column headers
  const dHdr = ws.getRow(r);
  dHdr.height = 16;
  applyHeaderCell(dHdr.getCell(1), "Driver");
  for (let p = 0; p < nP; p++) applyHeaderCell(dHdr.getCell(p + 2), periods[p]);
  applyHeaderCell(dHdr.getCell(NOTE_COL), "Notes");
  r++;

  // Group drivers by category
  const driversByCategory = new Map<string, typeof model.drivers>();
  for (const d of model.drivers) {
    const arr = driversByCategory.get(d.category) ?? [];
    arr.push(d);
    driversByCategory.set(d.category, arr);
  }

  let dStripe = 0;
  for (const [cat, drivers] of driversByCategory.entries()) {
    // Category sub-header
    const catRow = ws.getRow(r);
    catRow.height = 14;
    catRow.getCell(1).value = cat.toUpperCase();
    catRow.getCell(1).font = { bold: true, size: 8, color: C.mutedText };
    for (let c = 1; c <= TOTAL_COLS; c++) catRow.getCell(c).fill = fill(C.sectionGray);
    ws.mergeCells(r, 1, r, TOTAL_COLS);
    r++;

    for (const driver of drivers) {
      const dRow = ws.getRow(r);
      dRow.height = 17;
      const editBg = dStripe++ % 2 === 0 ? C.editYellow : C.stripYellow;

      dRow.getCell(1).value = "   " + driver.label;
      dRow.getCell(1).font = { size: 10, color: C.darkText };
      dRow.getCell(1).fill = fill(C.white);

      const vals = computed.driverValues[driver.id] ?? driver.values;
      const fmt = numFmtFor(driver.unit);

      for (let p = 0; p < nP; p++) {
        const cell = dRow.getCell(p + 2);
        cell.value = vals[p] ?? 0;
        cell.numFmt = fmt;
        cell.fill = fill(editBg);
        cell.font = { size: 10, bold: true, color: C.darkGreen };
        cell.alignment = { horizontal: "right" };
        cell.border = { left: THIN, right: THIN, top: THIN, bottom: THIN };
        cell.protection = { locked: false }; // mark as unlockable for sheet protection
      }

      dRow.getCell(NOTE_COL).value = driver.notes ?? "";
      dRow.getCell(NOTE_COL).font = { size: 9, italic: true, color: C.faintText };
      dRow.getCell(NOTE_COL).fill = fill(C.white);

      // Record this driver's row for later formula building
      driverRowMap.set(driver.id, r);
      r++;
    }
  }

  r++; // blank
  r++; // blank

  // ══════════════════════════════════════════════════════
  //  UNIT ECONOMICS  (formula-driven, references drivers)
  // ══════════════════════════════════════════════════════

  const unitEconItems = computed.lineItems.filter(
    (li) => li.category === "UnitEconomics" || li.isUnitEconomic
  );

  if (unitEconItems.length > 0) {
    writeSectionBanner(ws, r, TOTAL_COLS, "UNIT ECONOMICS", C.purple);
    r++;

    const ueHdr = ws.getRow(r);
    ueHdr.height = 16;
    applyHeaderCell(ueHdr.getCell(1), "Metric");
    for (let p = 0; p < nP; p++) applyHeaderCell(ueHdr.getCell(p + 2), periods[p]);
    r++;

    for (let i = 0; i < unitEconItems.length; i++) {
      const li = unitEconItems[i];
      const liRow = ws.getRow(r);
      liRow.height = 16;
      const stripe = i % 2 === 0 ? C.white : C.sectionGray;

      liRow.getCell(1).value = "   " + li.label;
      liRow.getCell(1).font = { size: 10, color: C.darkText };
      liRow.getCell(1).fill = fill(stripe);

      const fmt = numFmtFor(li.unit);
      for (let p = 0; p < nP; p++) {
        const cell = liRow.getCell(p + 2);
        cell.value = li.values[p] ?? 0; // placeholder — overwritten with formula in pass 2
        cell.numFmt = fmt;
        cell.fill = fill(stripe);
        cell.alignment = { horizontal: "right" };
        cell.font = { size: 10, color: C.darkText };
      }

      lineItemRowMap.set(li.id, r);
      r++;
    }

    r++; // blank
  }

  // ══════════════════════════════════════════════════════
  //  INCOME STATEMENT  (formula-driven, references drivers + line items)
  // ══════════════════════════════════════════════════════

  writeSectionBanner(ws, r, TOTAL_COLS, "INCOME STATEMENT", C.darkNavy);
  r++;

  const pHdr = ws.getRow(r);
  pHdr.height = 16;
  applyHeaderCell(pHdr.getCell(1), "Line Item");
  for (let p = 0; p < nP; p++) applyHeaderCell(pHdr.getCell(p + 2), periods[p]);
  r++;

  const sections = buildPnLSections(computed.lineItems);

  for (const section of sections) {
    if (section.kind === "subtotal") {
      const li = section.items[0];
      const subRow = ws.getRow(r);
      subRow.height = 19;

      subRow.getCell(1).value = section.label.toUpperCase();
      subRow.getCell(1).font = { bold: true, size: 10, color: C.darkNavy };
      subRow.getCell(1).fill = fill(C.lightBlue);
      subRow.getCell(1).border = { top: MEDIUM, bottom: MEDIUM };

      const fmt = numFmtFor(li.unit);
      for (let p = 0; p < nP; p++) {
        const val = li.values[p] ?? 0;
        const cell = subRow.getCell(p + 2);
        cell.value = val; // placeholder — overwritten in pass 2
        cell.numFmt = fmt;
        cell.font = { bold: true, size: 10, color: val < 0 ? C.negRed : C.darkNavy };
        cell.fill = fill(C.lightBlue);
        cell.alignment = { horizontal: "right" };
        cell.border = { top: MEDIUM, bottom: MEDIUM };
      }

      lineItemRowMap.set(li.id, r);
      r++;
      continue;
    }

    // Group: section header row
    const secHdr = ws.getRow(r);
    secHdr.height = 15;
    secHdr.getCell(1).value = section.label.toUpperCase();
    secHdr.getCell(1).font = { bold: true, size: 9, color: C.mutedText };
    for (let c = 1; c <= nP + 1; c++) secHdr.getCell(c).fill = fill(C.sectionGray);
    ws.mergeCells(r, 1, r, nP + 1);
    r++;

    // Individual line items
    for (let i = 0; i < section.items.length; i++) {
      const li = section.items[i];
      const liRow = ws.getRow(r);
      liRow.height = 16;
      const stripe = i % 2 === 0 ? C.white : C.sectionGray;

      liRow.getCell(1).value = "      " + li.label;
      liRow.getCell(1).font = { size: 10, color: C.darkText };
      liRow.getCell(1).fill = fill(stripe);
      if (li.notes) {
        liRow.getCell(1).value = {
          richText: [
            { text: "      " + li.label, font: { size: 10, color: C.darkText } },
            { text: "  " + li.notes, font: { size: 8, italic: true, color: C.faintText } },
          ],
        };
      }

      const fmt = numFmtFor(li.unit);
      for (let p = 0; p < nP; p++) {
        const val = li.values[p] ?? 0;
        const cell = liRow.getCell(p + 2);
        cell.value = val; // placeholder — overwritten in pass 2
        cell.numFmt = fmt;
        cell.fill = fill(stripe);
        cell.alignment = { horizontal: "right" };
        cell.font = { size: 10, color: val < 0 ? C.negRed : C.darkText };
      }

      lineItemRowMap.set(li.id, r);
      r++;
    }

    // Section total row (only when > 1 item)
    if (section.items.length > 1) {
      // Build a SUM formula across the individual item rows for each period
      const totRow = ws.getRow(r);
      totRow.height = 16;

      totRow.getCell(1).value = "      Total " + section.label;
      totRow.getCell(1).font = { bold: true, size: 10, color: C.darkText };
      totRow.getCell(1).fill = fill(C.headerGray);
      totRow.getCell(1).border = { top: THIN };

      for (let p = 0; p < nP; p++) {
        const colNum = p + 2;
        // SUM of this section's individual item rows
        const refs = section.items.map(
          (li) => lineItemRowMap.has(li.id)
            ? absCell(colNum, lineItemRowMap.get(li.id)!)
            : "0"
        );
        const totals = section.items.reduce(
          (sum, li) => sum + (li.values[p] ?? 0), 0
        );
        const cell = totRow.getCell(colNum);
        cell.value = {
          formula: `=SUM(${refs.join(",")})`,
          result: totals,
        };
        cell.numFmt = '_($* #,##0_);_($* (#,##0);_($* "-"_);_(@_)';
        cell.font = { bold: true, size: 10, color: totals < 0 ? C.negRed : C.darkText };
        cell.fill = fill(C.headerGray);
        cell.alignment = { horizontal: "right" };
        cell.border = { top: THIN };
      }
      r++;
    }
  }

  // ══════════════════════════════════════════════════════
  //  PASS 2 — Replace placeholder values with live Excel formulas
  //
  //  Now that ALL rows have been written, driverRowMap and lineItemRowMap
  //  are complete.  We can safely build cross-references in any direction.
  // ══════════════════════════════════════════════════════

  for (const li of computed.lineItems) {
    const liRowNum = lineItemRowMap.get(li.id);
    if (liRowNum === undefined) continue; // safety: should always be tracked

    for (let p = 0; p < nP; p++) {
      const colNum = p + 2;

      // Build the variable → cell-address map for this period column
      const varCells: Record<string, string> = {};
      for (const [id, dRow] of driverRowMap) {
        varCells[id] = absCell(colNum, dRow);
      }
      for (const [id, lRow] of lineItemRowMap) {
        varCells[id] = absCell(colNum, lRow);
      }

      const formula = jsToExcelFormula(li.formula, varCells);
      const cell = ws.getCell(liRowNum, colNum);

      // Preserve existing styles; only update the value to a formula object
      cell.value = {
        formula,
        result: Number.isFinite(li.values[p]) ? li.values[p] : 0,
      };
    }
  }

  // ── Download ───────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${model.title.replace(/[^a-zA-Z0-9]+/g, "_")}_model.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
