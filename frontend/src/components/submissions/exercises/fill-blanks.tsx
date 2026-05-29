"use client";

import { useState, useMemo } from "react";
import {
 DndContext,
 DragOverlay,
 closestCenter,
 type DragStartEvent,
 type DragEndEvent,
 useSensor,
 useSensors,
 PointerSensor,
 TouchSensor,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";

interface FillBlanksExerciseProps {
 textTemplate: string;
 blankCount: number;
 words: string[];
 onSubmit: (answers: { blanks: string[] }) => void;
}

// Draggable word chip
function DraggableWord({ id, word, isPlaced }: { id: string; word: string; isPlaced: boolean }) {
 const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

 if (isPlaced) return null;

 return (
 <div
 ref={setNodeRef}
 {...listeners}
 {...attributes}
 className={`cursor-grab select-none rounded-lg border-2 border-primary-soft bg-success-soft px-3 py-1.5 text-sm font-medium text-success-fg shadow-sm transition-all hover:border-primary hover:bg-primary-soft hover:shadow-md active:cursor-grabbing ${
 isDragging ? "opacity-30" : ""
 }`}
 >
 {word}
 </div>
 );
}

// Droppable blank slot (inline in text)
function DroppableBlank({
 id,
 placedWord,
 onRemove,
}: {
 id: string;
 placedWord: string | null;
 onRemove: () => void;
}) {
 const { isOver, setNodeRef } = useDroppable({ id });

 if (placedWord) {
 return (
 <button
 onClick={onRemove}
 className="mx-1 inline-flex items-center gap-1 rounded-lg border-2 border-primary bg-success-soft px-3 py-1 text-sm font-medium text-success-fg transition-colors hover:border-danger hover:bg-danger-soft hover:text-danger-fg "
 title="Click to remove"
 >
 {placedWord}
 <span className="text-xs opacity-60">×</span>
 </button>
 );
 }

 return (
 <span
 ref={setNodeRef}
 className={`mx-1 inline-block min-w-[80px] rounded-lg border-2 border-dashed px-3 py-1 text-center text-sm transition-colors ${
 isOver
 ? "border-primary bg-success-soft text-primary "
 : "border-ink-300 bg-surface-2 text-text-subtle "
 }`}
 >
 {isOver ? "Drop here" : "___"}
 </span>
 );
}

export default function FillBlanksExercise({
 textTemplate,
 blankCount,
 words,
 onSubmit,
}: FillBlanksExerciseProps) {
 const [placements, setPlacements] = useState<(string | null)[]>(Array(blankCount).fill(null));
 const [activeId, setActiveId] = useState<string | null>(null);

 const sensors = useSensors(
 useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
 useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
 );

 // Shuffle words once on mount
 const shuffledWords = useMemo(() => {
 const arr = [...words];
 for (let i = arr.length - 1; i > 0; i--) {
 const j = Math.floor(Math.random() * (i + 1));
 [arr[i], arr[j]] = [arr[j], arr[i]];
 }
 return arr.map((word, i) => ({ id: `word-${i}`, word }));
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [words.join(",")]);

 // Track which words are placed
 const placedWordIds = new Set(
 placements.filter(Boolean).map((word) => {
 const item = shuffledWords.find((w) => w.word === word);
 return item?.id;
 })
 );

 const parts = textTemplate.split("{{blank}}");

 const handleDragStart = (event: DragStartEvent) => {
 setActiveId(event.active.id as string);
 };

 const handleDragEnd = (event: DragEndEvent) => {
 setActiveId(null);
 const { active, over } = event;
 if (!over) return;

 const blankId = over.id as string;
 if (!blankId.startsWith("blank-")) return;

 const blankIndex = parseInt(blankId.replace("blank-", ""));
 const draggedWord = shuffledWords.find((w) => w.id === active.id);
 if (!draggedWord) return;

 // If this blank already has a word, return it to the bank
 const newPlacements = [...placements];
 newPlacements[blankIndex] = draggedWord.word;
 setPlacements(newPlacements);
 };

 const handleRemove = (index: number) => {
 const newPlacements = [...placements];
 newPlacements[index] = null;
 setPlacements(newPlacements);
 };

 const activeWord = activeId ? shuffledWords.find((w) => w.id === activeId)?.word : null;
 const allFilled = placements.every((p) => p !== null);

 let blankIndex = 0;

 return (
 <DndContext
 sensors={sensors}
 collisionDetection={closestCenter}
 onDragStart={handleDragStart}
 onDragEnd={handleDragEnd}
 >
 <div className="space-y-6">
 {/* Text with drop zones */}
 <div className="rounded-lg border border-border-strong bg-paper-2 p-6 text-base leading-loose text-ink-700 ">
 {parts.map((part, i) => {
 const currentBlankIndex = blankIndex;
 if (i < parts.length - 1) blankIndex++;
 return (
 <span key={i}>
 {part}
 {i < parts.length - 1 && (
 <DroppableBlank
 id={`blank-${currentBlankIndex}`}
 placedWord={placements[currentBlankIndex]}
 onRemove={() => handleRemove(currentBlankIndex)}
 />
 )}
 </span>
 );
 })}
 </div>

 {/* Word bank */}
 <div className="rounded-lg border border-border-strong bg-surface-2 p-4 ">
 <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-subtle">
 Word Bank — drag words to fill the blanks
 </p>
 <div className="flex flex-wrap gap-2">
 {shuffledWords.map((item) => (
 <DraggableWord
 key={item.id}
 id={item.id}
 word={item.word}
 isPlaced={placedWordIds.has(item.id)}
 />
 ))}
 {shuffledWords.every((item) => placedWordIds.has(item.id)) && (
 <p className="text-sm text-text-subtle">All words placed!</p>
 )}
 </div>
 </div>

 {/* Submit */}
 <button
 onClick={() => onSubmit({ blanks: placements.map((p) => p || "") })}
 disabled={!allFilled}
 className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 "
 >
 Submit Answer
 </button>
 </div>

 {/* Drag overlay */}
 <DragOverlay>
 {activeWord ? (
 <div className="rounded-lg border-2 border-primary bg-primary-soft px-3 py-1.5 text-sm font-medium text-success-fg shadow-lg ">
 {activeWord}
 </div>
 ) : null}
 </DragOverlay>
 </DndContext>
 );
}
