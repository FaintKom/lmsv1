"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

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

 const updateRow = (i: number, field: "pronoun" | "correct", val: string) => {
   const next = table.map((r, j) => (j === i ? { ...r, [field]: val } : r));
   onChange({ ...config, table: next });
 };

 const addRow = () => onChange({ ...config, table: [...table, { pronoun: "", correct: "" }] });
 const removeRow = (i: number) => onChange({ ...config, table: table.filter((_, j) => j !== i) });

 const presetPronouns = (lang: string) => {
   const presets: Record<string, string[]> = {
     Spanish: ["yo", "tu", "el/ella", "nosotros", "vosotros", "ellos/ellas"],
     French: ["je", "tu", "il/elle", "nous", "vous", "ils/elles"],
     German: ["ich", "du", "er/sie/es", "wir", "ihr", "sie/Sie"],
     Russian: ["ya", "ty", "on/ona", "my", "vy", "oni"],
   };
   const pronouns = presets[lang];
   if (pronouns) {
     onChange({ ...config, language: lang, table: pronouns.map((p) => ({ pronoun: p, correct: table.find((r) => r.pronoun === p)?.correct || "" })) });
   }
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
         <input type="text" value={language} onChange={(e) => onChange({ ...config, language: e.target.value })} placeholder="e.g., Spanish" className={inputCls} />
       </div>
       <div>
         <label className={labelCls}>Tense (optional)</label>
         <input type="text" value={tense} onChange={(e) => onChange({ ...config, tense: e.target.value })} placeholder="e.g., present" className={inputCls} />
       </div>
     </div>

     {language && ["Spanish", "French", "German", "Russian"].includes(language) && table.length === 0 && (
       <Button variant="outline" size="sm" onClick={() => presetPronouns(language)}>Load {language} pronoun presets</Button>
     )}

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

// ─── Web Editor ──────────────────────────────────────────────────────

