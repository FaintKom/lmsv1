"use client";

import { useState } from "react";
import { Calculator, X, Maximize2, Minimize2 } from "lucide-react";

const CALC_MODES = [
 { key: "graphing", label: "Graphing", url: "https://www.desmos.com/testing/cb-sat-ap/graphing" },
 { key: "scientific", label: "Scientific", url: "https://www.desmos.com/testing/cb-sat-ap/scientific" },
] as const;

interface DesmosCalculatorProps {
 open: boolean;
 onToggle: () => void;
}

export default function DesmosCalculator({ open, onToggle }: DesmosCalculatorProps) {
 const [expanded, setExpanded] = useState(false);
 const [mode, setMode] = useState(0); // 0 = graphing, 1 = scientific

 if (!open) {
 return (
 <button
 onClick={onToggle}
 className="fixed bottom-20 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-pill bg-primary text-white shadow-lg transition-transform hover:scale-110 hover:bg-primary-hover"
 title="Open Calculator"
 >
 <Calculator className="h-5 w-5" />
 </button>
 );
 }

 return (
 <div
 className={`fixed z-50 flex flex-col border border-border-strong bg-paper-2 shadow-2xl transition-all duration-200 ${
 expanded
 ? "inset-4 rounded-lg"
 : "bottom-0 right-0 h-[70vh] sm:h-[480px] w-full sm:w-[380px] rounded-tl-2xl border-l border-t"
 }`}
 >
 <div className="flex items-center justify-between border-b border-border-strong px-3 py-2 shrink-0">
 <div className="flex items-center gap-2">
 <Calculator className="h-4 w-4 text-text-muted" />
 {/* Mode toggle */}
 <div className="flex rounded-lg bg-ink-100 p-0.5 ">
 {CALC_MODES.map((m, i) => (
 <button
 key={m.key}
 onClick={() => setMode(i)}
 className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors ${
 mode === i
 ? "bg-paper-2 text-ink-700 shadow-sm "
 : "text-text-subtle hover:text-text-muted "
 }`}
 >
 {m.label}
 </button>
 ))}
 </div>
 </div>
 <div className="flex items-center gap-1">
 <button
 onClick={() => setExpanded(!expanded)}
 className="rounded-lg p-1 text-text-subtle hover:bg-ink-100 hover:text-text-muted "
 title={expanded ? "Minimize" : "Fullscreen"}
 >
 {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
 </button>
 <button
 onClick={() => { setExpanded(false); onToggle(); }}
 className="rounded-lg p-1 text-text-subtle hover:bg-ink-100 hover:text-text-muted "
 title="Close"
 >
 <X className="h-4 w-4" />
 </button>
 </div>
 </div>
 <iframe
 src={CALC_MODES[mode].url}
 className="flex-1 border-0"
 title={`Desmos ${CALC_MODES[mode].label} Calculator`}
 allow="clipboard-write"
 />
 </div>
 );
}
