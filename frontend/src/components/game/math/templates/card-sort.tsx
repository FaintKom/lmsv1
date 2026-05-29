"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import type { MathTemplateProps } from "../template-registry";

interface Card {
 id: string;
 text: string;
 category: string; // correct category
}

interface Category {
 id: string;
 label: string;
 color: string;
}

const DEFAULT_CATEGORIES: Category[] = [
 { id: "linear", label: "Linear", color: "#4C97FF" },
 { id: "quadratic", label: "Quadratic", color: "#FF8C1A" },
 { id: "exponential", label: "Exponential", color: "#40BF4A" },
];

const DEFAULT_CARDS: Card[] = [
 { id: "c1", text: "y = 2x + 3", category: "linear" },
 { id: "c2", text: "y = x² - 4", category: "quadratic" },
 { id: "c3", text: "y = 3^x", category: "exponential" },
 { id: "c4", text: "y = -5x", category: "linear" },
 { id: "c5", text: "y = (x+1)²", category: "quadratic" },
 { id: "c6", text: "y = 2·(1.5)^x", category: "exponential" },
];

export default function CardSort({ config, onComplete }: MathTemplateProps) {
 const categories = (config.categories as Category[]) || DEFAULT_CATEGORIES;
 const initialCards = (config.cards as Card[]) || DEFAULT_CARDS;

 const [unsorted, setUnsorted] = useState<Card[]>(() =>
 [...initialCards].sort(() => Math.random() - 0.5)
 );
 const [sorted, setSorted] = useState<Record<string, Card[]>>(() =>
 Object.fromEntries(categories.map((c) => [c.id, []]))
 );
 const [checked, setChecked] = useState(false);
 const [results, setResults] = useState<Record<string, boolean>>({});
 const [dragCard, setDragCard] = useState<Card | null>(null);
 const [tappedCard, setTappedCard] = useState<Card | null>(null); // mobile: tap to select

 const moveToCategory = useCallback((card: Card, categoryId: string) => {
 setUnsorted((prev) => prev.filter((c) => c.id !== card.id));
 // Remove from any existing category
 setSorted((prev) => {
 const next = { ...prev };
 for (const key of Object.keys(next)) {
 next[key] = next[key].filter((c) => c.id !== card.id);
 }
 next[categoryId] = [...(next[categoryId] || []), card];
 return next;
 });
 setChecked(false);
 }, []);

 const moveBack = useCallback((card: Card) => {
 setSorted((prev) => {
 const next = { ...prev };
 for (const key of Object.keys(next)) {
 next[key] = next[key].filter((c) => c.id !== card.id);
 }
 return next;
 });
 setUnsorted((prev) => [...prev, card]);
 setChecked(false);
 }, []);

 const handleCheck = () => {
 const res: Record<string, boolean> = {};
 let correct = 0;
 for (const cat of categories) {
 for (const card of sorted[cat.id] || []) {
 const ok = card.category === cat.id;
 res[card.id] = ok;
 if (ok) correct++;
 }
 }
 // Unsorted cards are wrong
 for (const card of unsorted) {
 res[card.id] = false;
 }
 setResults(res);
 setChecked(true);
 const total = initialCards.length;
 const score = correct / total;
 if (correct === total) onComplete(true, 1.0);
 else if (correct > 0) onComplete(false, score);
 };

 const handleReset = () => {
 setUnsorted([...initialCards].sort(() => Math.random() - 0.5));
 setSorted(Object.fromEntries(categories.map((c) => [c.id, []])));
 setChecked(false);
 setResults({});
 };

 return (
 <div className="flex flex-col gap-5">
 {/* Unsorted cards */}
 {unsorted.length > 0 && (
 <div className="flex flex-wrap gap-2 rounded-lg border-2 border-dashed border-ink-300 bg-surface-2 p-4 ">
 <span className="w-full text-xs font-medium text-text-subtle mb-1">
 Drag cards to the correct category ({unsorted.length} remaining)
 </span>
 {unsorted.map((card) => (
 <button
 key={card.id}
 draggable
 onDragStart={() => setDragCard(card)}
 onClick={() => setTappedCard(tappedCard?.id === card.id ? null : card)}
 className={`rounded-lg border-2 bg-paper-2 px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:shadow-md active:scale-95 ${
 tappedCard?.id === card.id
 ? "border-primary ring-2 ring-primary text-success-fg "
 : checked && results[card.id] === false
 ? "border-danger text-danger-fg "
 : "border-border-strong text-ink-700 hover:border-primary "
 }`}
 >
 {card.text}
 </button>
 ))}
 </div>
 )}

 {/* Category bins */}
 <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3" style={categories.length <= 3 ? { gridTemplateColumns: undefined } : undefined}>
 {categories.map((cat) => (
 <div
 key={cat.id}
 onDragOver={(e) => e.preventDefault()}
 onDrop={() => {
 if (dragCard) { moveToCategory(dragCard, cat.id); setDragCard(null); }
 }}
 onClick={() => {
 // Tap-to-place: if a card is tapped, place it in this category
 if (tappedCard) { moveToCategory(tappedCard, cat.id); setTappedCard(null); }
 }}
 className={`flex flex-col rounded-lg border-2 p-3 transition-colors min-h-[100px] ${
 tappedCard ? "cursor-pointer hover:opacity-80" : ""
 }`}
 style={{ borderColor: cat.color + "60", backgroundColor: cat.color + "08" }}
 >
 {/* Category header */}
 <div className="mb-2 flex items-center gap-2">
 <div className="h-3 w-3 rounded-pill" style={{ backgroundColor: cat.color }} />
 <span className="text-sm font-bold" style={{ color: cat.color }}>{cat.label}</span>
 <span className="ml-auto text-[10px] text-text-subtle">{(sorted[cat.id] || []).length}</span>
 </div>

 {/* Cards in this category */}
 <div className="flex flex-col gap-1.5">
 {(sorted[cat.id] || []).map((card) => (
 <div
 key={card.id}
 className={`flex items-center justify-between rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
 checked
 ? results[card.id]
 ? "border-primary bg-success-soft text-success-fg "
 : "border-danger bg-danger-soft text-danger-fg "
 : "border-border-strong bg-paper-2 text-ink-700 "
 }`}
 >
 <span>{card.text}</span>
 {!checked && (
 <button onClick={() => moveBack(card)} className="ml-2 text-text-subtle hover:text-danger-fg text-xs">✕</button>
 )}
 </div>
 ))}
 </div>

 {/* Drop hint */}
 {(sorted[cat.id] || []).length === 0 && (
 <div className="flex flex-1 items-center justify-center text-xs text-text-subtle italic">
 Drop cards here
 </div>
 )}
 </div>
 ))}
 </div>

 {/* Actions */}
 <div className="flex items-center gap-3 justify-center">
 <Button variant="outline" size="sm" onClick={handleReset}>Reset</Button>
 <Button onClick={handleCheck} disabled={(checked && Object.values(results).every(Boolean)) || unsorted.length === initialCards.length}>
 {checked && Object.values(results).every(Boolean) ? "All Correct!" : "Check"}
 </Button>
 </div>

 {checked && !Object.values(results).every(Boolean) && (
 <p className="text-center text-xs text-text-muted">
 {Object.values(results).filter(Boolean).length}/{initialCards.length} correct. Check the red cards.
 </p>
 )}
 </div>
 );
}
