"use client";

import { Calculator, X } from "lucide-react";

interface DesmosCalculatorProps {
  open: boolean;
  onToggle: () => void;
}

export default function DesmosCalculator({ open, onToggle }: DesmosCalculatorProps) {
  if (!open) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-green-600 text-white shadow-lg transition-transform hover:scale-110 hover:bg-green-700"
        title="Open Calculator"
      >
        <Calculator className="h-5 w-5" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 flex h-[70vh] sm:h-[480px] w-full sm:w-[380px] flex-col rounded-tl-2xl border-l border-t border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1E1E1E]">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2 dark:border-white/10">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Calculator className="h-4 w-4" />
          Desmos Calculator
        </span>
        <button onClick={onToggle} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>
      <iframe
        src="https://www.desmos.com/testing/cb-sat-ap/graphing"
        className="flex-1"
        title="Desmos Graphing Calculator"
        allow="clipboard-write"
      />
    </div>
  );
}
