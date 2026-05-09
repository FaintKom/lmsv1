"use client";
import { useState, useRef, useEffect } from "react";

interface DialogueOption {
 id: string;
 text: string;
 is_correct?: boolean;
}

interface DialogueMessage {
 speaker: string;
 text: string;
 options?: DialogueOption[];
}

interface DialogueConfig {
 context?: string;
 messages?: DialogueMessage[];
}

interface Props {
 config: DialogueConfig;
 onSubmit: (answers: Record<string, unknown>) => void;
}

function getSpeakerColor(speaker: string): string {
 const colors = [
 "bg-info",
 "bg-primary",
 "bg-primary-soft",
 "bg-coral-500",
 "",
 "bg-info-soft",
 ];
 let hash = 0;
 for (let i = 0; i < speaker.length; i++) {
 hash = speaker.charCodeAt(i) + ((hash << 5) - hash);
 }
 return colors[Math.abs(hash) % colors.length];
}

function isUserSpeaker(speaker: string): boolean {
 const lower = speaker.toLowerCase();
 return lower === "you" || lower === "student" || lower === "user" || lower === "learner";
}

export default function DialogueExercise({ config, onSubmit }: Props) {
 const messages = config.messages || [];

 // selections: { messageIndex: optionId }
 const [selections, setSelections] = useState<Record<string, string>>({});
 const [visibleUpTo, setVisibleUpTo] = useState(0);
 const [submitted, setSubmitted] = useState(false);
 const chatEndRef = useRef<HTMLDivElement>(null);

 // Count total choices needed
 const choiceIndices = messages
 .map((msg, i) => (msg.options && msg.options.length > 0 ? i : -1))
 .filter((i) => i >= 0);
 const totalChoices = choiceIndices.length;
 const madeChoices = Object.keys(selections).length;

 // Find the current "blocking" choice index (the first choice message at or before visibleUpTo that hasn't been answered)
 const currentChoiceIndex = choiceIndices.find(
 (i) => i <= visibleUpTo && !selections[String(i)]
 );

 // On mount or when visibleUpTo changes, auto-advance through non-choice messages
 useEffect(() => {
 let idx = visibleUpTo;
 // Auto-advance through messages that don't have choices (or already have a selection)
 while (idx < messages.length - 1) {
 const msg = messages[idx];
 const hasChoices = msg.options && msg.options.length > 0;
 if (hasChoices && !selections[String(idx)]) {
 // Stop here, need user choice
 break;
 }
 idx++;
 }
 if (idx !== visibleUpTo) {
 setVisibleUpTo(idx);
 }
 // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [visibleUpTo, selections]);

 // Scroll to bottom when new messages appear
 useEffect(() => {
 chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
 }, [visibleUpTo, selections]);

 const handleChoice = (messageIndex: number, optionId: string) => {
 if (submitted) return;
 setSelections((prev) => ({ ...prev, [String(messageIndex)]: optionId }));
 // Advance past this message
 if (messageIndex < messages.length - 1) {
 setVisibleUpTo(messageIndex + 1);
 }
 };

 const isFinished = madeChoices >= totalChoices && visibleUpTo >= messages.length - 1;

 const handleSubmit = () => {
 setSubmitted(true);
 onSubmit({ selections });
 };

 // After submit, compute correctness
 const getChoiceResult = (msgIndex: number): boolean | null => {
 if (!submitted) return null;
 const selectedId = selections[String(msgIndex)];
 if (!selectedId) return null;
 const msg = messages[msgIndex];
 const correct = msg.options?.find((o) => o.is_correct);
 return correct?.id === selectedId;
 };

 const correctCount = submitted
 ? choiceIndices.filter((i) => getChoiceResult(i) === true).length
 : 0;

 return (
 <div className="space-y-4">
 {/* Context */}
 {config.context && (
 <div className="rounded-lg bg-sun-50 border border-warning px-5 py-3">
 <p className="text-sm text-warning-fg font-medium">
 {"\uD83C\uDFAD"} {config.context}
 </p>
 </div>
 )}

 {/* Progress dots */}
 {totalChoices > 1 && (
 <div className="flex items-center gap-2">
 <div className="flex gap-1.5">
 {choiceIndices.map((ci, i) => {
 const result = getChoiceResult(ci);
 return (
 <div
 key={i}
 className={`h-2 w-2 rounded-pill transition-all duration-300 ${
 result === true
 ? "bg-primary w-3"
 : result === false
 ? "bg-danger-soft w-3"
 : selections[String(ci)]
 ? "bg-primary"
 : "bg-ink-200 "
 }`}
 />
 );
 })}
 </div>
 <span className="text-xs font-medium text-text-subtle">
 {madeChoices}/{totalChoices} responses
 </span>
 </div>
 )}

 {/* Chat area */}
 <div className="rounded-lg border border-border-strong bg-surface-2 shadow-sm overflow-hidden">
 <div className="p-4 space-y-3 max-h-[450px] overflow-y-auto">
 {messages.map((msg, idx) => {
 if (idx > visibleUpTo) return null;

 const isUser = isUserSpeaker(msg.speaker);
 const hasChoices = msg.options && msg.options.length > 0;
 const selectedId = selections[String(idx)];
 const selectedOption = msg.options?.find((o) => o.id === selectedId);
 const choiceResult = getChoiceResult(idx);

 // For user messages that have choices: show selected choice as the bubble text
 const displayText = isUser && selectedOption ? selectedOption.text : msg.text;

 // Don't show the message bubble if it's a user message with choices and no selection yet
 if (isUser && hasChoices && !selectedId) {
 return null;
 }

 return (
 <div
 key={idx}
 className={`flex ${isUser ? "justify-end" : "justify-start"} animate-[fadeIn_0.3s_ease-out]`}
 >
 {/* Avatar for non-user */}
 {!isUser && (
 <div
 className={`flex-shrink-0 w-9 h-9 rounded-pill ${getSpeakerColor(msg.speaker)} flex items-center justify-center text-white text-xs font-bold mr-2 mt-1 shadow-sm`}
 >
 {msg.speaker.charAt(0).toUpperCase()}
 </div>
 )}

 <div className={`max-w-[78%] ${isUser ? "items-end" : "items-start"}`}>
 {/* Speaker name */}
 {!isUser && (
 <p className="text-[10px] font-semibold text-text-subtle mb-1 ml-1">
 {msg.speaker}
 </p>
 )}

 {/* Bubble */}
 <div
 className={`rounded-lg px-4 py-3 text-sm leading-relaxed shadow-sm ${
 isUser
 ? choiceResult === true
 ? "bg-primary text-white"
 : choiceResult === false
 ? "bg-danger text-white"
 : "bg-primary text-white"
 : "bg-paper-2 border border-border text-ink-700 "
 }`}
 >
 {displayText}
 </div>

 {/* Show correct answer if user was wrong */}
 {choiceResult === false && (
 <p className="text-[11px] text-danger-fg font-medium mt-1 ml-1">
 Correct: {msg.options?.find((o) => o.is_correct)?.text}
 </p>
 )}
 </div>
 </div>
 );
 })}

 {/* Choice buttons for current blocking choice */}
 {!submitted && currentChoiceIndex !== undefined && (
 <div className="space-y-2 pl-11 pt-2">
 <p className="text-[11px] font-semibold uppercase tracking-wider text-text-subtle ">
 Choose your response
 </p>
 {messages[currentChoiceIndex].options?.map((opt) => (
 <button
 key={opt.id}
 onClick={() => handleChoice(currentChoiceIndex, opt.id)}
 className="w-full text-left rounded-lg border-2 border-primary-soft bg-paper-2 px-4 py-3 text-sm font-medium text-ink-700 transition-all duration-200 $1:border-primary hover:bg-success-soft hover:shadow-sm active:scale-[0.98]"
 >
 {opt.text}
 </button>
 ))}
 </div>
 )}

 <div ref={chatEndRef} />
 </div>
 </div>

 {/* Result summary */}
 {submitted && (
 <div
 className={`rounded-lg px-5 py-3 text-sm font-semibold ${
 correctCount === totalChoices
 ? "bg-success-soft text-success-fg "
 : "bg-sun-50 text-warning-fg "
 }`}
 >
 {correctCount === totalChoices
 ? "Perfect dialogue! All responses correct!"
 : `${correctCount} of ${totalChoices} responses correct.`}
 </div>
 )}

 {/* Submit button */}
 {isFinished && !submitted && (
 <button
 onClick={handleSubmit}
 className="w-full rounded-lg bg-primary px-6 py-3.5 text-base font-semibold text-white shadow-md transition-all duration-200 $1:bg-primary-hover hover:shadow-lg active:scale-[0.98]"
 >
 Complete Dialogue
 </button>
 )}
 </div>
 );
}
