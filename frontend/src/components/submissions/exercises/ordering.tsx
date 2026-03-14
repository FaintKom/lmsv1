"use client";

import { useState } from "react";
import { GripVertical, ArrowUp, ArrowDown } from "lucide-react";

interface OrderingExerciseProps {
  items: string[];
  onSubmit: (answers: { order: string[] }) => void;
}

export default function OrderingExercise({ items, onSubmit }: OrderingExerciseProps) {
  const [order, setOrder] = useState(() =>
    [...items].sort(() => Math.random() - 0.5)
  );

  const moveItem = (index: number, direction: "up" | "down") => {
    const newOrder = [...order];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newOrder.length) return;
    [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
    setOrder(newOrder);
  };

  return (
    <div>
      <div className="space-y-2">
        {order.map((item, i) => (
          <div
            key={item}
            className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3"
          >
            <GripVertical className="h-4 w-4 text-slate-300" />
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-600">
              {i + 1}
            </span>
            <span className="flex-1 text-sm font-medium text-slate-700">{item}</span>
            <div className="flex gap-1">
              <button
                onClick={() => moveItem(i, "up")}
                disabled={i === 0}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                onClick={() => moveItem(i, "down")}
                disabled={i === order.length - 1}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-30"
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => onSubmit({ order })}
        className="mt-6 w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
      >
        Submit Answer
      </button>
    </div>
  );
}
