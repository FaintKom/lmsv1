"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

interface TableCell {
  value: number | null; // null = student must fill
  label?: string;
}

export default function TwoWayTable({ config, onComplete }: MathTemplateProps) {
  const rowHeaders = (config.row_headers as string[]) || ["Boys", "Girls", "Total"];
  const colHeaders = (config.col_headers as string[]) || ["Soccer", "Basketball", "Total"];
  const cells = (config.cells as (number | null)[][]) || [
    [12, null, 25],
    [null, 10, 23],
    [20, null, 48],
  ];
  const answers = (config.answers as Record<string, number>) || {};
  // answers format: "r1c1": 13, "r2c0": 8, "r2c2": 28

  const [userValues, setUserValues] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});

  const handleChange = (r: number, c: number, val: string) => {
    setChecked(false);
    setUserValues((prev) => ({ ...prev, [`r${r}c${c}`]: val }));
  };

  const handleCheck = () => {
    const res: Record<string, boolean> = {};
    let correct = 0;
    let total = 0;

    for (let r = 0; r < cells.length; r++) {
      for (let c = 0; c < cells[r].length; c++) {
        if (cells[r][c] === null) {
          total++;
          const key = `r${r}c${c}`;
          const expected = answers[key];
          const userVal = parseInt(userValues[key] || "", 10);
          const ok = expected !== undefined && !isNaN(userVal) && userVal === expected;
          res[key] = ok;
          if (ok) correct++;
        }
      }
    }

    setResults(res);
    setChecked(true);
    const score = total > 0 ? correct / total : 0;
    if (correct === total && total > 0) {
      onComplete(true, 1.0);
    } else if (correct > 0) {
      onComplete(false, score);
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="border-b border-r border-slate-200 bg-slate-50 px-5 py-3 text-left text-xs font-semibold text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400"></th>
              {colHeaders.map((h, i) => (
                <th key={i} className={`border-b border-slate-200 px-5 py-3 text-center text-sm font-bold dark:border-white/10 ${
                  i === colHeaders.length - 1 ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300" : "bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-300"
                }`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cells.map((row, r) => (
              <tr key={r}>
                <td className={`border-r border-b border-slate-200 px-5 py-3 text-sm font-bold dark:border-white/10 ${
                  r === cells.length - 1 ? "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-300" : "bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-300"
                }`}>
                  {rowHeaders[r]}
                </td>
                {row.map((cell, c) => {
                  const key = `r${r}c${c}`;
                  const isBlank = cell === null;
                  const isTotal = r === cells.length - 1 || c === colHeaders.length - 1;

                  if (!isBlank) {
                    return (
                      <td key={c} className={`border-b border-slate-200 px-5 py-3 text-center text-sm font-semibold dark:border-white/10 ${
                        isTotal ? "bg-slate-50 text-slate-700 dark:bg-white/5 dark:text-slate-300" : "text-slate-600 dark:text-slate-400"
                      }`}>
                        {cell}
                      </td>
                    );
                  }

                  return (
                    <td key={c} className="border-b border-slate-200 px-2 py-2 dark:border-white/10">
                      <input
                        type="number"
                        value={userValues[key] || ""}
                        onChange={(e) => handleChange(r, c, e.target.value)}
                        disabled={checked && results[key]}
                        className={`w-16 rounded-lg border-2 px-2 py-2 text-center text-sm font-bold outline-none transition-colors ${
                          checked
                            ? results[key]
                              ? "border-emerald-400 bg-emerald-50 text-emerald-700 dark:border-emerald-500 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "border-red-400 bg-red-50 text-red-700 dark:border-red-500 dark:bg-red-500/10 dark:text-red-300"
                            : "border-green-300 bg-white text-green-700 focus:border-green-500 dark:border-green-500 dark:bg-[#1E1E1E] dark:text-green-300"
                        }`}
                        placeholder="?"
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button onClick={handleCheck} disabled={checked && Object.values(results).every(Boolean)}>
        {checked && Object.values(results).every(Boolean) ? "All Correct!" : "Check Answers"}
      </Button>

      {checked && !Object.values(results).every(Boolean) && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {Object.values(results).filter(Boolean).length}/{Object.values(results).length} correct.
          Hint: rows and columns must add up to the totals.
        </p>
      )}
    </div>
  );
}
