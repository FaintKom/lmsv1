/**
 * CSV in, test cases out — all-or-nothing.
 *
 * The whole file is parsed and validated BEFORE anything is posted, so a
 * malformed row means zero imported cases, never half a suite. RFC-4180
 * quoting is honoured (commas and newlines inside quotes, "" escapes),
 * BOM and CRLF are tolerated, blank lines are skipped.
 */

export interface ParsedTestCase {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export type CsvResult =
  | { ok: true; cases: ParsedTestCase[] }
  | { ok: false; error: string };

const TRUTHY = new Set(["true", "1", "yes"]);
const FALSY = new Set(["false", "0", "no", ""]);

/** Split CSV text into rows of fields, honouring quotes. */
function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  row.push(field);
  rows.push(row);

  // Drop rows that are entirely empty (trailing newline, blank lines).
  return rows.filter((r) => r.some((f) => f.trim() !== ""));
}

export function parseTestCaseCsv(text: string): CsvResult {
  const rows = splitCsv(text);
  if (rows.length === 0) return { ok: false, error: "The file is empty." };

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const iInput = header.indexOf("input");
  const iExpected = header.indexOf("expected_output");
  const iHidden = header.indexOf("is_hidden");
  if (iExpected === -1) {
    return {
      ok: false,
      error: 'Missing required column "expected_output". Download the template to see the exact format.',
    };
  }

  const cases: ParsedTestCase[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const expected = (cells[iExpected] ?? "").trim();
    if (!expected) {
      return { ok: false, error: `Row ${r + 1}: "expected_output" is empty.` };
    }
    const hiddenRaw = iHidden === -1 ? "" : (cells[iHidden] ?? "").trim().toLowerCase();
    if (!TRUTHY.has(hiddenRaw) && !FALSY.has(hiddenRaw)) {
      return {
        ok: false,
        error: `Row ${r + 1}: "is_hidden" must be true/false (got "${cells[iHidden]}").`,
      };
    }
    cases.push({
      input: iInput === -1 ? "" : (cells[iInput] ?? ""),
      expected_output: expected,
      is_hidden: TRUTHY.has(hiddenRaw),
    });
  }

  if (cases.length === 0) return { ok: false, error: "No data rows below the header." };
  return { ok: true, cases };
}

/** The downloadable format reference — header plus two example rows. */
export function buildTestCaseCsvTemplate(): string {
  return [
    "input,expected_output,is_hidden",
    '"1 2","3",false',
    '"5 7","12",true',
    "",
  ].join("\r\n");
}
