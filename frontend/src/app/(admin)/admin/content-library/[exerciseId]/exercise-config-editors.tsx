"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Upload, MapPin as MapPinIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
 ssr: false,
 loading: () => (
 <div className="flex h-32 items-center justify-center rounded-lg border border-border-strong bg-surface-2 text-xs text-text-subtle">
 Loading editor…
 </div>
 ),
});
import apiClient from "@/lib/api-client";

type EditorProps = {
 config: Record<string, unknown>;
 onChange: (c: Record<string, unknown>) => void;
};

const inputCls =
 "w-full rounded-lg border border-border-strong bg-paper-2 px-3 py-2 text-sm text-ink-700 outline-none focus:border-primary focus:ring-2 focus:ring-primary-soft";
const labelCls = "mb-1 block text-sm font-medium text-ink-700";
const hintCls = "mt-1 text-xs text-text-muted";

// ─── True / False ────────────────────────────────────────────────────

export function TrueFalseConfigEditor({ config, onChange }: EditorProps) {
 const statement = (config.statement as string) || "";
 const correct = config.correct_answer as boolean ?? true;

 return (
   <div className="space-y-4">
     <div>
       <label className={labelCls}>Statement</label>
       <textarea
         value={statement}
         onChange={(e) => onChange({ ...config, statement: e.target.value })}
         placeholder="Enter a statement that is either true or false..."
         rows={2}
         className={inputCls}
       />
     </div>
     <div>
       <label className={labelCls}>Correct Answer</label>
       <div className="flex gap-3 mt-1">
         <button
           type="button"
           onClick={() => onChange({ ...config, correct_answer: true })}
           className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
             correct
               ? "border-primary bg-success-soft text-primary"
               : "border-border-strong text-text-muted hover:border-primary-soft"
           }`}
         >
           True
         </button>
         <button
           type="button"
           onClick={() => onChange({ ...config, correct_answer: false })}
           className={`flex-1 rounded-lg border-2 px-4 py-3 text-sm font-semibold transition-all ${
             !correct
               ? "border-danger bg-danger-soft text-danger-fg"
               : "border-border-strong text-text-muted hover:border-danger"
           }`}
         >
           False
         </button>
       </div>
     </div>
   </div>
 );
}

// ─── Fill Blanks ─────────────────────────────────────────────────────

export function FillBlanksConfigEditor({ config, onChange }: EditorProps) {
 const text = (config.text as string) || "";
 const blanks = (config.blanks as string[]) || [];

 const updateBlank = (i: number, val: string) => {
   const next = [...blanks];
   next[i] = val;
   onChange({ ...config, blanks: next });
 };

 const blankCount = (text.match(/___?/g) || []).length;

 const syncBlanks = (newText: string) => {
   const count = (newText.match(/___?/g) || []).length;
   const cur = [...blanks];
   while (cur.length < count) cur.push("");
   onChange({ ...config, text: newText, blanks: cur.slice(0, count) });
 };

 return (
   <div className="space-y-4">
     <div>
       <label className={labelCls}>Sentence with Blanks</label>
       <textarea
         value={text}
         onChange={(e) => syncBlanks(e.target.value)}
         placeholder='Use __ or ___ to mark blanks. E.g.: "Python is a __ language that uses __ for code blocks."'
         rows={3}
         className={inputCls}
       />
       <p className={hintCls}>Use __ (double underscore) to mark each blank position.</p>
     </div>
     {blankCount > 0 && (
       <div>
         <label className={labelCls}>Correct Answers ({blankCount} blanks)</label>
         <div className="space-y-2">
           {Array.from({ length: blankCount }).map((_, i) => (
             <div key={i} className="flex items-center gap-2">
               <span className="flex-shrink-0 w-8 h-8 rounded-full bg-primary-soft flex items-center justify-center text-xs font-bold text-primary">
                 {i + 1}
               </span>
               <input
                 type="text"
                 value={blanks[i] || ""}
                 onChange={(e) => updateBlank(i, e.target.value)}
                 placeholder={`Answer for blank ${i + 1}`}
                 className={inputCls}
               />
             </div>
           ))}
         </div>
       </div>
     )}
   </div>
 );
}

// ─── Matching ────────────────────────────────────────────────────────

export function MatchingConfigEditor({ config, onChange }: EditorProps) {
 const pairs = (config.pairs as { left: string; right: string }[]) || [];

 const updatePair = (i: number, side: "left" | "right", val: string) => {
   const next = pairs.map((p, j) => (j === i ? { ...p, [side]: val } : p));
   onChange({ ...config, pairs: next });
 };

 const addPair = () => onChange({ ...config, pairs: [...pairs, { left: "", right: "" }] });

 const removePair = (i: number) => onChange({ ...config, pairs: pairs.filter((_, j) => j !== i) });

 return (
   <div className="space-y-4">
     <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
       <span>Left Side</span>
       <span />
       <span>Right Side</span>
       <span className="w-9" />
     </div>
     {pairs.map((pair, i) => (
       <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
         <input type="text" value={pair.left} onChange={(e) => updatePair(i, "left", e.target.value)} placeholder="Term" className={inputCls} />
         <span className="text-text-muted text-sm px-1">{"↔"}</span>
         <input type="text" value={pair.right} onChange={(e) => updatePair(i, "right", e.target.value)} placeholder="Match" className={inputCls} />
         {pairs.length > 1 ? (
           <Button variant="ghost" size="sm" onClick={() => removePair(i)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
         ) : <span className="w-9" />}
       </div>
     ))}
     <Button variant="outline" size="sm" onClick={addPair}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Pair</Button>
   </div>
 );
}

// ─── Ordering ────────────────────────────────────────────────────────

export function OrderingConfigEditor({ config, onChange }: EditorProps) {
 const items = (config.items as string[]) || [];

 const updateItem = (i: number, val: string) => {
   const next = [...items]; next[i] = val;
   onChange({ ...config, items: next, correct_order: next });
 };

 const addItem = () => { const next = [...items, ""]; onChange({ ...config, items: next, correct_order: next }); };

 const removeItem = (i: number) => { const next = items.filter((_, j) => j !== i); onChange({ ...config, items: next, correct_order: next }); };

 const moveItem = (from: number, to: number) => {
   if (to < 0 || to >= items.length) return;
   const next = [...items]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved);
   onChange({ ...config, items: next, correct_order: next });
 };

 return (
   <div className="space-y-3">
     <p className={hintCls}>Enter items in the correct order. Students will see them shuffled.</p>
     {items.map((item, i) => (
       <div key={i} className="flex items-center gap-2">
         <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
         <input type="text" value={item} onChange={(e) => updateItem(i, e.target.value)} placeholder={`Step ${i + 1}`} className={`flex-1 ${inputCls}`} />
         <div className="flex flex-col">
           <button type="button" onClick={() => moveItem(i, i - 1)} disabled={i === 0} className="text-text-muted hover:text-ink-700 disabled:opacity-30 text-xs leading-none p-0.5">{"▲"}</button>
           <button type="button" onClick={() => moveItem(i, i + 1)} disabled={i === items.length - 1} className="text-text-muted hover:text-ink-700 disabled:opacity-30 text-xs leading-none p-0.5">{"▼"}</button>
         </div>
         {items.length > 2 && (
           <Button variant="ghost" size="sm" onClick={() => removeItem(i)} className="text-danger-fg flex-shrink-0"><Trash2 className="h-3.5 w-3.5" /></Button>
         )}
       </div>
     ))}
     <Button variant="outline" size="sm" onClick={addItem}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Item</Button>
   </div>
 );
}

// ─── Categorize ──────────────────────────────────────────────────────

export function CategorizeConfigEditor({ config, onChange }: EditorProps) {
 const categories = (config.categories as { name: string; items: string[] }[]) || [];

 const updateCatName = (i: number, name: string) => {
   const next = categories.map((c, j) => (j === i ? { ...c, name } : c));
   onChange({ ...config, categories: next });
 };

 const updateCatItem = (ci: number, ii: number, val: string) => {
   const next = categories.map((c, j) => j === ci ? { ...c, items: c.items.map((item, k) => k === ii ? val : item) } : c);
   onChange({ ...config, categories: next });
 };

 const addItemToCat = (ci: number) => {
   const next = categories.map((c, j) => j === ci ? { ...c, items: [...c.items, ""] } : c);
   onChange({ ...config, categories: next });
 };

 const removeItemFromCat = (ci: number, ii: number) => {
   const next = categories.map((c, j) => j === ci ? { ...c, items: c.items.filter((_, k) => k !== ii) } : c);
   onChange({ ...config, categories: next });
 };

 const addCategory = () => onChange({ ...config, categories: [...categories, { name: "", items: [""] }] });

 const removeCategory = (i: number) => onChange({ ...config, categories: categories.filter((_, j) => j !== i) });

 return (
   <div className="space-y-4">
     <p className={hintCls}>Create categories and add items to each. Students will sort items into the correct categories.</p>
     {categories.map((cat, ci) => (
       <div key={ci} className="rounded-lg border border-border-strong p-4 space-y-3">
         <div className="flex items-center gap-2">
           <input type="text" value={cat.name} onChange={(e) => updateCatName(ci, e.target.value)} placeholder="Category name" className={`flex-1 ${inputCls} font-semibold`} />
           {categories.length > 1 && (
             <Button variant="ghost" size="sm" onClick={() => removeCategory(ci)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
           )}
         </div>
         <div className="space-y-2 pl-4 border-l-2 border-primary-soft">
           {cat.items.map((item, ii) => (
             <div key={ii} className="flex items-center gap-2">
               <input type="text" value={item} onChange={(e) => updateCatItem(ci, ii, e.target.value)} placeholder={`Item ${ii + 1}`} className={`flex-1 ${inputCls}`} />
               {cat.items.length > 1 && (
                 <Button variant="ghost" size="sm" onClick={() => removeItemFromCat(ci, ii)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
               )}
             </div>
           ))}
           <Button variant="ghost" size="sm" onClick={() => addItemToCat(ci)} className="text-primary"><Plus className="mr-1 h-3 w-3" />Add Item</Button>
         </div>
       </div>
     ))}
     <Button variant="outline" size="sm" onClick={addCategory}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Category</Button>
   </div>
 );
}

// ─── Translation ─────────────────────────────────────────────────────

export function TranslationConfigEditor({ config, onChange }: EditorProps) {
 const sourceText = (config.source_text as string) || "";
 const sourceLang = (config.source_language as string) || "English";
 const targetLang = (config.target_language as string) || "Russian";
 const accepted = (config.accepted_answers as string[]) || [];

 const updateAccepted = (i: number, val: string) => { const next = [...accepted]; next[i] = val; onChange({ ...config, accepted_answers: next }); };
 const addAccepted = () => onChange({ ...config, accepted_answers: [...accepted, ""] });
 const removeAccepted = (i: number) => onChange({ ...config, accepted_answers: accepted.filter((_, j) => j !== i) });

 return (
   <div className="space-y-4">
     <div className="grid grid-cols-2 gap-4">
       <div>
         <label className={labelCls}>Source Language</label>
         <input type="text" value={sourceLang} onChange={(e) => onChange({ ...config, source_language: e.target.value })} placeholder="English" className={inputCls} />
       </div>
       <div>
         <label className={labelCls}>Target Language</label>
         <input type="text" value={targetLang} onChange={(e) => onChange({ ...config, target_language: e.target.value })} placeholder="Russian" className={inputCls} />
       </div>
     </div>
     <div>
       <label className={labelCls}>Text to Translate</label>
       <textarea value={sourceText} onChange={(e) => onChange({ ...config, source_text: e.target.value })} placeholder="Enter the text students need to translate..." rows={2} className={inputCls} />
     </div>
     <div>
       <label className={labelCls}>Accepted Answers</label>
       <p className={hintCls}>Add all acceptable translations. Grading uses fuzzy matching (80%+ similarity passes).</p>
       <div className="space-y-2 mt-2">
         {accepted.map((ans, i) => (
           <div key={i} className="flex items-center gap-2">
             <input type="text" value={ans} onChange={(e) => updateAccepted(i, e.target.value)} placeholder={`Accepted translation ${i + 1}`} className={`flex-1 ${inputCls}`} />
             {accepted.length > 1 && (
               <Button variant="ghost" size="sm" onClick={() => removeAccepted(i)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
             )}
           </div>
         ))}
         <Button variant="outline" size="sm" onClick={addAccepted}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Answer</Button>
       </div>
     </div>
   </div>
 );
}

// ─── Sentence Builder ────────────────────────────────────────────────

export function SentenceBuilderConfigEditor({ config, onChange }: EditorProps) {
 const correctOrder = (config.correct_order as string[]) || [];
 const hint = (config.hint as string) || "";

 const updateWord = (i: number, val: string) => { const next = [...correctOrder]; next[i] = val; onChange({ ...config, correct_order: next, words: next }); };
 const addWord = () => { const next = [...correctOrder, ""]; onChange({ ...config, correct_order: next, words: next }); };
 const removeWord = (i: number) => { const next = correctOrder.filter((_, j) => j !== i); onChange({ ...config, correct_order: next, words: next }); };

 return (
   <div className="space-y-4">
     <div>
       <label className={labelCls}>Words in Correct Order</label>
       <p className={hintCls}>Enter words in the correct sentence order. Students will see them shuffled and must arrange them.</p>
       <div className="space-y-2 mt-2">
         {correctOrder.map((word, i) => (
           <div key={i} className="flex items-center gap-2">
             <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
             <input type="text" value={word} onChange={(e) => updateWord(i, e.target.value)} placeholder={`Word ${i + 1}`} className={`flex-1 ${inputCls}`} />
             {correctOrder.length > 2 && (
               <Button variant="ghost" size="sm" onClick={() => removeWord(i)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
             )}
           </div>
         ))}
         <Button variant="outline" size="sm" onClick={addWord}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Word</Button>
       </div>
     </div>
     {correctOrder.length > 0 && (
       <div className="rounded-lg bg-surface-2 p-3">
         <p className="text-xs font-medium text-text-muted mb-1">Preview (correct sentence):</p>
         <p className="text-sm text-ink-700 font-medium">{correctOrder.filter(Boolean).join(" ")}</p>
       </div>
     )}
     <div>
       <label className={labelCls}>Hint (optional)</label>
       <input type="text" value={hint} onChange={(e) => onChange({ ...config, hint: e.target.value })} placeholder="Optional hint for students..." className={inputCls} />
     </div>
   </div>
 );
}

// ─── Dialogue ────────────────────────────────────────────────────────

interface DialogueMessage {
 speaker: string;
 text: string;
 options?: { id: string; text: string; is_correct: boolean }[];
}

export function DialogueConfigEditor({ config, onChange }: EditorProps) {
 const messages = (config.messages as DialogueMessage[]) || [];

 const updateMessage = (i: number, field: string, val: string) => {
   const next = messages.map((m, j) => (j === i ? { ...m, [field]: val } : m));
   onChange({ ...config, messages: next });
 };

 const addMessage = (withOptions: boolean) => {
   const msg: DialogueMessage = { speaker: "", text: "" };
   if (withOptions) {
     msg.options = [
       { id: `opt_${Date.now()}_1`, text: "", is_correct: true },
       { id: `opt_${Date.now()}_2`, text: "", is_correct: false },
     ];
   }
   onChange({ ...config, messages: [...messages, msg] });
 };

 const removeMessage = (i: number) => onChange({ ...config, messages: messages.filter((_, j) => j !== i) });

 const updateOption = (mi: number, oi: number, field: string, val: unknown) => {
   const next = messages.map((m, j) => {
     if (j !== mi || !m.options) return m;
     return { ...m, options: m.options.map((o, k) => {
       if (field === "is_correct") return { ...o, is_correct: k === oi };
       return k === oi ? { ...o, [field]: val } : o;
     }) };
   });
   onChange({ ...config, messages: next });
 };

 const addOption = (mi: number) => {
   const next = messages.map((m, j) => {
     if (j !== mi || !m.options) return m;
     return { ...m, options: [...m.options, { id: `opt_${Date.now()}`, text: "", is_correct: false }] };
   });
   onChange({ ...config, messages: next });
 };

 const removeOption = (mi: number, oi: number) => {
   const next = messages.map((m, j) => {
     if (j !== mi || !m.options) return m;
     return { ...m, options: m.options.filter((_, k) => k !== oi) };
   });
   onChange({ ...config, messages: next });
 };

 return (
   <div className="space-y-4">
     <p className={hintCls}>Build a dialogue flow. Regular messages are displayed as conversation. Messages with options let the student choose a response.</p>
     {messages.map((msg, mi) => (
       <div key={mi} className={`rounded-lg border p-4 space-y-3 ${msg.options ? "border-primary-soft bg-success-soft/20" : "border-border-strong"}`}>
         <div className="flex items-center gap-2">
           <span className="text-xs font-bold text-text-muted">#{mi + 1}</span>
           <input type="text" value={msg.speaker} onChange={(e) => updateMessage(mi, "speaker", e.target.value)} placeholder="Speaker name" className={`w-32 ${inputCls}`} />
           <input type="text" value={msg.text} onChange={(e) => updateMessage(mi, "text", e.target.value)} placeholder="Message text..." className={`flex-1 ${inputCls}`} />
           <Button variant="ghost" size="sm" onClick={() => removeMessage(mi)} className="text-danger-fg flex-shrink-0"><Trash2 className="h-3.5 w-3.5" /></Button>
         </div>
         {msg.options && (
           <div className="pl-6 space-y-2">
             <p className="text-xs font-semibold text-primary">Student choices:</p>
             {msg.options.map((opt, oi) => (
               <div key={oi} className="flex items-center gap-2">
                 <input type="radio" name={`correct_${mi}`} checked={opt.is_correct} onChange={() => updateOption(mi, oi, "is_correct", true)} className="accent-green-600" />
                 <input type="text" value={opt.text} onChange={(e) => updateOption(mi, oi, "text", e.target.value)} placeholder={`Option ${oi + 1}`} className={`flex-1 ${inputCls}`} />
                 {msg.options!.length > 2 && (
                   <Button variant="ghost" size="sm" onClick={() => removeOption(mi, oi)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
                 )}
               </div>
             ))}
             <Button variant="ghost" size="sm" onClick={() => addOption(mi)} className="text-primary"><Plus className="mr-1 h-3 w-3" />Add Option</Button>
           </div>
         )}
       </div>
     ))}
     <div className="flex gap-2">
       <Button variant="outline" size="sm" onClick={() => addMessage(false)}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Message</Button>
       <Button variant="outline" size="sm" onClick={() => addMessage(true)} className="border-primary-soft text-primary"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Choice Point</Button>
     </div>
   </div>
 );
}

// ─── Conjugation ─────────────────────────────────────────────────────

export function ConjugationConfigEditor({ config, onChange }: EditorProps) {
 const verb = (config.verb as string) || "";
 const language = (config.language as string) || "";
 const tense = (config.tense as string) || "";
 const table = (config.table as { pronoun: string; correct: string }[]) || [];

 const PRESETS: Record<string, string[]> = {
   Spanish: ["yo", "tú", "él/ella", "nosotros", "vosotros", "ellos/ellas"],
   French: ["je", "tu", "il/elle", "nous", "vous", "ils/elles"],
   German: ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"],
   Russian: ["я", "ты", "он/она", "мы", "вы", "они"],
   Italian: ["io", "tu", "lui/lei", "noi", "voi", "loro"],
   Portuguese: ["eu", "tu", "ele/ela", "nós", "vós", "eles/elas"],
 };
 const KNOWN_LANGS = Object.keys(PRESETS);

 const updateRow = (i: number, field: "pronoun" | "correct", val: string) => {
   const next = table.map((r, j) => (j === i ? { ...r, [field]: val } : r));
   onChange({ ...config, table: next });
 };

 const addRow = () => onChange({ ...config, table: [...table, { pronoun: "", correct: "" }] });
 const removeRow = (i: number) => onChange({ ...config, table: table.filter((_, j) => j !== i) });

 /** Apply preset; preserve any existing `correct` value when pronoun matches. */
 const applyPreset = (lang: string) => {
   const pronouns = PRESETS[lang];
   if (!pronouns) return;
   onChange({
     ...config,
     language: lang,
     table: pronouns.map((p) => ({
       pronoun: p,
       correct: table.find((r) => r.pronoun === p)?.correct || "",
     })),
   });
 };

 return (
   <div className="space-y-4">
     <div className="grid grid-cols-3 gap-4">
       <div>
         <label className={labelCls}>Verb</label>
         <input type="text" value={verb} onChange={(e) => onChange({ ...config, verb: e.target.value })} placeholder="e.g., hablar" className={inputCls} />
       </div>
       <div>
         <label className={labelCls}>Language</label>
         <input
           type="text"
           list="conjugation-langs"
           value={language}
           onChange={(e) => onChange({ ...config, language: e.target.value })}
           placeholder="e.g., Spanish"
           className={inputCls}
         />
         <datalist id="conjugation-langs">
           {KNOWN_LANGS.map((l) => (
             <option key={l} value={l} />
           ))}
         </datalist>
       </div>
       <div>
         <label className={labelCls}>Tense (optional)</label>
         <input type="text" value={tense} onChange={(e) => onChange({ ...config, tense: e.target.value })} placeholder="e.g., present" className={inputCls} />
       </div>
     </div>

     {/* Preset bar — always visible so methodist can rebuild pronoun table anytime. */}
     <div className="rounded-lg border border-dashed border-border-strong bg-surface-2 p-3">
       <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted">
         Load pronoun preset
       </p>
       <div className="flex flex-wrap gap-1.5">
         {KNOWN_LANGS.map((lang) => (
           <Button
             key={lang}
             variant={language === lang ? "default" : "outline"}
             size="sm"
             onClick={() => applyPreset(lang)}
           >
             {lang}
           </Button>
         ))}
       </div>
       <p className="mt-1 text-[11px] text-text-subtle">
         Replaces the pronoun list with the 6 standard pronouns for the language. Existing correct forms for matching pronouns are kept.
       </p>
     </div>

     <div>
       <label className={labelCls}>Conjugation Table</label>
       <div className="space-y-2">
         <div className="grid grid-cols-[1fr_1fr_auto] gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
           <span>Pronoun</span><span>Correct Form</span><span className="w-9" />
         </div>
         {table.map((row, i) => (
           <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
             <input type="text" value={row.pronoun} onChange={(e) => updateRow(i, "pronoun", e.target.value)} placeholder="Pronoun" className={inputCls} />
             <input type="text" value={row.correct} onChange={(e) => updateRow(i, "correct", e.target.value)} placeholder="Correct conjugation" className={inputCls} />
             {table.length > 1 ? (
               <Button variant="ghost" size="sm" onClick={() => removeRow(i)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
             ) : <span className="w-9" />}
           </div>
         ))}
         <Button variant="outline" size="sm" onClick={addRow}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Row</Button>
       </div>
     </div>
   </div>
 );
}

// ─── Reading Comprehension ───────────────────────────────────────────

interface ReadingQuestion {
 text: string;
 type: "multiple_choice" | "text";
 options?: { id: string; text: string; is_correct: boolean }[];
 correct_answer?: string;
}

export function ReadingConfigEditor({ config, onChange }: EditorProps) {
 const passage = (config.passage as string) || "";
 const questions = (config.questions as ReadingQuestion[]) || [];

 const updateQuestion = (i: number, field: string, val: unknown) => {
   const next = questions.map((q, j) => (j === i ? { ...q, [field]: val } : q));
   onChange({ ...config, questions: next });
 };

 const addQuestion = (type: "multiple_choice" | "text") => {
   const q: ReadingQuestion = { text: "", type };
   if (type === "multiple_choice") {
     q.options = [{ id: `opt_${Date.now()}_1`, text: "", is_correct: true }, { id: `opt_${Date.now()}_2`, text: "", is_correct: false }];
   } else {
     q.correct_answer = "";
   }
   onChange({ ...config, questions: [...questions, q] });
 };

 const removeQuestion = (i: number) => onChange({ ...config, questions: questions.filter((_, j) => j !== i) });

 const updateOption = (qi: number, oi: number, field: string, val: unknown) => {
   const next = questions.map((q, j) => {
     if (j !== qi || !q.options) return q;
     return { ...q, options: q.options.map((o, k) => {
       if (field === "is_correct") return { ...o, is_correct: k === oi };
       return k === oi ? { ...o, [field]: val } : o;
     }) };
   });
   onChange({ ...config, questions: next });
 };

 const addOption = (qi: number) => {
   const next = questions.map((q, j) => {
     if (j !== qi || !q.options) return q;
     return { ...q, options: [...q.options, { id: `opt_${Date.now()}`, text: "", is_correct: false }] };
   });
   onChange({ ...config, questions: next });
 };

 const removeOption = (qi: number, oi: number) => {
   const next = questions.map((q, j) => {
     if (j !== qi || !q.options) return q;
     return { ...q, options: q.options.filter((_, k) => k !== oi) };
   });
   onChange({ ...config, questions: next });
 };

 return (
   <div className="space-y-5">
     <div>
       <label className={labelCls}>Reading Passage</label>
       <textarea value={passage} onChange={(e) => onChange({ ...config, passage: e.target.value })} placeholder="Enter the reading passage that students will analyze..." rows={6} className={inputCls} />
     </div>

     <div>
       <div className="flex items-center justify-between mb-3">
         <label className={labelCls}>Questions ({questions.length})</label>
         <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => addQuestion("multiple_choice")}><Plus className="mr-1 h-3.5 w-3.5" />Multiple Choice</Button>
           <Button variant="outline" size="sm" onClick={() => addQuestion("text")}><Plus className="mr-1 h-3.5 w-3.5" />Text Answer</Button>
         </div>
       </div>

       <div className="space-y-4">
         {questions.map((q, qi) => (
           <div key={qi} className="rounded-lg border border-border-strong p-4 space-y-3">
             <div className="flex items-center gap-2">
               <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center text-xs font-bold text-primary">{qi + 1}</span>
               <input type="text" value={q.text} onChange={(e) => updateQuestion(qi, "text", e.target.value)} placeholder="Question text..." className={`flex-1 ${inputCls}`} />
               <span className="text-xs text-text-muted px-2 py-1 rounded bg-surface-2">{q.type === "multiple_choice" ? "MC" : "Text"}</span>
               <Button variant="ghost" size="sm" onClick={() => removeQuestion(qi)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
             </div>

             {q.type === "multiple_choice" && q.options && (
               <div className="pl-9 space-y-2">
                 {q.options.map((opt, oi) => (
                   <div key={oi} className="flex items-center gap-2">
                     <input type="radio" name={`reading_correct_${qi}`} checked={opt.is_correct} onChange={() => updateOption(qi, oi, "is_correct", true)} className="accent-green-600" />
                     <input type="text" value={opt.text} onChange={(e) => updateOption(qi, oi, "text", e.target.value)} placeholder={`Option ${oi + 1}`} className={`flex-1 ${inputCls}`} />
                     {q.options!.length > 2 && (
                       <Button variant="ghost" size="sm" onClick={() => removeOption(qi, oi)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
                     )}
                   </div>
                 ))}
                 <Button variant="ghost" size="sm" onClick={() => addOption(qi)} className="text-primary"><Plus className="mr-1 h-3 w-3" />Add Option</Button>
               </div>
             )}

             {q.type === "text" && (
               <div className="pl-9">
                 <input type="text" value={q.correct_answer || ""} onChange={(e) => updateQuestion(qi, "correct_answer", e.target.value)} placeholder="Correct answer (case-insensitive)" className={inputCls} />
               </div>
             )}
           </div>
         ))}
       </div>
     </div>
   </div>
 );
}

// ─── SRS Flashcard ──────────────────────────────────────────────────

export function SRSFlashcardConfigEditor({ config, onChange }: EditorProps) {
 const cards = (config.cards as { front: string; back: string }[]) || [];
 const mastery = (config.mastery_threshold as number) ?? 0.7;

 const updateCard = (i: number, side: "front" | "back", val: string) => {
   const next = cards.map((c, j) => (j === i ? { ...c, [side]: val } : c));
   onChange({ ...config, cards: next });
 };

 const addCard = () => onChange({ ...config, cards: [...cards, { front: "", back: "" }] });
 const removeCard = (i: number) => onChange({ ...config, cards: cards.filter((_, j) => j !== i) });

 return (
   <div className="space-y-4">
     <p className={hintCls}>Create flashcards with front (question/term) and back (answer/definition). Students self-rate each card.</p>
     <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 text-xs font-semibold text-text-muted uppercase tracking-wider px-1">
       <span>Front</span><span /><span>Back</span><span className="w-9" />
     </div>
     {cards.map((card, i) => (
       <div key={i} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-center">
         <input type="text" value={card.front} onChange={(e) => updateCard(i, "front", e.target.value)} placeholder="Term / question" className={inputCls} />
         <span className="text-text-muted text-sm px-1">{"→"}</span>
         <input type="text" value={card.back} onChange={(e) => updateCard(i, "back", e.target.value)} placeholder="Definition / answer" className={inputCls} />
         {cards.length > 1 ? (
           <Button variant="ghost" size="sm" onClick={() => removeCard(i)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
         ) : <span className="w-9" />}
       </div>
     ))}
     <Button variant="outline" size="sm" onClick={addCard}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Card</Button>
     <div>
       <label className={labelCls}>Mastery Threshold</label>
       <div className="flex items-center gap-3">
         <input
           type="range" min="0.5" max="1" step="0.1"
           value={mastery}
           onChange={(e) => onChange({ ...config, mastery_threshold: parseFloat(e.target.value) })}
           className="flex-1"
         />
         <span className="text-sm font-medium text-ink-700 w-12 text-right">{Math.round(mastery * 100)}%</span>
       </div>
       <p className={hintCls}>Student must rate this % of cards as &quot;good&quot; or &quot;easy&quot; to pass.</p>
     </div>
   </div>
 );
}

// ─── Crossword ──────────────────────────────────────────────────────

interface CrosswordWord {
 word: string;
 clue: string;
 row: number;
 col: number;
 direction: "across" | "down";
}

export function CrosswordConfigEditor({ config, onChange }: EditorProps) {
 const words = (config.words as CrosswordWord[]) || [];
 const gridSize = (config.grid_size as number) || 10;
 const [placingIdx, setPlacingIdx] = useState<number | null>(null);

 const updateWord = (i: number, field: string, val: unknown) => {
   const next = words.map((w, j) => (j === i ? { ...w, [field]: val } : w));
   onChange({ ...config, words: next });
 };

 /** Batch-update row + col (avoids stale state from two sequential updateWord calls). */
 const setWordPosition = (i: number, row: number, col: number) => {
   const next = words.map((w, j) => (j === i ? { ...w, row, col } : w));
   onChange({ ...config, words: next });
 };

 const addWord = () => onChange({
   ...config,
   words: [...words, { word: "", clue: "", row: 0, col: 0, direction: "across" as const }],
 });

 const removeWord = (i: number) => {
   if (placingIdx === i) setPlacingIdx(null);
   onChange({ ...config, words: words.filter((_, j) => j !== i) });
 };

 /** Build occupancy map: 'r:c' → list of {letter, wordIdx}. */
 const occupancy = new Map<string, { letter: string; wordIdx: number }[]>();
 words.forEach((w, wi) => {
   const word = (w.word || "").toUpperCase();
   for (let k = 0; k < word.length; k++) {
     const r = w.direction === "down" ? w.row + k : w.row;
     const c = w.direction === "across" ? w.col + k : w.col;
     if (r < 0 || r >= gridSize || c < 0 || c >= gridSize) continue;
     const key = `${r}:${c}`;
     const list = occupancy.get(key) || [];
     list.push({ letter: word[k], wordIdx: wi });
     occupancy.set(key, list);
   }
 });
 const conflicts = new Set<string>();
 for (const [key, list] of occupancy) {
   if (new Set(list.map((x) => x.letter)).size > 1) conflicts.add(key);
 }

 /** Does the word at idx still fit when placed at (r,c) with current direction? */
 const fitsAt = (idx: number, r: number, c: number): boolean => {
   const w = words[idx];
   if (!w) return false;
   const len = (w.word || "").length;
   if (w.direction === "across") return c + len <= gridSize && r < gridSize;
   return r + len <= gridSize && c < gridSize;
 };

 /** When the methodist clicks a cell in placement mode, snap the word there. */
 const handleCellClick = (r: number, c: number) => {
   if (placingIdx === null) return;
   if (!fitsAt(placingIdx, r, c)) return;
   setWordPosition(placingIdx, r, c);
   setPlacingIdx(null);
 };

 // Pre-compute letters per cell for grid render.
 const cellLetter = (r: number, c: number): string => {
   const list = occupancy.get(`${r}:${c}`);
   return list && list.length > 0 ? list[0].letter : "";
 };
 const cellInWord = (r: number, c: number, idx: number): boolean => {
   const list = occupancy.get(`${r}:${c}`);
   return !!list && list.some((x) => x.wordIdx === idx);
 };

 const activeWord = placingIdx !== null ? words[placingIdx] : null;

 return (
   <div className="space-y-4">
     <div>
       <label className={labelCls}>Grid Size</label>
       <input
         type="number"
         min={5}
         max={20}
         value={gridSize}
         onChange={(e) => onChange({ ...config, grid_size: parseInt(e.target.value) || 10 })}
         className={`w-24 ${inputCls}`}
       />
       <p className={hintCls}>
         {gridSize} × {gridSize} grid. Words must fit within. Click "Place on grid" on a row to position it visually.
       </p>
     </div>

     {/* Visual grid preview */}
     <div>
       <div className="mb-1 flex items-center gap-3">
         <label className={labelCls}>Grid preview</label>
         {placingIdx !== null && activeWord && (
           <span className="rounded-pill bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary">
             Click a cell to place "{activeWord.word || `word ${placingIdx + 1}`}" ({activeWord.direction})
           </span>
         )}
         {placingIdx !== null && (
           <Button variant="ghost" size="sm" onClick={() => setPlacingIdx(null)}>
             Cancel placement
           </Button>
         )}
         {conflicts.size > 0 && (
           <span className="rounded-pill bg-danger-soft px-2 py-0.5 text-[11px] font-medium text-danger-fg">
             {conflicts.size} conflict{conflicts.size === 1 ? "" : "s"}
           </span>
         )}
       </div>
       <div
         className="inline-grid border border-border-strong bg-paper"
         style={{
           gridTemplateColumns: `repeat(${gridSize}, 28px)`,
           gridTemplateRows: `repeat(${gridSize}, 28px)`,
         }}
       >
         {Array.from({ length: gridSize * gridSize }, (_, idx) => {
           const r = Math.floor(idx / gridSize);
           const c = idx % gridSize;
           const key = `${r}:${c}`;
           const letter = cellLetter(r, c);
           const hasConflict = conflicts.has(key);
           const inActive = placingIdx !== null && cellInWord(r, c, placingIdx);
           const canDrop = placingIdx !== null && fitsAt(placingIdx, r, c);
           const isEmpty = !letter;
           return (
             <div
               key={key}
               onClick={() => handleCellClick(r, c)}
               className={`flex items-center justify-center border border-border text-sm font-mono font-bold uppercase transition-colors ${
                 hasConflict
                   ? "bg-danger-soft text-danger-fg"
                   : inActive
                   ? "bg-primary-soft text-primary"
                   : !isEmpty
                   ? "bg-paper-2 text-ink-700"
                   : placingIdx !== null && canDrop
                   ? "cursor-pointer bg-paper hover:bg-primary-soft"
                   : placingIdx !== null
                   ? "cursor-not-allowed bg-ink-100/40 text-text-subtle"
                   : "bg-paper text-text-subtle"
               }`}
               title={hasConflict ? "Letter conflict with another word" : ""}
             >
               {letter}
             </div>
           );
         })}
       </div>
     </div>

     {/* Word list */}
     <div>
       <label className={labelCls}>Words ({words.length})</label>
       <div className="space-y-3">
         {words.map((w, i) => {
           const isPlacing = placingIdx === i;
           const wordLen = (w.word || "").length;
           const overflow =
             wordLen > 0 &&
             ((w.direction === "across" && w.col + wordLen > gridSize) ||
               (w.direction === "down" && w.row + wordLen > gridSize));
           return (
             <div
               key={i}
               className={`rounded-lg border p-3 space-y-2 ${
                 isPlacing ? "border-primary bg-primary-soft/10" : "border-border-strong"
               }`}
             >
               <div className="flex items-center gap-2">
                 <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center text-xs font-bold text-primary">
                   {i + 1}
                 </span>
                 <input
                   type="text"
                   value={w.word}
                   onChange={(e) => updateWord(i, "word", e.target.value.toUpperCase())}
                   placeholder="WORD"
                   className={`w-32 ${inputCls} font-mono uppercase`}
                 />
                 <input
                   type="text"
                   value={w.clue}
                   onChange={(e) => updateWord(i, "clue", e.target.value)}
                   placeholder="Clue for this word..."
                   className={`flex-1 ${inputCls}`}
                 />
                 <Button
                   variant={isPlacing ? "default" : "outline"}
                   size="sm"
                   onClick={() => setPlacingIdx(isPlacing ? null : i)}
                   title="Pick a cell on the grid to place this word"
                 >
                   {isPlacing ? "Cancel" : "Place on grid"}
                 </Button>
                 <Button variant="ghost" size="sm" onClick={() => removeWord(i)} className="text-danger-fg">
                   <Trash2 className="h-3.5 w-3.5" />
                 </Button>
               </div>
               <div className="flex items-center gap-3 pl-9">
                 <div className="flex items-center gap-1">
                   <label className="text-xs text-text-muted">Row:</label>
                   <input
                     type="number"
                     min={0}
                     max={gridSize - 1}
                     value={w.row}
                     onChange={(e) => updateWord(i, "row", parseInt(e.target.value) || 0)}
                     className={`w-16 ${inputCls}`}
                   />
                 </div>
                 <div className="flex items-center gap-1">
                   <label className="text-xs text-text-muted">Col:</label>
                   <input
                     type="number"
                     min={0}
                     max={gridSize - 1}
                     value={w.col}
                     onChange={(e) => updateWord(i, "col", parseInt(e.target.value) || 0)}
                     className={`w-16 ${inputCls}`}
                   />
                 </div>
                 <select
                   value={w.direction}
                   onChange={(e) => updateWord(i, "direction", e.target.value)}
                   className={`w-28 ${inputCls}`}
                 >
                   <option value="across">Across →</option>
                   <option value="down">Down ↓</option>
                 </select>
                 {overflow && (
                   <span className="text-[11px] text-danger-fg">
                     ⚠ Word extends past grid edge
                   </span>
                 )}
               </div>
             </div>
           );
         })}
       </div>
       <Button variant="outline" size="sm" onClick={addWord} className="mt-2">
         <Plus className="mr-1.5 h-3.5 w-3.5" />
         Add Word
       </Button>
     </div>
   </div>
 );
}

// ─── Word Search ────────────────────────────────────────────────────

export function WordSearchConfigEditor({ config, onChange }: EditorProps) {
 const words = (config.words as string[]) || [];
 const gridSize = (config.grid_size as number) || 12;

 const updateWord = (i: number, val: string) => {
   const next = [...words]; next[i] = val.toUpperCase();
   onChange({ ...config, words: next });
 };

 const addWord = () => onChange({ ...config, words: [...words, ""] });
 const removeWord = (i: number) => onChange({ ...config, words: words.filter((_, j) => j !== i) });

 return (
   <div className="space-y-4">
     <div>
       <label className={labelCls}>Grid Size</label>
       <input type="number" min={8} max={20} value={gridSize}
         onChange={(e) => onChange({ ...config, grid_size: parseInt(e.target.value) || 12 })}
         className={`w-24 ${inputCls}`} />
       <p className={hintCls}>{gridSize} x {gridSize} letter grid. Words are hidden horizontally, vertically, and diagonally.</p>
     </div>
     <div>
       <label className={labelCls}>Hidden Words ({words.length})</label>
       <p className={hintCls}>Enter words to hide in the grid. The grid fills remaining cells with random letters.</p>
       <div className="space-y-2 mt-2">
         {words.map((word, i) => (
           <div key={i} className="flex items-center gap-2">
             <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary-soft flex items-center justify-center text-xs font-bold text-primary">{i + 1}</span>
             <input type="text" value={word} onChange={(e) => updateWord(i, e.target.value)} placeholder="WORD" className={`flex-1 ${inputCls} font-mono uppercase`} />
             {words.length > 1 && (
               <Button variant="ghost" size="sm" onClick={() => removeWord(i)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
             )}
           </div>
         ))}
         <Button variant="outline" size="sm" onClick={addWord}><Plus className="mr-1.5 h-3.5 w-3.5" />Add Word</Button>
       </div>
     </div>
   </div>
 );
}

// ─── Map Pin Drop ───────────────────────────────────────────────────

interface MapPin {
 label: string;
 x: number;
 y: number;
 tolerance: number;
}

export function MapPinDropConfigEditor({ config, onChange }: EditorProps) {
 const imageUrl = (config.image_url as string) || "";
 const pins = (config.pins as MapPin[]) || [];
 const instructions = (config.instructions as string) || "";
 const fileRef = useRef<HTMLInputElement>(null);
 const imageBoxRef = useRef<HTMLDivElement>(null);
 const [uploading, setUploading] = useState(false);
 const [activePinIndex, setActivePinIndex] = useState<number | null>(null);
 const [draggingPinIndex, setDraggingPinIndex] = useState<number | null>(null);

 const updatePin = (i: number, field: string, val: unknown) => {
   const next = pins.map((p, j) => (j === i ? { ...p, [field]: val } : p));
   onChange({ ...config, pins: next });
 };

 const addPin = () => {
   const newIndex = pins.length;
   onChange({ ...config, pins: [...pins, { label: "", x: 50, y: 50, tolerance: 30 }] });
   setActivePinIndex(newIndex);
 };
 const removePin = (i: number) => {
   onChange({ ...config, pins: pins.filter((_, j) => j !== i) });
   setActivePinIndex(null);
 };

 const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
   const file = e.target.files?.[0];
   if (!file) return;
   setUploading(true);
   try {
     const formData = new FormData();
     formData.append("file", file);
     const { data } = await apiClient.post<{ url: string }>("/courses/upload-image", formData, {
       headers: { "Content-Type": "multipart/form-data" },
     });
     onChange({ ...config, image_url: data.url });
   } catch {
     // toast handled by api-client interceptor
   } finally {
     setUploading(false);
     if (fileRef.current) fileRef.current.value = "";
   }
 };

 const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
   if (activePinIndex === null) return;
   const rect = e.currentTarget.getBoundingClientRect();
   const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
   const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
   const next = pins.map((p, j) => (j === activePinIndex ? { ...p, x, y } : p));
   onChange({ ...config, pins: next });
 };

 // Drag-to-reposition: mousedown on a pin starts drag; window mousemove
 // updates its x/y from image box bounding rect; mouseup ends drag.
 useEffect(() => {
   if (draggingPinIndex === null) return;
   const box = imageBoxRef.current;
   if (!box) return;
   const handleMove = (ev: MouseEvent) => {
     const rect = box.getBoundingClientRect();
     const x = Math.max(0, Math.min(100, Math.round(((ev.clientX - rect.left) / rect.width) * 100)));
     const y = Math.max(0, Math.min(100, Math.round(((ev.clientY - rect.top) / rect.height) * 100)));
     const next = pins.map((p, j) => (j === draggingPinIndex ? { ...p, x, y } : p));
     onChange({ ...config, pins: next });
   };
   const handleUp = () => setDraggingPinIndex(null);
   window.addEventListener("mousemove", handleMove);
   window.addEventListener("mouseup", handleUp);
   return () => {
     window.removeEventListener("mousemove", handleMove);
     window.removeEventListener("mouseup", handleUp);
   };
 }, [draggingPinIndex, pins, config, onChange]);

 return (
   <div className="space-y-4">
     <div>
       <label className={labelCls}>Background Image</label>
       <div className="flex gap-2">
         <input type="text" value={imageUrl} onChange={(e) => onChange({ ...config, image_url: e.target.value })} placeholder="https://example.com/map.png" className={`flex-1 ${inputCls}`} />
         <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
         <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="flex-shrink-0">
           <Upload className="mr-1.5 h-3.5 w-3.5" />{uploading ? "Uploading..." : "Upload"}
         </Button>
       </div>
       <p className={hintCls}>Paste a URL or upload an image. Students drop pins on it. Coordinates are in % (0-100).</p>
     </div>
     <div>
       <label className={labelCls}>Instructions (optional)</label>
       <input type="text" value={instructions} onChange={(e) => onChange({ ...config, instructions: e.target.value })} placeholder="Drop pins on the correct locations..." className={inputCls} />
     </div>
     {imageUrl && (
       <div className="space-y-2">
         <div className="flex items-center gap-2">
           <p className={`text-xs ${activePinIndex !== null ? "text-primary font-medium" : "text-text-muted"}`}>
             {activePinIndex !== null
               ? `Click on the image to place pin "${pins[activePinIndex]?.label || activePinIndex + 1}"`
               : "Select a pin below, then click on the image to position it"}
           </p>
           {activePinIndex !== null && (
             <Button variant="ghost" size="sm" onClick={() => setActivePinIndex(null)} className="text-xs h-6 px-2">Cancel</Button>
           )}
         </div>
         <div
           ref={imageBoxRef}
           className={`relative rounded-lg border-2 overflow-hidden ${activePinIndex !== null ? "border-primary cursor-crosshair" : "border-border-strong"}`}
           onClick={handleImageClick}
         >
           <img src={imageUrl} alt="Background" className="w-full object-contain select-none" draggable={false} />
           {pins.map((pin, i) => (
             <div
               key={i}
               role="button"
               tabIndex={0}
               onMouseDown={(e) => {
                 e.stopPropagation();
                 setDraggingPinIndex(i);
                 setActivePinIndex(i);
               }}
               className={`absolute -translate-x-1/2 -translate-y-full ${
                 draggingPinIndex === i ? "cursor-grabbing" : "cursor-grab"
               }`}
               style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
               title="Drag to reposition"
             >
               <div className="flex flex-col items-center pointer-events-none">
                 <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold whitespace-nowrap ${i === activePinIndex ? "bg-primary text-white" : "bg-ink-700 text-white"}`}>
                   {pin.label || i + 1}
                 </span>
                 <svg className={`h-5 w-4 ${i === activePinIndex ? "text-primary" : "text-ink-700"}`} viewBox="0 0 20 24" fill="currentColor">
                   <path d="M10 0C4.5 0 0 4.5 0 10c0 7.5 10 14 10 14s10-6.5 10-14C20 4.5 15.5 0 10 0zm0 13c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3z" />
                 </svg>
               </div>
             </div>
           ))}
         </div>
         <p className="text-[11px] text-text-subtle">
           Drag pins on the image, or select a pin below and click on the image.
         </p>
       </div>
     )}
     <div>
       <label className={labelCls}>Pins ({pins.length})</label>
       <div className="space-y-3">
         {pins.map((pin, i) => (
           <div
             key={i}
             className={`flex items-center gap-2 flex-wrap rounded-lg p-2 transition-colors ${i === activePinIndex ? "bg-primary-soft ring-1 ring-primary" : ""}`}
           >
             <button
               onClick={() => setActivePinIndex(activePinIndex === i ? null : i)}
               title={activePinIndex === i ? "Deselect pin" : "Click to place on image"}
               className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                 i === activePinIndex ? "bg-primary text-white" : "bg-coral-300 text-coral-700 hover:bg-primary hover:text-white"
               }`}
             >
               {i === activePinIndex ? <MapPinIcon className="h-3.5 w-3.5" /> : i + 1}
             </button>
             <input type="text" value={pin.label} onChange={(e) => updatePin(i, "label", e.target.value)} placeholder="Label" className={`w-32 ${inputCls}`} />
             <div className="flex items-center gap-1"><label className="text-xs text-text-muted">X%:</label>
               <input type="number" min={0} max={100} value={pin.x} onChange={(e) => updatePin(i, "x", parseInt(e.target.value) || 0)} className={`w-16 ${inputCls}`} />
             </div>
             <div className="flex items-center gap-1"><label className="text-xs text-text-muted">Y%:</label>
               <input type="number" min={0} max={100} value={pin.y} onChange={(e) => updatePin(i, "y", parseInt(e.target.value) || 0)} className={`w-16 ${inputCls}`} />
             </div>
             <div className="flex items-center gap-1"><label className="text-xs text-text-muted">Tolerance:</label>
               <input type="number" min={1} max={50} value={pin.tolerance} onChange={(e) => updatePin(i, "tolerance", parseInt(e.target.value) || 30)} className={`w-16 ${inputCls}`} />
             </div>
             <Button variant="ghost" size="sm" onClick={() => removePin(i)} className="text-danger-fg"><Trash2 className="h-3.5 w-3.5" /></Button>
           </div>
         ))}
       </div>
       <Button variant="outline" size="sm" onClick={addPin} className="mt-2"><Plus className="mr-1.5 h-3.5 w-3.5" />Add Pin</Button>
     </div>
   </div>
 );
}

// ─── Bubble Sheet ───────────────────────────────────────────────────

interface BubbleQuestion {
 number: number;
 options: string[];
 correct: string;
 question_text?: string;
}

export function BubbleSheetConfigEditor({ config, onChange }: EditorProps) {
 const questions = (config.questions as BubbleQuestion[]) || [];
 const numOptions = (config.num_options as number) || 4;
 const passingScore = (config.passing_score as number) || 70;
 const optionLabels = "ABCDEFGH".slice(0, numOptions).split("");

 const updateQuestion = (i: number, patch: Partial<BubbleQuestion>) => {
   const next = questions.map((q, j) => (j === i ? { ...q, ...patch } : q));
   onChange({ ...config, questions: next });
 };

 const addQuestions = (count: number) => {
   const start = questions.length + 1;
   const newQs = Array.from({ length: count }, (_, i) => ({
     number: start + i,
     options: optionLabels,
     correct: "",
     question_text: "",
   }));
   onChange({ ...config, questions: [...questions, ...newQs] });
 };

 const removeQuestion = (i: number) => {
   const next = questions.filter((_, j) => j !== i).map((q, j) => ({ ...q, number: j + 1 }));
   onChange({ ...config, questions: next });
 };

 return (
   <div className="space-y-4">
     <div className="grid grid-cols-2 gap-4">
       <div>
         <label className={labelCls}>Options per Question</label>
         <select value={numOptions} onChange={(e) => {
           const n = parseInt(e.target.value);
           const labels = "ABCDEFGH".slice(0, n).split("");
           const updated = questions.map(q => ({ ...q, options: labels, correct: labels.includes(q.correct) ? q.correct : "" }));
           onChange({ ...config, num_options: n, questions: updated });
         }} className={inputCls}>
           <option value={3}>3 (A-C)</option>
           <option value={4}>4 (A-D)</option>
           <option value={5}>5 (A-E)</option>
         </select>
       </div>
       <div>
         <label className={labelCls}>Passing Score (%)</label>
         <input type="number" min={1} max={100} value={passingScore}
           onChange={(e) => onChange({ ...config, passing_score: parseInt(e.target.value) || 70 })}
           className={inputCls} />
       </div>
     </div>
     <div>
       <div className="flex items-center justify-between mb-2">
         <label className={labelCls}>Answer Key ({questions.length} questions)</label>
         <div className="flex gap-2">
           <Button variant="outline" size="sm" onClick={() => addQuestions(1)}><Plus className="mr-1 h-3.5 w-3.5" />+1</Button>
           <Button variant="outline" size="sm" onClick={() => addQuestions(10)}><Plus className="mr-1 h-3.5 w-3.5" />+10</Button>
         </div>
       </div>
       <div className="space-y-2">
         {questions.map((q, i) => (
           <div key={i} className="rounded-lg border border-border-strong px-3 py-2">
             <div className="flex items-start gap-2">
               <span className="mt-2 w-6 shrink-0 text-xs font-bold text-text-muted">{q.number}.</span>
               <div className="flex-1 space-y-1.5">
                 <input
                   type="text"
                   value={q.question_text || ""}
                   onChange={(e) => updateQuestion(i, { question_text: e.target.value })}
                   placeholder="Question text (optional)"
                   className="w-full rounded border border-border-strong bg-paper-2 px-2 py-1 text-xs"
                 />
                 <div className="flex items-center gap-1.5">
                   {optionLabels.map((opt) => (
                     <button
                       key={opt}
                       type="button"
                       onClick={() => updateQuestion(i, { correct: opt })}
                       className={`w-7 h-7 rounded-full text-xs font-bold transition-all ${
                         q.correct === opt
                           ? "bg-primary text-white ring-2 ring-primary-soft"
                           : "bg-surface-2 text-text-muted hover:bg-ink-100"
                       }`}
                     >{opt}</button>
                   ))}
                   <Button
                     variant="ghost"
                     size="sm"
                     onClick={() => removeQuestion(i)}
                     className="text-danger-fg ml-auto p-0 h-6 w-6"
                   >
                     <Trash2 className="h-3 w-3" />
                   </Button>
                 </div>
               </div>
             </div>
           </div>
         ))}
       </div>
       {questions.length === 0 && (
         <p className="text-sm text-text-muted text-center py-4">No questions yet. Click +1 or +10 to add.</p>
       )}
     </div>
   </div>
 );
}

// ─── Web Editor ──────────────────────────────────────────────────────

export function WebEditorConfigEditor({ config, onChange }: EditorProps) {
 const instructions = (config.instructions as string) || "";
 const starterHtml = (config.starter_html as string) || "";
 const starterCss = (config.starter_css as string) || "";
 const starterJs = (config.starter_js as string) || "";

 const monacoOptions = {
   minimap: { enabled: false },
   fontSize: 13,
   lineNumbers: "on" as const,
   wordWrap: "on" as const,
   scrollBeyondLastLine: false,
   automaticLayout: true,
   tabSize: 2,
 };

 return (
   <div className="space-y-4">
     <div>
       <label className={labelCls}>Instructions for Student</label>
       <textarea
         value={instructions}
         onChange={(e) => onChange({ ...config, instructions: e.target.value })}
         placeholder="Describe what the student should build with HTML/CSS/JS..."
         rows={3}
         className={inputCls}
       />
       <p className={hintCls}>This exercise is manually graded by the teacher after submission.</p>
     </div>
     <div>
       <label className={labelCls}>Starter HTML (optional)</label>
       <div className="h-40 overflow-hidden rounded-lg border border-border-strong">
         <MonacoEditor
           height="100%"
           language="html"
           value={starterHtml}
           onChange={(v) => onChange({ ...config, starter_html: v || "" })}
           theme="vs-light"
           options={monacoOptions}
         />
       </div>
     </div>
     <div className="grid grid-cols-2 gap-4">
       <div>
         <label className={labelCls}>Starter CSS (optional)</label>
         <div className="h-40 overflow-hidden rounded-lg border border-border-strong">
           <MonacoEditor
             height="100%"
             language="css"
             value={starterCss}
             onChange={(v) => onChange({ ...config, starter_css: v || "" })}
             theme="vs-light"
             options={monacoOptions}
           />
         </div>
       </div>
       <div>
         <label className={labelCls}>Starter JS (optional)</label>
         <div className="h-40 overflow-hidden rounded-lg border border-border-strong">
           <MonacoEditor
             height="100%"
             language="javascript"
             value={starterJs}
             onChange={(v) => onChange({ ...config, starter_js: v || "" })}
             theme="vs-light"
             options={monacoOptions}
           />
         </div>
       </div>
     </div>
   </div>
 );
}
