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
      <p className="text-sm text-ink-700 dark:text-ink-300">
        Add terms to the right side to balance the equation
      </p>

      {/* Balance beam visualization */}
      <svg viewBox="0 0 400 180" width="100%" style={{ maxWidth: 400 }} className="overflow-visible">
        {/* Pivot */}
        <polygon points="200,170 190,145 210,145" fill="#4d5a51" />

        {/* Beam */}
        <g style={{ transform: `rotate(${tiltAngle}deg)`, transformOrigin: "200px 140px", transition: "transform 0.3s" }}>
          <rect x={40} y={136} width={320} height={8} rx={4}
            fill={checked ? (isBalanced ? "#3fb04b" : "#ff7a5c") : "#9aa39d"} className="transition-colors" />

          {/* Left pan */}
          <rect x={50} y={105} width={120} height={30} rx={8}
            fill="#f4f5f1" stroke="#c9cec9" strokeWidth={1.5} className="dark:fill-ink-700 dark:stroke-ink-700" />
          <text x={110} y={125} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#1a2a1f" className="dark:fill-ink-200">
            {leftFixed.join(" + ")} = {leftSum}
          </text>

          {/* Right pan */}
          <rect x={230} y={105} width={120} height={30} rx={8}
            fill="#f4f5f1" stroke="#c9cec9" strokeWidth={1.5} className="dark:fill-ink-700 dark:stroke-ink-700" />
          <text x={290} y={125} textAnchor="middle" fontSize={16} fontWeight="bold" fill="#1a2a1f" className="dark:fill-ink-200">
            {[...rightFixed, ...rightAdded.map((t) => t.value)].join(" + ") || "?"} = {rightSum}
          </text>
        </g>
      </svg>

      {/* Terms on right side (removable) */}
      {rightAdded.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-ink-400 self-center">Added:</span>
          {rightAdded.map((term) => (
            <button
              key={term.id}
              onClick={() => removeFromRight(term)}
              disabled={checked}
              className="rounded-lg bg-green-100 px-3 py-1.5 text-sm font-semibold text-green-700 transition-colors hover:bg-coral-50 hover:text-coral-700 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-coral-500/20 dark:hover:text-coral-300"
            >
              {term.label} &times;
            </button>
          ))}
        </div>
      )}

      {/* Term bank */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-ink-400">Available:</span>
        {bank.map((term) => (
          <button
            key={term.id}
            onClick={() => addToRight(term)}
            disabled={checked}
            className="rounded-lg bg-ink-100 px-3 py-1.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-green-100 hover:text-green-700 dark:bg-white/10 dark:text-ink-300 dark:hover:bg-green-500/20 dark:hover:text-green-300"
          >
            +{term.label}
          </button>
        ))}
        {bank.length === 0 && !checked && (
          <span className="text-xs text-ink-400 italic">All terms placed</span>
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
        <p className="text-xs text-coral-500">
          Not balanced yet. Left = {leftSum}, Right = {rightSum}. Difference: {Math.abs(diff)}
        </p>
      )}
    </div>
  );
}
