"use client";
import { useState, useRef, useCallback } from "react";

interface Pin {
  label: string;
  x: number;
  y: number;
  tolerance?: number;
}

interface MapPinDropConfig {
  image_url?: string;
  instructions?: string;
  pins?: Pin[];
}

interface Props {
  config: MapPinDropConfig;
  onSubmit: (answers: Record<string, unknown>) => void;
}

interface PlacedPin {
  x: number;
  y: number;
}

export default function MapPinDropExercise({ config, onSubmit }: Props) {
  const pins = config.pins || [];
  const imageUrl = config.image_url || "";
  const instructions = config.instructions || "Drop pins on the correct locations.";

  const [currentPinIndex, setCurrentPinIndex] = useState(0);
  const [placedPins, setPlacedPins] = useState<(PlacedPin | null)[]>(() => pins.map(() => null));
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState<boolean[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (submitted || currentPinIndex >= pins.length) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      const updated = [...placedPins];
      updated[currentPinIndex] = { x, y };
      setPlacedPins(updated);

      if (currentPinIndex < pins.length - 1) {
        setCurrentPinIndex(currentPinIndex + 1);
      }
    },
    [submitted, currentPinIndex, pins.length, placedPins]
  );

  const handleSubmit = () => {
    const r = pins.map((pin, i) => {
      const placed = placedPins[i];
      if (!placed) return false;
      const dx = placed.x - pin.x;
      const dy = placed.y - pin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      return dist <= (pin.tolerance || 30);
    });
    setResults(r);
    setSubmitted(true);
    onSubmit({
      pins: placedPins.map((p) =>
        p ? { x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10 } : { x: 0, y: 0 }
      ),
    });
  };

  const allPlaced = placedPins.every((p) => p !== null);
  const correctCount = results.filter(Boolean).length;

  if (!pins.length) {
    return <p className="text-sm text-text-muted">No pins configured.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg bg-info-soft px-4 py-3 text-sm text-info-fg">{instructions}</div>

      {!submitted && (
        <div className="flex flex-wrap gap-2">
          {pins.map((pin, i) => {
            const isPlaced = placedPins[i] !== null;
            const isCurrent = i === currentPinIndex;
            return (
              <button
                key={i}
                onClick={() => setCurrentPinIndex(i)}
                className={`rounded-pill border-2 px-3 py-1.5 text-xs font-medium transition-all ${
                  isCurrent
                    ? "border-primary bg-primary text-white"
                    : isPlaced
                    ? "border-primary bg-success-soft text-success-fg"
                    : "border-border-strong bg-paper-2 text-text-muted"
                }`}
              >
                📍 {pin.label}
              </button>
            );
          })}
        </div>
      )}

      <div
        ref={containerRef}
        onClick={handleClick}
        className={`relative overflow-hidden rounded-xl border-2 border-border-strong shadow-sm ${submitted ? "" : "cursor-crosshair"}`}
        style={{ minHeight: "300px" }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="Map" className="h-full w-full object-contain" draggable={false} />
        ) : (
          <div className="flex h-[300px] items-center justify-center bg-surface-2 text-text-muted text-sm">
            Click to place pins on this area
          </div>
        )}

        {placedPins.map((p, i) => {
          if (!p) return null;
          const isCorrect = submitted ? results[i] : undefined;
          return (
            <div
              key={`placed-${i}`}
              className="absolute -translate-x-1/2 -translate-y-full pointer-events-none"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <div className="flex flex-col items-center">
                <span
                  className={`rounded-pill px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${
                    isCorrect === true ? "bg-primary text-white" : isCorrect === false ? "bg-danger text-white" : "bg-ink-700 text-white"
                  }`}
                >
                  {pins[i].label}
                </span>
                <svg
                  className={`h-6 w-5 ${isCorrect === true ? "text-primary" : isCorrect === false ? "text-danger" : "text-ink-700"}`}
                  viewBox="0 0 20 24"
                  fill="currentColor"
                >
                  <path d="M10 0C4.5 0 0 4.5 0 10c0 7.5 10 14 10 14s10-6.5 10-14C20 4.5 15.5 0 10 0zm0 13c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" />
                </svg>
              </div>
            </div>
          );
        })}

        {submitted &&
          pins.map((pin, i) => {
            if (results[i]) return null;
            return (
              <div
                key={`correct-${i}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
              >
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-dashed border-primary bg-success-soft/50">
                  <span className="text-[8px] text-primary font-bold">✓</span>
                </div>
              </div>
            );
          })}
      </div>

      {!submitted ? (
        <button
          onClick={handleSubmit}
          disabled={!allPlaced}
          className="w-full rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 hover:bg-primary-hover hover:shadow-lg active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Check Pins
        </button>
      ) : (
        <div
          className={`rounded-lg px-5 py-3 text-sm font-semibold ${
            correctCount === pins.length ? "bg-success-soft text-success-fg" : "bg-sun-50 text-warning-fg"
          }`}
        >
          {correctCount === pins.length
            ? "Perfect! All pins placed correctly!"
            : `${correctCount} of ${pins.length} pins correct.`}
        </div>
      )}
    </div>
  );
}
