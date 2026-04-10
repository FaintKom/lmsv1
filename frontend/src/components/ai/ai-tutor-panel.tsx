"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Sparkles, Send, X, Trash2, ChevronDown } from "lucide-react";
import { useAiTutorStore, type ChatMessage } from "@/stores/ai-tutor-store";
import { MathRenderer } from "@/components/common/math-renderer";
import { useTranslation } from "@/lib/i18n/context";

interface AiTutorPanelProps {
  context?: {
    type: "lesson" | "exercise" | "sat" | "general";
    lessonId?: string;
    exerciseId?: string;
    lessonTitle?: string;
    exerciseTitle?: string;
  };
}

/* ── Draggable + dismissable FAB hook ───────────────────────────── */
function useDraggableFab() {
  const STORAGE_KEY = "ai-fab-pos";
  const HIDDEN_KEY = "ai-fab-hidden";

  const getInitial = (): { x: number; y: number } | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch { /* ignore */ }
    return null;
  };

  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [hidden, setHidden] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, origX: 0, origY: 0, moved: false });

  // Load persisted state
  useEffect(() => {
    const saved = getInitial();
    if (saved) setPos(saved);
    setHidden(localStorage.getItem(HIDDEN_KEY) === "1");
  }, []);

  const clamp = useCallback((x: number, y: number) => {
    const margin = 8;
    const size = 56;
    return {
      x: Math.max(margin, Math.min(window.innerWidth - size - margin, x)),
      y: Math.max(margin, Math.min(window.innerHeight - size - margin, y)),
    };
  }, []);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const el = e.currentTarget as HTMLElement;
    el.setPointerCapture(e.pointerId);
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      origX: rect.left,
      origY: rect.top,
      moved: false,
    };
    setDragging(true);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragRef.current.moved = true;
    const clamped = clamp(dragRef.current.origX + dx, dragRef.current.origY + dy);
    setPos(clamped);
  }, [dragging, clamp]);

  const onPointerUp = useCallback(() => {
    setDragging(false);
    if (pos) {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch { /* ignore */ }
    }
  }, [pos]);

  const wasDrag = useCallback(() => dragRef.current.moved, []);

  const dismiss = useCallback(() => {
    setHidden(true);
    try { localStorage.setItem(HIDDEN_KEY, "1"); } catch { /* ignore */ }
  }, []);

  const restore = useCallback(() => {
    setHidden(false);
    try { localStorage.removeItem(HIDDEN_KEY); } catch { /* ignore */ }
  }, []);

  return { pos, hidden, dragging, onPointerDown, onPointerMove, onPointerUp, wasDrag, dismiss, restore };
}

export function AiTutorPanel({ context }: AiTutorPanelProps) {
  const { t, locale } = useTranslation();
  const {
    isOpen,
    messages,
    isStreaming,
    remainingMessages,
    toggle,
    setOpen,
    setContext,
    sendMessage,
    clearMessages,
  } = useAiTutorStore();

  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fab = useDraggableFab();

  // Update context when props change
  useEffect(() => {
    if (context) {
      setContext(context);
    }
  }, [context?.type, context?.lessonId, context?.exerciseId, setContext]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Restore FAB when panel opens
  useEffect(() => {
    if (isOpen && fab.hidden) fab.restore();
  }, [isOpen, fab.hidden, fab.restore]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input, locale);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Floating button when closed
  if (!isOpen) {
    if (fab.hidden) return null;

    const fabStyle: React.CSSProperties = fab.pos
      ? { left: fab.pos.x, top: fab.pos.y, right: "auto", bottom: "auto" }
      : {};

    return (
      <div
        className="fixed z-[98] group"
        style={fab.pos ? { left: fab.pos.x, top: fab.pos.y } : { bottom: 24, right: 24 }}
      >
        {/* Dismiss button — visible on hover */}
        <button
          onClick={(e) => { e.stopPropagation(); fab.dismiss(); }}
          className="absolute -top-2 -right-2 z-[99] flex h-5 w-5 items-center justify-center rounded-full bg-slate-700/80 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500"
          aria-label="Hide AI assistant"
        >
          <X className="h-3 w-3" />
        </button>
        <button
          onPointerDown={fab.onPointerDown}
          onPointerMove={fab.onPointerMove}
          onPointerUp={(e) => {
            fab.onPointerUp();
            if (!fab.wasDrag()) toggle();
          }}
          className={`flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg shadow-green-500/30 transition-all hover:shadow-xl hover:shadow-green-500/40 ${
            fab.dragging ? "scale-110 cursor-grabbing" : "cursor-grab hover:scale-110"
          }`}
          style={{ touchAction: "none" }}
          aria-label={t("ai.title")}
        >
          <Sparkles className="h-6 w-6 pointer-events-none" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-20 right-2 left-2 z-[98] flex max-h-[75vh] flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-black/10 dark:border-white/10 dark:bg-[#2C2C2C] dark:shadow-black/30 md:bottom-4 md:left-auto md:right-6 md:h-[540px] md:w-[380px] md:max-h-none">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200/60 bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-white" />
          <span className="text-sm font-semibold text-white">{t("ai.title")}</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white"
              title={t("ai.clear")}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-white/70 hover:bg-white/20 hover:text-white"
            title={t("ai.close")}
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-100 to-green-100 dark:from-green-900/30 dark:to-emerald-900/30 mb-3">
              <Sparkles className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t("ai.welcome")}
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} isStreaming={isStreaming} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Remaining messages indicator */}
      {remainingMessages !== null && remainingMessages <= 10 && (
        <div className="px-4 py-1 text-center text-xs text-amber-600 dark:text-amber-400">
          {t("ai.remaining").replace("{count}", String(remainingMessages))}
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200/60 p-3 dark:border-white/10">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t("ai.placeholder")}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:border-green-400 focus:outline-none focus:ring-2 focus:ring-green-400/20 dark:border-white/10 dark:bg-[#1E1E1E] dark:text-slate-100 dark:placeholder-slate-500 dark:focus:border-green-500"
            style={{ maxHeight: 80 }}
            disabled={isStreaming}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white transition-all hover:bg-green-700 disabled:opacity-40 disabled:hover:bg-green-600"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const { t } = useTranslation();
  const isUser = message.role === "user";
  const isEmpty = !message.content && !isUser;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-green-600 text-white"
            : "bg-slate-100 text-slate-800 dark:bg-white/5 dark:text-slate-200"
        }`}
      >
        {isEmpty && isStreaming ? (
          <span className="inline-flex items-center gap-1 text-slate-400 dark:text-slate-500">
            <span className="animate-pulse">{t("ai.thinking")}</span>
          </span>
        ) : isUser ? (
          <span>{message.content}</span>
        ) : (
          <MathRenderer content={message.content} />
        )}
      </div>
    </div>
  );
}

export default AiTutorPanel;
