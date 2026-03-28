"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

interface Term {
  id: string;
  value: number;
  label: string;
}

export default function EquationBalance({ config, onComplete }: MathTemplateProps) {
  const leftFixed = (config.left_fixed as number[]) || [5];
  const rightFixed = (config.right_fixed as number[]) || [2];
  const availableTerms = (config.available_terms as { value: number; label: string }[]) || [
    { value: 3, label: "3" },
    { value: 4, label: "4" },
    { value: 7, label: "7" },
    { value: 1, label: "1" },
  ];
  const targetDifference = leftFixed.reduce((a, b) => a + b, 0) - rightFixed.reduce((a, b) => a + b, 0);

  const [bank, setBank] = useState<Term[]>(
    availableTerms.map((t, i) => ({ id: `t${i}`, value: t.value, label: t.label }))
  );
  const [rightAdded, setRightAdded] = useState<Term[]>([]);
  const [checked, setChecked] = useState(false);

  const leftSum = leftFixed.reduce((a, b) => a + b, 0);
  const rightSum = rightFixed.reduce((a, b) => a + b, 0) + rightAdded.reduce((a, t) => a + t.value, 0);
  const isBalanced = leftSum === rightSum;

  const addToRight = useCallback((term: Term) => {
    if (checked) return;
    setBank((prev) => prev.filter((t) => t.id !== term.id));
    setRightAdded((prev) => [...prev, term]);
  }, [checked]);

  const removeFromRight = useCallback((term: Term) => {
    if (checked) return;
    setRightAdded((prev) => prev.filter((t) => t.id !== term.id));
    setBank((prev) => [...prev, term]);
  }, [checked]);

  const handleCheck = () => {
    setChecked(true);
    if (isBalanced) {
      onComplete(true, 1.0);
    }
  };

  const handleReset = () => {
    setBank(availableTerms.map((t, i) => ({ id: `t${i}`, value: t.value, label: t.label })));
    setRightAdded([]);
    setChecked(false);
  };

  // Beam tilt angle based on balance
  const diff = leftSum - rightSum;
  const tiltAngle = Math.max(-15, Math.min(15, diff * 3));

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Add terms to the right side to balance the equation
      </p>

      {/* Balance beam visualization */}
      <svg viewBox="0 0 400 180" width="100%" style={{ maxWidth: 400 }} className="overflow-visible">
        {/* Pivot */}
        <polygon points="200,170 190,145 210,145" fill="#64748b" />

        {/* Beam */}
        <g style={{ transform: `rotate(${tiltAngle}deg)`, transformOrigin: "200px 140px", transition: "transform 0.3s" }}>
          <rect x={40} y={136} width={320} height={8} rx={4}
            fill={checked ? (isBalanced ? "#22c55e" : "#ef4444") : "#94a3b8"} className="transition-colors" />

          {/* Left pan */}
          <rect x={50} y={105} width={120} height={30} rx={8}
            fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1.5} className="dark:fill-slate-700 dark:stroke-slate-600" />
          <text x={110} y={125} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#334155" className="dark:fill-slate-200">
            {leftFixed.join(" + ")} = {leftSum}
          </text>

          {/* Right pan */}
          <rect x={230} y={105} width={120} height={30} rx={8}
            fill="#f1f5f9" stroke="#cbd5e1" strokeWidth={1.5} className="dark:fill-slate-700 dark:stroke-slate-600" />
          <text x={290} y={125} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#334155" className="dark:fill-slate-200">
            {[...rightFixed, ...rightAdded.map((t) => t.value)].join(" + ") || "?"} = {rightSum}
          </text>
        </g>
      </svg>

      {/* Terms on right side (removable) */}
      {rightAdded.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-slate-400 self-center">Added:</span>
          {rightAdded.map((term) => (
            <button
              key={term.id}
              onClick={() => removeFromRight(term)}
              disabled={checked}
              className="rounded-lg bg-indigo-100 px-3 py-1.5 text-sm font-semibold text-indigo-700 transition-colors hover:bg-red-100 hover:text-red-700 dark:bg-indigo-500/20 dark:text-indigo-300 dark:hover:bg-red-500/20 dark:hover:text-red-300"
            >
              {term.label} &times;
            </button>
          ))}
        </div>
      )}

      {/* Term bank */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-slate-400">Available:</span>
        {bank.map((term) => (
          <button
            key={term.id}
            onClick={() => addToRight(term)}
            disabled={checked}
            className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-indigo-100 hover:text-indigo-700 dark:bg-white/10 dark:text-slate-300 dark:hover:bg-indigo-500/20 dark:hover:text-indigo-300"
          >
            +{term.label}
          </button>
        ))}
        {bank.length === 0 && !checked && (
          <span className="text-xs text-slate-400 italic">All terms placed</span>
        )}
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleReset}>
          Reset
        </Button>
        <Button size="sm" onClick={handleCheck} disabled={checked && isBalanced}>
          {checked && isBalanced ? "Balanced!" : "Check"}
        </Button>
      </div>

      {checked && !isBalanced && (
        <p className="text-xs text-red-500">
          Not balanced yet. Left = {leftSum}, Right = {rightSum}. Difference: {Math.abs(diff)}
        </p>
      )}
    </div>
  );
}
