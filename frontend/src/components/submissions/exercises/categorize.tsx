"use client";

import { useState } from "react";
import { X } from "lucide-react";

interface Category {
 name: string;
 items: string[];
}

interface CategorizeExerciseProps {
 categories: Category[];
 allItems: string[];
 onSubmit: (answers: { categories: Record<string, string[]> }) => void;
}

export default function CategorizeExercise({
 categories,
 allItems,
 onSubmit,
}: CategorizeExerciseProps) {
 const [assignments, setAssignments] = useState<Record<string, string[]>>(() => {
 const init: Record<string, string[]> = {};
 categories.forEach((c) => (init[c.name] = []));
 return init;
 });

 const assignedItems = new Set(Object.values(assignments).flat());

 const [shuffled] = useState(() => [...allItems].sort(() => Math.random() - 0.5));
 const availableItems = shuffled.filter((item) => !assignedItems.has(item));

 const [draggedItem, setDraggedItem] = useState<string | null>(null);

 const assignItem = (item: string, categoryName: string) => {
 const newAssignments = { ...assignments };
 for (const key of Object.keys(newAssignments)) {
 newAssignments[key] = newAssignments[key].filter((i) => i !== item);
 }
 newAssignments[categoryName] = [...(newAssignments[categoryName] || []), item];
 setAssignments(newAssignments);
 };

 const removeItem = (item: string, categoryName: string) => {
 setAssignments({
 ...assignments,
 [categoryName]: assignments[categoryName].filter((i) => i !== item),
 });
 };

 const handleSubmit = () => {
 onSubmit({ categories: assignments });
 };

 const totalAssigned = Object.values(assignments).flat().length;

 return (
 <div>
 {/* Available items */}
 <div className="mb-4">
 <h4 className="mb-2 text-sm font-semibold text-text-muted ">Items to categorize</h4>
 <div className="flex flex-wrap gap-2">
 {availableItems.map((item) => (
 <button
 key={item}
 draggable
 onDragStart={() => setDraggedItem(item)}
 onDragEnd={() => setDraggedItem(null)}
 className="cursor-grab rounded-lg border border-primary-soft bg-success-soft px-3 py-2 text-sm font-medium text-success-fg active:cursor-grabbing "
 >
 {item}
 </button>
 ))}
 {availableItems.length === 0 && (
 <p className="text-sm text-text-subtle">All items assigned!</p>
 )}
 </div>
 </div>

 {/* Categories */}
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
 {categories.map((cat) => (
 <div
 key={cat.name}
 onDragOver={(e) => e.preventDefault()}
 onDrop={(e) => {
 e.preventDefault();
 if (draggedItem) {
 assignItem(draggedItem, cat.name);
 setDraggedItem(null);
 }
 }}
 className="min-h-[120px] rounded-lg border-2 border-dashed border-ink-300 p-4 transition-colors hover:border-primary "
 >
 <h4 className="mb-3 text-sm font-semibold text-ink-700 ">{cat.name}</h4>
 <div className="flex flex-wrap gap-1.5">
 {assignments[cat.name]?.map((item) => (
 <span
 key={item}
 className="flex items-center gap-1 rounded-lg bg-success-soft px-2.5 py-1 text-sm font-medium text-success-fg "
 >
 {item}
 <button
 onClick={() => removeItem(item, cat.name)}
 aria-label={`Remove ${item}`}
 className="rounded-pill p-1 transition-colors hover:bg-primary-soft "
 >
 <X className="h-3.5 w-3.5" />
 </button>
 </span>
 ))}
 </div>
 {!assignments[cat.name]?.length && (
 <p className="text-sm text-text-subtle ">Drop items here</p>
 )}
 {/* Click-to-assign buttons for mobile */}
 {availableItems.length > 0 && (
 <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
 {availableItems.map((item) => (
 <button
 key={item}
 onClick={() => assignItem(item, cat.name)}
 className="rounded-lg border border-border-strong px-2.5 py-1 text-xs text-text-muted "
 >
 + {item}
 </button>
 ))}
 </div>
 )}
 </div>
 ))}
 </div>

 <button
 onClick={handleSubmit}
 disabled={totalAssigned < allItems.length}
 className="mt-6 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:opacity-50 "
 >
 Submit Answer
 </button>
 </div>
 );
}
