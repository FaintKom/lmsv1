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
      className={`cursor-grab select-none rounded-lg border-2 border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 shadow-sm transition-all hover:border-green-300 hover:bg-green-100 hover:shadow-md active:cursor-grabbing dark:border-green-500/30 dark:bg-green-500/10 dark:text-green-300 ${
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
        className="mx-1 inline-flex items-center gap-1 rounded-lg border-2 border-green-300 bg-green-50 px-3 py-1 text-sm font-medium text-green-700 transition-colors hover:border-coral-300 hover:bg-coral-50 hover:text-coral-500 dark:border-green-500/40 dark:bg-green-500/10 dark:text-green-300 dark:hover:border-coral-500/40 dark:hover:bg-coral-500/10 dark:hover:text-coral-300"
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
          ? "border-green-400 bg-green-50 text-green-500 dark:border-green-400 dark:bg-green-500/20"
          : "border-ink-300 bg-ink-50 text-ink-400 dark:border-white/20 dark:bg-white/5 dark:text-ink-500"
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
        <div className="rounded-xl border border-ink-200 bg-white p-6 text-base leading-loose text-ink-700 dark:border-white/10 dark:bg-[#1E1E1E] dark:text-ink-300">
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
        <div className="rounded-xl border border-ink-200 bg-ink-50 p-4 dark:border-white/10 dark:bg-white/5">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-400">
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
              <p className="text-sm text-ink-400">All words placed!</p>
            )}
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={() => onSubmit({ blanks: placements.map((p) => p || "") })}
          disabled={!allFilled}
          className="w-full rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-green-500 dark:hover:bg-green-600"
        >
          Submit Answer
        </button>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeWord ? (
          <div className="rounded-lg border-2 border-green-400 bg-green-100 px-3 py-1.5 text-sm font-medium text-green-700 shadow-lg dark:border-green-400 dark:bg-green-500/20 dark:text-green-200">
            {activeWord}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
