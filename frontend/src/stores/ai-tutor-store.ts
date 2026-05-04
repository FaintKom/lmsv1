import { create } from "zustand";
import apiClient from "@/lib/api-client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

interface AiTutorContext {
  type: "lesson" | "exercise" | "sat" | "general";
  lessonId?: string;
  exerciseId?: string;
  lessonTitle?: string;
  exerciseTitle?: string;
}

interface AiTutorState {
  isOpen: boolean;
  messages: ChatMessage[];
  isStreaming: boolean;
  context: AiTutorContext;
  remainingMessages: number | null;

  setOpen: (open: boolean) => void;
  toggle: () => void;
  setContext: (ctx: AiTutorContext) => void;
  sendMessage: (text: string, language: string) => Promise<void>;
  clearMessages: () => void;
}

let msgCounter = 0;

export const useAiTutorStore = create<AiTutorState>((set, get) => ({
  isOpen: false,
  messages: [],
  isStreaming: false,
  context: { type: "general" },
  remainingMessages: null,

  setOpen: (open) => set({ isOpen: open }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  setContext: (ctx) => set({ context: ctx }),

  clearMessages: () => set({ messages: [] }),

  sendMessage: async (text, language) => {
    const { context, messages, isStreaming } = get();
    if (isStreaming || !text.trim()) return;

    const userMsg: ChatMessage = {
      id: `msg-${++msgCounter}`,
      role: "user",
      content: text.trim(),
      timestamp: Date.now(),
    };

    const assistantMsg: ChatMessage = {
      id: `msg-${++msgCounter}`,
      role: "assistant",
      content: "",
      timestamp: Date.now(),
    };

    set({
      messages: [...messages, userMsg, assistantMsg],
      isStreaming: true,
    });

    // Build history from last 6 messages
    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const resp = await fetch(
        `${apiClient.defaults.baseURL}/ai/chat`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("access_token")}`,
          },
          body: JSON.stringify({
            message: text.trim(),
            context_type: context.type,
            lesson_id: context.lessonId || null,
            exercise_id: context.exerciseId || null,
            lesson_title: context.lessonTitle || null,
            exercise_title: context.exerciseTitle || null,
            language,
            history,
          }),
        }
      );

      if (resp.status === 429) {
        set((s) => ({
          messages: s.messages.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: "⚠️ Rate limit reached. Try again in an hour." }
              : m
          ),
          isStreaming: false,
          remainingMessages: 0,
        }));
        return;
      }

      if (!resp.ok || !resp.body) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.done) {
              if (data.remaining !== undefined) {
                set({ remainingMessages: data.remaining });
              }
              continue;
            }
            if (data.text) {
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === assistantMsg.id
                    ? { ...m, content: m.content + data.text }
                    : m
                ),
              }));
            }
          } catch {
            // skip malformed JSON
          }
        }
      }
    } catch (err) {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: "⚠️ Could not reach AI Tutor. Please try again." }
            : m
        ),
      }));
    } finally {
      set({ isStreaming: false });
    }
  },
}));
