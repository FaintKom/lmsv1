/* ex-lang.jsx — SentenceBuilderV2 + TranslationV2 + ConjugationV2 (batch 3 ports with audit fixes)

   SentenceBuilderV2:
   - SB-01 duplicate words tracked by tile index, not string match (upstream
           "the cat saw the dog" broke — both "the" tiles greyed at once)
   - SB-02 answer line is a real sentence strip: tap a placed word to send it
           back (upstream only had "clear all")
   - SB-03 keyboard: Tab + Enter on bank tiles and placed tiles
   - SB-04 word tiles fly between bank and strip (flyClone)
   - SB-05 reveal shows the full correct sentence, structured

   TranslationV2:
   - TR-01 forgiving normalisation: case, extra spaces, terminal punctuation,
           typographic apostrophes (upstream required exact punctuation)
   - TR-02 multiple accepted answers (`accepted` array) surfaced honestly
   - TR-03 near-miss detection (1 typo by Levenshtein) → "almost — check
           spelling", costs nothing
   - TR-04 textarea grows with content; Enter checks, Shift+Enter = newline
   - TR-05 network failure = neutral sheet, text preserved

   ConjugationV2:
   - CJ-01 real <label for> on every row (upstream spans)
   - CJ-02 correct rows lock green on retry + "N of 6 right" partials
   - CJ-03 accent-insensitive compare option (é ≡ e) for young typists
   - CJ-04 Enter advances rows, last Enter checks
*/

const { useState: useStateG, useRef: useRefG, useMemo: useMemoG, useEffect: useEffectG } = React;

/* ════════════════ SENTENCE BUILDER ════════════════ */
function SentenceBuilderV2({ words, correct, hint, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  /* tiles are {id, word} — duplicates stay distinct (SB-01) */
  const tiles = useMemoG(() => words.map((w, i) => ({ id: i, word: w })), [words]);
  const [bankOrder] = useStateG(() => shuffleArr(tiles.map((t) => t.id)));
  const [strip, setStrip] = useStateG([]); // tile ids in placed order
  const [feedback, setFeedback] = useStateG(null);
  const [attemptsLeft, setAttemptsLeft] = useStateG(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateG(0);
  const [lostHeart, setLostHeart] = useStateG(false);
  const [streak, setStreak] = useStateG(initialStreak);
  const [stripFlash, setStripFlash] = useStateG("");
  const { fire, layer } = useConfetti();
  const bankRefs = useRefG({});
  const stripRef = useRefG(null);

  const sentence = strip.map((id) => tiles[id].word).join(" ");
  const target = correct.join(" ");

  const placeTile = (id) => {
    if (feedback || strip.includes(id)) return;
    flyClone(bankRefs.current[id] || null, stripRef.current || null, () => {
      setStrip((s) => [...s, id]);
    });
  };
  const returnTile = (id) => {
    if (feedback) return;
    setStrip((s) => s.filter((x) => x !== id));
  };

  const handleCheck = () => {
    if (sentence === target) {
      setStripFlash("ok");
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Perfect sentence!" : "Got it!", explain: hint });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    setStripFlash("no");
    setTimeout(() => setStripFlash(""), 600);
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here's the sentence", correct: target });
      setStreak(0);
    } else {
      /* partial: longest correct prefix */
      let okPrefix = 0;
      while (okPrefix < strip.length && tiles[strip[okPrefix]].word === correct[okPrefix]) okPrefix++;
      setFeedback({
        kind: "no",
        msg: remaining === 1 ? "Not quite — 1 try left" : "Not quite — " + remaining + " tries left",
        explain: okPrefix > 0 ? "The first " + (okPrefix === 1 ? "word is" : okPrefix + " words are") + " right!" : "Try starting with a different word.",
      });
    }
  };

  const handleRetry = () => { setFeedback(null); setStripFlash(""); };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Build the sentence"}
        feedback={feedback} canCheck={strip.length === tiles.length}
        checkHint="Use every word first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {/* sentence strip */}
          <div
            ref={stripRef}
            style={{
              minHeight: 64, borderRadius: 14, padding: "12px 14px",
              background: stripFlash === "ok" ? "var(--green-50)" : stripFlash === "no" ? "var(--coral-50)" : "var(--ink-50)",
              border: "2px dashed " + (stripFlash === "ok" ? "var(--green-400)" : stripFlash === "no" ? "var(--coral-300)" : "var(--ink-200)"),
              display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
              marginBottom: 24, transition: "background 200ms, border-color 200ms",
            }}
            aria-label="Your sentence"
          >
            {strip.length === 0 && (
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-300)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                tap words to build your sentence here
              </span>
            )}
            {strip.map((id) => (
              <button key={id} className="gp-tile" style={{ padding: "8px 14px", fontSize: 15 }}
                onClick={() => returnTile(id)} disabled={!!feedback}
                aria-label={"“" + tiles[id].word + "” — tap to send back"}>
                {tiles[id].word}
              </button>
            ))}
          </div>
          {/* word bank */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
            {bankOrder.map((id) => {
              const used = strip.includes(id);
              return (
                <button key={id}
                  ref={(el) => { bankRefs.current[id] = el; }}
                  className={"gp-tile" + (used ? " locked" : "")}
                  style={{ padding: "10px 18px", fontSize: 15, opacity: used ? 0.3 : 1 }}
                  disabled={used || !!feedback}
                  onClick={() => placeTile(id)}>
                  {tiles[id].word}
                </button>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ TRANSLATION ════════════════ */
const normLang = (s) =>
  s.toLowerCase()
    .replace(/[\u2018\u2019\u02BC]/g, "'")
    .replace(/[.!?¡¿…]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();

function levenshtein1(a, b) {
  /* true if edit distance ≤ 1 */
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function TranslationV2({ source, sourceLang, targetLang, accepted, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onGrade, onQuit, onFinish }) {
  const [val, setVal] = useStateG("");
  const [inputState, setInputState] = useStateG("");
  const [feedback, setFeedback] = useStateG(null);
  const [attemptsLeft, setAttemptsLeft] = useStateG(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateG(0);
  const [lostHeart, setLostHeart] = useStateG(false);
  const [streak, setStreak] = useStateG(initialStreak);
  const [checking, setChecking] = useStateG(false);
  const { fire, layer } = useConfetti();
  const taRef = useRefG(null);

  const autosize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(160, ta.scrollHeight) + "px";
  };

  const gradeLocal = () => {
    const got = normLang(val);
    if (accepted.some((a) => normLang(a) === got)) return { verdict: "ok" };
    if (accepted.some((a) => levenshtein1(normLang(a), got))) return { verdict: "near" };
    return { verdict: "no" };
  };

  const applyVerdict = (verdict) => {
    if (verdict === "ok") {
      setInputState("correct");
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Beautiful translation!" : "Got it!", explain: accepted.length > 1 ? "Also fine: “" + accepted[1] + "”" : undefined });
      setStreak((s) => s + 1);
      fire();
      return;
    }
    if (verdict === "near") {
      /* TR-03: free, gentle */
      setInputState("wrong");
      setTimeout(() => setInputState(""), 700);
      setFeedback({ kind: "meh", msg: "Sooo close!", explain: "One letter looks off — check your spelling and try again. This one's free." });
      return;
    }
    setInputState("wrong");
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here's one way", correct: accepted[0] });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: remaining === 1 ? "Not quite — 1 try left" : "Not quite — " + remaining + " tries left", explain: "Your text stays — fix it up and check again." });
      setTimeout(() => setInputState(""), 700);
    }
  };

  const handleCheck = async () => {
    if (checking) return;
    if (onGrade) {
      setChecking(true);
      try {
        const res = await onGrade({ answer: val });
        applyVerdict(res.correct ? "ok" : "no");
      } catch {
        setFeedback({ kind: "meh", msg: "Hmm, we couldn't check that", explain: "Check your connection and try again — your translation is safe." });
      } finally {
        setChecking(false);
      }
      return;
    }
    applyVerdict(gradeLocal().verdict);
  };

  const handleRetry = () => {
    setFeedback(null);
    setInputState("");
    setTimeout(() => taRef.current && taRef.current.focus(), 60);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && (feedback.kind === "meh" || (feedback.kind === "no" && attemptsLeft > 0));

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Translate into " + targetLang}
        feedback={feedback} canCheck={normLang(val).length > 0} checking={checking}
        checkHint="Write your translation first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div style={{ background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 18, padding: "20px 22px", marginBottom: 18 }}>
            <div className="gp-eyebrow" style={{ marginBottom: 6 }}>{sourceLang}</div>
            <div style={{ fontSize: "clamp(16px, 4.6cqw, 19px)", fontWeight: 700, lineHeight: 1.5 }}>{source}</div>
          </div>
          <div className="gp-eyebrow" style={{ marginBottom: 6 }}>{targetLang}</div>
          <textarea
            ref={taRef}
            className={"gp-input " + inputState}
            style={{ resize: "none", minHeight: 56, lineHeight: 1.5, fontWeight: 600 }}
            rows={2}
            value={val}
            placeholder="Type your translation…"
            aria-label={"Your translation into " + targetLang}
            disabled={!!feedback && feedback.kind !== "meh"}
            onChange={(e) => { setVal(e.target.value); setInputState(""); autosize(); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (normLang(val).length > 0 && !feedback && !checking) handleCheck();
              }
            }}
          ></textarea>
          <div style={{ marginTop: 10, fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-300)", textAlign: "center" }}>
            don't sweat capitals or full stops — we don't
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ CONJUGATION ════════════════ */
const stripAccents = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

function ConjugationV2({ infinitive, tense, language, rows, accentForgiving = true, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [values, setValues] = useStateG(() => rows.map(() => ""));
  const [lockedOk, setLockedOk] = useStateG(() => rows.map(() => false));
  const [feedback, setFeedback] = useStateG(null);
  const [attemptsLeft, setAttemptsLeft] = useStateG(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateG(0);
  const [lostHeart, setLostHeart] = useStateG(false);
  const [streak, setStreak] = useStateG(initialStreak);
  const { fire, layer } = useConfetti();
  const inputRefs = useRefG([]);

  const matches = (got, expected) => {
    const a = normLang(got), b = normLang(expected);
    if (a === b) return true;
    return accentForgiving && stripAccents(a) === stripAccents(b); /* CJ-03 */
  };
  const exactMatch = (got, expected) => normLang(got) === normLang(expected);

  const allFilled = values.every((v) => v.trim().length > 0);

  const handleCheck = () => {
    const flags = rows.map((r, i) => matches(values[i], r.answer));
    if (flags.every(Boolean)) {
      const accentSlips = rows.filter((r, i) => !exactMatch(values[i], r.answer)).length;
      setLockedOk(rows.map(() => true));
      setFeedback({
        kind: "ok",
        msg: usedAttempts === 0 ? "Whole table, first try!" : "Got it!",
        explain: accentSlips > 0 ? "Watch the accents though — " + accentSlips + " missing (shown in green)." : undefined,
      });
      if (accentSlips > 0) setValues(rows.map((r) => r.answer)); /* show the accented forms */
      setStreak((s) => s + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here's the table", correctList: rows.map((r) => [r.pronoun, r.answer]) });
      setStreak(0);
    } else {
      const okCount = flags.filter(Boolean).length;
      setFeedback({
        kind: "no",
        msg: remaining === 1 ? "Check the red rows — 1 try left" : "Check the red rows — " + remaining + " tries left",
        explain: okCount > 0 ? okCount + " of " + rows.length + " are right — locked in green." : undefined,
      });
    }
  };

  const handleRetry = () => {
    const flags = rows.map((r, i) => matches(values[i], r.answer));
    setLockedOk(flags);
    setFeedback(null);
    const firstBad = flags.findIndex((f) => !f);
    setTimeout(() => { if (firstBad >= 0 && inputRefs.current[firstBad]) inputRefs.current[firstBad].focus(); }, 60);
  };
  const handleContinue = () => onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Conjugate “" + infinitive + "”"}
        feedback={feedback} canCheck={allFilled}
        checkHint="Fill in every row first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 420, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <span style={{ display: "inline-block", background: "var(--sun-100)", color: "var(--sun-700)", borderRadius: 999, padding: "4px 14px", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}>
              {language} · {tense}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {rows.map((r, i) => {
              const isOk = !!feedback && matches(values[i], r.answer);
              const state = feedback ? (isOk ? " ok" : " no") : lockedOk[i] ? " ok" : "";
              const id = "cj-" + i;
              return (
                <div key={i} className="fb-step-row">
                  <label className="fb-step-label" htmlFor={id} style={{ width: 72, fontSize: 12, textTransform: "none", letterSpacing: 0 }}>{r.pronoun}</label>
                  <input
                    id={id}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    className={"fb-step-input" + state}
                    style={{ fontFamily: "var(--font-sans)" }}
                    type="text" autoComplete="off" autoCapitalize="none" spellCheck="false"
                    value={values[i]}
                    placeholder="…"
                    disabled={!!feedback || lockedOk[i]}
                    onChange={(e) => {
                      const next = values.slice();
                      next[i] = e.target.value;
                      setValues(next);
                    }}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      const nextIdx = inputRefs.current.findIndex((el, j) => j > i && el && !el.disabled);
                      if (nextIdx >= 0) inputRefs.current[nextIdx].focus();
                      else if (allFilled && !feedback) handleCheck();
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { SentenceBuilderV2, TranslationV2, ConjugationV2 });
