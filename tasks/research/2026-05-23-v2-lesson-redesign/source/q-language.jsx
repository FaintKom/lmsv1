// q-language.jsx — language family
// Translation, SentenceBuilder, Dialogue, Conjugation, Reading, Crossword, WordSearch, SRSFlashcard

const { useState: useStateL, useEffect: useEffectL, useRef: useRefL, useMemo: useMemoL } = React;

// ─── 8. TRANSLATION ────────────────────────────────────────────────
function TranslationExerciseV2() {
  const PROMPT = {
    source: "Where is the library?",
    sourceLang: "EN", targetLang: "ES",
    accepted: ["¿dónde está la biblioteca?", "donde esta la biblioteca", "¿dónde está la biblioteca", "dónde está la biblioteca"],
    correct: "¿Dónde está la biblioteca?",
    hint: "Use “estar” for location (not “ser”).",
  };
  const [text, setText] = useStateL("");
  const [fb, setFb] = useStateL(null);
  const [showHint, setShowHint] = useStateL(false);
  const { fire, layer } = useConfetti();
  const normalize = (s) => s.trim().toLowerCase().replace(/[?¿.!]/g, "").replace(/\s+/g, " ");
  const check = () => {
    const ok = PROMPT.accepted.some((a) => normalize(a) === normalize(text));
    if (ok) { setFb({ kind: "ok", msg: "¡Excelente!" }); fire(); }
    else setFb({ kind: "no", msg: "Close, but not quite.", correct: PROMPT.correct });
  };
  const cont = () => { setFb(null); setText(""); setShowHint(false); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={4} streak={11} step={4} totalSteps={12}
        eyebrow="SPANISH · A1 · QUESTIONS"
        title="Translate this sentence"
        feedback={fb}
        canCheck={text.trim().length > 0}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", maxWidth: 520, margin: "0 auto 18px" }}>
          <button style={{
            width: 56, height: 56, borderRadius: 14,
            background: "var(--green-50)", color: "var(--green-700)",
            border: "2px solid var(--green-200)", display: "grid", placeItems: "center",
            cursor: "pointer", flexShrink: 0,
          }}><Icon.Volume /></button>
          <div style={{
            flex: 1, padding: "16px 18px",
            background: "var(--paper-2)", borderRadius: 14, border: "2px solid var(--ink-100)",
            fontSize: 19, fontWeight: 600, color: "var(--ink-900)",
            lineHeight: 1.4,
            position: "relative",
          }}>
            <span className="gp-eyebrow" style={{ display: "block", marginBottom: 4 }}>EN</span>
            {PROMPT.source}
          </div>
        </div>
        <div style={{ maxWidth: 520, margin: "0 auto" }}>
          <div className="gp-eyebrow" style={{ marginBottom: 8 }}>ES · YOUR ANSWER</div>
          <textarea
            className={"gp-input " + (fb ? (fb.kind === "ok" ? "correct" : "wrong") : "")}
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={!!fb}
            placeholder="Type the Spanish translation…"
            style={{ minHeight: 96, resize: "none", fontFamily: "var(--font-sans)" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            <button
              onClick={() => setShowHint(!showHint)}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--sun-700)", display: "inline-flex", alignItems: "center", gap: 6,
                fontFamily: "var(--font-sans)", fontWeight: 600, fontSize: 13,
              }}
            >
              <Icon.Lightbulb />Hint
            </button>
            {showHint && (
              <span style={{ fontSize: 13, color: "var(--sun-700)", background: "var(--sun-50)", padding: "4px 10px", borderRadius: 999 }}>
                {PROMPT.hint}
              </span>
            )}
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 9. SENTENCE BUILDER (canonical Duolingo tile build) ──────────
function SentenceBuilderExerciseV2() {
  const PROMPT = {
    source: "I would like a coffee, please.",
    correct: ["Je", "voudrais", "un", "café", ","," s’il", "vous", "plaît", "."],
    distractors: ["le", "tu", "veux"],
  };
  // simplify to deduplicated tiles
  const FULL = [
    "Je", "voudrais", "un", "café", "s’il", "vous", "plaît", "le", "tu", "veux",
  ];
  const CORRECT = ["Je", "voudrais", "un", "café", "s’il", "vous", "plaît"];
  const [bank, setBank] = useStateL(() => shuffle(FULL.map((w, i) => ({ w, i }))));
  const [picked, setPicked] = useStateL([]); // array of {w, i}
  const [fb, setFb] = useStateL(null);
  const { fire, layer } = useConfetti();

  const moveToPicked = (item) => {
    if (fb) return;
    setBank(bank.filter((b) => b.i !== item.i));
    setPicked([...picked, item]);
  };
  const moveToBank = (item) => {
    if (fb) return;
    setPicked(picked.filter((p) => p.i !== item.i));
    setBank([...bank, item]);
  };

  const check = () => {
    const got = picked.map((p) => p.w);
    const ok = got.length === CORRECT.length && got.every((w, i) => w === CORRECT[i]);
    if (ok) { setFb({ kind: "ok", msg: "Excellent!", explain: "Literally: “I would like a coffee, if you please.”" }); fire(); }
    else setFb({ kind: "no", msg: "Almost — order matters.", correct: CORRECT.join(" ") });
  };
  const cont = () => { setFb(null); setBank(shuffle(FULL.map((w, i) => ({ w, i })))); setPicked([]); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={3} streak={18} step={6} totalSteps={12}
        eyebrow="FRENCH · CAFÉ"
        title="Build the sentence in French"
        feedback={fb}
        canCheck={picked.length > 0}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", maxWidth: 520, margin: "0 auto 18px" }}>
          <button style={{
            width: 56, height: 56, borderRadius: 14,
            background: "var(--green-50)", color: "var(--green-700)",
            border: "2px solid var(--green-200)", display: "grid", placeItems: "center",
            cursor: "pointer", flexShrink: 0,
          }}><Icon.Volume /></button>
          <div style={{
            flex: 1, padding: "14px 16px",
            background: "var(--paper-2)", borderRadius: 14, border: "2px solid var(--ink-100)",
            fontSize: 17, fontWeight: 600, color: "var(--ink-900)",
          }}>{PROMPT.source}</div>
        </div>

        {/* picked row */}
        <div style={{
          minHeight: 64,
          padding: 10,
          borderBottom: "2px solid var(--ink-100)",
          borderTop: "2px solid var(--ink-100)",
          display: "flex", flexWrap: "wrap", gap: 8,
          alignContent: "flex-start",
          marginBottom: 20,
        }}>
          {picked.map((p) => (
            <button key={p.i} className="gp-tile" style={{ padding: "8px 14px", fontSize: 16 }} onClick={() => moveToBank(p)}>
              {p.w}
            </button>
          ))}
        </div>

        {/* bank */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          {bank.map((b) => (
            <button key={b.i} className="gp-tile" style={{ padding: "8px 14px", fontSize: 16 }} onClick={() => moveToPicked(b)}>
              {b.w}
            </button>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 10. DIALOGUE (chat-bubble style) ─────────────────────────────
function DialogueExerciseV2() {
  const MESSAGES = [
    { speaker: "Anna", text: "Hola, ¿cómo te llamas?", side: "left" },
    { speaker: "you", text: null, side: "right", options: [
      { id: "a", text: "Me llamo Carlos.", correct: true },
      { id: "b", text: "Tengo veinte años.", correct: false },
      { id: "c", text: "Soy de España.", correct: false },
    ]},
  ];
  const [pick, setPick] = useStateL(null);
  const [fb, setFb] = useStateL(null);
  const { fire, layer } = useConfetti();
  const q = MESSAGES[1];

  const check = () => {
    const opt = q.options.find((o) => o.id === pick);
    if (opt?.correct) { setFb({ kind: "ok", msg: "Buena respuesta." }); fire(); }
    else setFb({ kind: "no", msg: "She asked your name.", correct: q.options.find((o) => o.correct).text });
  };
  const cont = () => { setFb(null); setPick(null); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={4} streak={6} step={5} totalSteps={12}
        eyebrow="SPANISH · GREETINGS"
        title="Pick the right reply"
        feedback={fb}
        canCheck={pick !== null}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          {/* Anna message */}
          <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--coral-300), var(--sun-400))",
              display: "grid", placeItems: "center", color: "#fff", fontWeight: 800, fontSize: 16, flexShrink: 0,
            }}>A</div>
            <div>
              <div style={{ fontSize: 12, color: "var(--ink-500)", fontWeight: 600, marginBottom: 4 }}>Anna</div>
              <div style={{
                padding: "12px 16px",
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: "18px 18px 18px 4px",
                fontSize: 16, fontWeight: 600, color: "var(--ink-900)",
                maxWidth: 320,
              }}>{MESSAGES[0].text}</div>
            </div>
          </div>
          {/* your reply preview */}
          {pick && !fb && (
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 18 }}>
              <div style={{
                padding: "12px 16px",
                background: "var(--green-600)", color: "#fff",
                borderRadius: "18px 18px 4px 18px",
                fontSize: 16, fontWeight: 600,
                maxWidth: 320,
              }}>{q.options.find((o) => o.id === pick).text}</div>
            </div>
          )}
        </div>

        <div className="gp-eyebrow" style={{ textAlign: "center", marginBottom: 10 }}>Choose your reply</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 460, margin: "0 auto" }}>
          {q.options.map((o) => {
            let state = "";
            if (fb) {
              if (o.correct) state = "correct";
              else if (o.id === pick) state = "wrong";
              else state = "locked";
            } else if (o.id === pick) state = "selected";
            return (
              <button
                key={o.id}
                className={"gp-tile " + state}
                style={{ padding: "14px 18px", fontSize: 15, justifyContent: "flex-start", textAlign: "left" }}
                onClick={() => !fb && setPick(o.id)}
              >
                {o.text}
              </button>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 11. CONJUGATION (verb table) ─────────────────────────────────
function ConjugationExerciseV2() {
  const VERB = {
    inf: "hablar",
    tense: "Presente",
    rows: [
      { pron: "yo", correct: "hablo" },
      { pron: "tú", correct: "hablas" },
      { pron: "él/ella", correct: "habla" },
      { pron: "nosotros", correct: "hablamos" },
      { pron: "vosotros", correct: "habláis" },
      { pron: "ellos/ellas", correct: "hablan" },
    ],
  };
  const [vals, setVals] = useStateL({});
  const [fb, setFb] = useStateL(null);
  const { fire, layer } = useConfetti();

  const allFilled = VERB.rows.every((r) => (vals[r.pron] || "").trim());
  const check = () => {
    const ok = VERB.rows.every((r) => (vals[r.pron] || "").trim().toLowerCase() === r.correct);
    if (ok) { setFb({ kind: "ok", msg: "Conjugación perfecta." }); fire(); }
    else {
      const wrong = VERB.rows.filter((r) => (vals[r.pron] || "").trim().toLowerCase() !== r.correct);
      setFb({ kind: "no", msg: `${wrong.length} form${wrong.length === 1 ? "" : "s"} off.`, explain: VERB.rows.map((r) => `${r.pron} → ${r.correct}`).join("  ·  ") });
    }
  };
  const cont = () => { setFb(null); setVals({}); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={3} step={4} totalSteps={10}
        eyebrow={`SPANISH · ${VERB.tense.toUpperCase()}`}
        title={<>Conjugate <span className="gp-mark" style={{ fontStyle: "italic", fontFamily: "var(--font-mono)", fontWeight: 600 }}>{VERB.inf}</span></>}
        feedback={fb}
        canCheck={allFilled}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{
          maxWidth: 460, margin: "0 auto",
          background: "var(--paper-2)", borderRadius: 16, border: "2px solid var(--ink-100)",
          overflow: "hidden",
        }}>
          {VERB.rows.map((r, i) => {
            const v = vals[r.pron] || "";
            const isWrong = fb && v.toLowerCase().trim() !== r.correct;
            const isOk = fb && v.toLowerCase().trim() === r.correct;
            return (
              <div key={r.pron} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "6px 16px",
                borderTop: i > 0 ? "1px solid var(--ink-100)" : "none",
              }}>
                <span style={{
                  width: 90, flexShrink: 0,
                  fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--ink-500)",
                  fontWeight: 500,
                }}>{r.pron}</span>
                <input
                  type="text"
                  value={v}
                  disabled={!!fb}
                  onChange={(e) => setVals({ ...vals, [r.pron]: e.target.value })}
                  placeholder={"habl…"}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    border: "2px solid " + (isOk ? "var(--green-500)" : isWrong ? "var(--coral-500)" : "var(--ink-100)"),
                    borderRadius: 10,
                    fontFamily: "var(--font-mono)",
                    fontSize: 15,
                    fontWeight: 600,
                    background: isOk ? "var(--green-50)" : isWrong ? "var(--coral-50)" : "var(--paper)",
                  }}
                />
                {fb && (
                  <span style={{ width: 20, color: isOk ? "var(--green-600)" : "var(--coral-500)" }}>
                    {isOk ? <Icon.Check s={18} /> : <Icon.XThick s={18} />}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 12. READING ───────────────────────────────────────────────────
function ReadingExerciseV2() {
  const PASSAGE = `Marie Curie was a Polish-born physicist who became the first woman to win a Nobel Prize. She conducted pioneering research on radioactivity, a term she coined herself. In 1911, she became the first person to win Nobel Prizes in two different sciences — Physics and Chemistry. Her discoveries laid the groundwork for X-ray imaging and cancer treatment.`;
  const Q = {
    text: "How many Nobel Prizes did Marie Curie win?",
    options: ["One", "Two", "Three", "Zero"],
    correct: 1,
  };
  const [pick, setPick] = useStateL(null);
  const [fb, setFb] = useStateL(null);
  const { fire, layer } = useConfetti();

  const check = () => {
    if (pick === Q.correct) { setFb({ kind: "ok", msg: "Right." }); fire(); }
    else setFb({ kind: "no", msg: "Look at sentence 3.", correct: Q.options[Q.correct] });
  };
  const cont = () => { setFb(null); setPick(null); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={1} step={8} totalSteps={12}
        eyebrow="READING · BIOGRAPHY"
        title="Read & answer"
        feedback={fb}
        canCheck={pick !== null}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
          <div style={{
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 14,
            padding: "18px 20px",
            fontSize: 14.5, lineHeight: 1.6,
            color: "var(--ink-700)",
            fontFamily: "var(--font-sans)",
          }}>
            <div className="gp-eyebrow" style={{ marginBottom: 8 }}>Passage</div>
            <p style={{ margin: 0 }}>{PASSAGE}</p>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>{Q.text}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {Q.options.map((opt, i) => {
                let state = "";
                if (fb) {
                  if (i === Q.correct) state = "correct";
                  else if (i === pick) state = "wrong";
                  else state = "locked";
                } else if (pick === i) state = "selected";
                return (
                  <button
                    key={i}
                    className={"gp-tile " + state}
                    style={{ padding: "12px 16px", justifyContent: "flex-start", fontSize: 14 }}
                    onClick={() => !fb && setPick(i)}
                  >{opt}</button>
                );
              })}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 13. CROSSWORD ─────────────────────────────────────────────────
function CrosswordExerciseV2() {
  // 5×5 grid with words "CODE" (across, row 1) and "DATA" (down, col 2 starting row 1)
  // Layout (rows are top→bottom):
  //   row 0: _ _ _ _ _
  //   row 1: C O D E _    (across)
  //   row 2: _ _ A _ _
  //   row 3: _ _ T _ _
  //   row 4: _ _ A _ _
  // Wait — DATA goes down from D at row 1, col 2. So col 2 rows 1..4 = D,A,T,A.
  const GRID_W = 5, GRID_H = 5;
  const CELLS = {}; // "r,c" -> {ch, num?}
  // CODE across row 1, cols 1..4
  ["C","O","D","E"].forEach((ch, i) => { CELLS[`1,${1+i}`] = { ch }; });
  // DATA down col 2 (reuse D at 1,2), rows 1..4
  // But CODE row 1 col 2 is "D"; col 3 is D? Let's recheck. CODE: C=col1, O=col2, D=col3, E=col4.
  // Restart: CODE across cols 1..4 → C(1,1), O(1,2), D(1,3), E(1,4)
  // DATA down: D(1,3), A(2,3), T(3,3), A(4,3)
  CELLS[`1,3`] = { ch: "D" };
  CELLS[`2,3`] = { ch: "A" };
  CELLS[`3,3`] = { ch: "T" };
  CELLS[`4,3`] = { ch: "A" };
  // numbers
  CELLS[`1,1`].num = 1;
  CELLS[`1,3`].num = CELLS[`1,3`].num || 2;
  CELLS[`1,3`].num = 2;

  const cellKeys = Object.keys(CELLS);
  const [vals, setVals] = useStateL({});
  const [fb, setFb] = useStateL(null);
  const { fire, layer } = useConfetti();
  const refs = useRefL({});

  const check = () => {
    const ok = cellKeys.every((k) => (vals[k] || "").toUpperCase() === CELLS[k].ch);
    if (ok) { setFb({ kind: "ok", msg: "Crossword solved." }); fire(); }
    else setFb({ kind: "no", msg: "Some letters are off.", correct: "1A: CODE · 2D: DATA" });
  };
  const cont = () => { setFb(null); setVals({}); };

  const allFilled = cellKeys.every((k) => (vals[k] || "").length > 0);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={8} step={9} totalSteps={12}
        eyebrow="VOCAB · TECH"
        title="Solve the crossword"
        feedback={fb}
        canCheck={allFilled}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "flex", gap: 24, maxWidth: 560, margin: "0 auto" }}>
          <div style={{
            background: "var(--paper-2)",
            borderRadius: 14,
            border: "2px solid var(--ink-100)",
            padding: 8,
          }}>
            {Array.from({ length: GRID_H }, (_, r) => (
              <div key={r} style={{ display: "flex" }}>
                {Array.from({ length: GRID_W }, (_, c) => {
                  const key = `${r},${c}`;
                  const cell = CELLS[key];
                  const v = vals[key] || "";
                  const ok = fb && v.toUpperCase() === cell?.ch;
                  const no = fb && cell && v.toUpperCase() !== cell.ch;
                  if (!cell) return (
                    <div key={c} style={{ width: 44, height: 44, background: "var(--ink-50)", margin: 2, borderRadius: 6 }} />
                  );
                  return (
                    <div key={c} style={{ position: "relative", width: 44, height: 44, margin: 2 }}>
                      {cell.num && (
                        <span style={{
                          position: "absolute", top: 2, left: 4,
                          fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--ink-500)", fontWeight: 700,
                        }}>{cell.num}</span>
                      )}
                      <input
                        ref={(el) => (refs.current[key] = el)}
                        value={v}
                        disabled={!!fb}
                        maxLength={1}
                        onChange={(e) => {
                          const ch = e.target.value.toUpperCase().slice(-1);
                          setVals((vv) => ({ ...vv, [key]: ch }));
                        }}
                        style={{
                          width: 44, height: 44,
                          textAlign: "center",
                          textTransform: "uppercase",
                          background: ok ? "var(--green-50)" : no ? "var(--coral-50)" : "var(--paper)",
                          border: `2px solid ${ok ? "var(--green-500)" : no ? "var(--coral-500)" : "var(--ink-200)"}`,
                          borderRadius: 6,
                          fontFamily: "var(--font-sans)",
                          fontWeight: 800,
                          fontSize: 18,
                          color: "var(--ink-900)",
                          padding: 0,
                          outline: "none",
                        }}
                      />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ flex: 1, fontSize: 14 }}>
            <div className="gp-eyebrow" style={{ marginBottom: 10 }}>Clues</div>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, color: "var(--ink-500)", fontSize: 12, marginBottom: 4 }}>ACROSS</div>
              <div><b style={{ fontFamily: "var(--font-mono)" }}>1.</b> Instructions a computer runs</div>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: "var(--ink-500)", fontSize: 12, marginBottom: 4 }}>DOWN</div>
              <div><b style={{ fontFamily: "var(--font-mono)" }}>2.</b> Information processed by programs</div>
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 14. WORD SEARCH ───────────────────────────────────────────────
function WordSearchExerciseV2() {
  const WORDS = ["LOOP", "VAR", "BYTE"];
  // 7×7 grid
  const GRID = [
    "ABLOOPX",
    "VARQRSE",
    "WBYTEZA",
    "TPMNOPB",
    "CDEFGHI",
    "JKLMNOP",
    "QRSTUVW",
  ];
  // Word positions: LOOP at (0,3..6), VAR at (1,0..2), BYTE at (2,1..4)
  const wordCells = {
    LOOP: ["0,3","0,4","0,5","0,6"],
    VAR: ["1,0","1,1","1,2"],
    BYTE: ["2,1","2,2","2,3","2,4"],
  };
  const [selecting, setSelecting] = useStateL(false);
  const [start, setStart] = useStateL(null);
  const [drag, setDrag] = useStateL([]); // array of "r,c"
  const [found, setFound] = useStateL({}); // word -> cells
  const [fb, setFb] = useStateL(null);
  const { fire, layer } = useConfetti();

  const cellsBetween = (a, b) => {
    if (!a || !b) return [];
    const [ar, ac] = a.split(",").map(Number);
    const [br, bc] = b.split(",").map(Number);
    const dr = Math.sign(br - ar), dc = Math.sign(bc - ac);
    // only allow horiz/vert/diag straight lines
    if (dr === 0 && dc === 0) return [a];
    if (dr !== 0 && dc !== 0 && Math.abs(br - ar) !== Math.abs(bc - ac)) return [];
    if (dr === 0 || dc === 0 || Math.abs(br - ar) === Math.abs(bc - ac)) {
      const steps = Math.max(Math.abs(br - ar), Math.abs(bc - ac));
      const cells = [];
      for (let i = 0; i <= steps; i++) cells.push(`${ar + dr * i},${ac + dc * i}`);
      return cells;
    }
    return [];
  };

  const onCellDown = (k) => {
    if (fb) return;
    setSelecting(true); setStart(k); setDrag([k]);
  };
  const onCellEnter = (k) => {
    if (!selecting) return;
    setDrag(cellsBetween(start, k));
  };
  const onUp = () => {
    if (!selecting) return;
    // check if drag matches any word
    const word = drag.map((c) => {
      const [r, cc] = c.split(",").map(Number);
      return GRID[r][cc];
    }).join("");
    const matchW = WORDS.find((w) => (w === word || w === word.split("").reverse().join("")) && !found[w]);
    if (matchW) setFound({ ...found, [matchW]: drag });
    setSelecting(false); setStart(null); setDrag([]);
  };

  useEffectL(() => {
    if (Object.keys(found).length === WORDS.length && !fb) {
      setTimeout(() => { setFb({ kind: "ok", msg: "All three found." }); fire(); }, 200);
    }
  }, [found]);

  const cont = () => { setFb(null); setFound({}); };
  const allCells = new Set();
  Object.values(found).forEach((cs) => cs.forEach((c) => allCells.add(c)));
  const dragSet = new Set(drag);

  return (
    <div style={{ position: "relative", height: "100%" }} onMouseUp={onUp}>
      {layer}
      <LessonShell
        hearts={5} streak={4} step={7} totalSteps={12}
        eyebrow="VOCAB · CODE WORDS"
        title="Find all three words"
        feedback={fb}
        canCheck={false}
        onCheck={() => {}}
        onContinue={cont}
        showSkip={false}
      >
        <div style={{ display: "flex", gap: 28, maxWidth: 540, margin: "0 auto" }}>
          <div style={{
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 14,
            padding: 8,
            userSelect: "none",
          }}>
            {GRID.map((row, r) => (
              <div key={r} style={{ display: "flex" }}>
                {row.split("").map((ch, c) => {
                  const k = `${r},${c}`;
                  const isFound = allCells.has(k);
                  const isDrag = dragSet.has(k);
                  return (
                    <div
                      key={c}
                      onMouseDown={() => onCellDown(k)}
                      onMouseEnter={() => onCellEnter(k)}
                      style={{
                        width: 36, height: 36, margin: 2,
                        display: "grid", placeItems: "center",
                        background: isFound ? "var(--green-100)" : isDrag ? "var(--sun-100)" : "var(--paper)",
                        borderRadius: 6,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 15,
                        color: isFound ? "var(--green-800)" : "var(--ink-900)",
                        cursor: fb ? "default" : "pointer",
                        transition: "background 120ms",
                      }}
                    >{ch}</div>
                  );
                })}
              </div>
            ))}
          </div>
          <div style={{ flex: 1 }}>
            <div className="gp-eyebrow" style={{ marginBottom: 10 }}>To find</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {WORDS.map((w) => (
                <div key={w} style={{
                  padding: "8px 14px",
                  background: found[w] ? "var(--green-50)" : "var(--paper-2)",
                  border: `2px solid ${found[w] ? "var(--green-500)" : "var(--ink-100)"}`,
                  borderRadius: 999,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  fontSize: 14,
                  color: found[w] ? "var(--green-800)" : "var(--ink-900)",
                  textDecoration: found[w] ? "line-through" : "none",
                  display: "inline-flex", alignItems: "center", gap: 8,
                }}>
                  {found[w] && <Icon.Check s={14} />}
                  {w}
                </div>
              ))}
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 15. SRS FLASHCARD ────────────────────────────────────────────
function SRSFlashcardExerciseV2() {
  const CARDS = [
    { front: "猫", back: "cat", pinyin: "māo" },
    { front: "狗", back: "dog", pinyin: "gǒu" },
    { front: "鸟", back: "bird", pinyin: "niǎo" },
  ];
  const [idx, setIdx] = useStateL(0);
  const [flipped, setFlipped] = useStateL(false);
  const [stats, setStats] = useStateL({ again: 0, hard: 0, good: 0, easy: 0 });
  const [done, setDone] = useStateL(false);
  const { fire, layer } = useConfetti();

  const rate = (key) => {
    setStats({ ...stats, [key]: stats[key] + 1 });
    if (idx === CARDS.length - 1) { setDone(true); fire(); return; }
    setIdx(idx + 1); setFlipped(false);
  };

  const card = CARDS[idx];

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={14}
        eyebrow={`CHINESE · DECK ${done ? "DONE" : (idx + 1) + " OF " + CARDS.length}`}
        title="Review"
        feedback={done ? { kind: "ok", msg: `Deck complete — ${stats.good + stats.easy}/${CARDS.length} known.` } : null}
        onContinue={() => { setIdx(0); setFlipped(false); setStats({again:0,hard:0,good:0,easy:0}); setDone(false); }}
        canCheck={false}
        onCheck={() => {}}
        showSkip={false}
      >
        {!done && (
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            <div
              onClick={() => setFlipped(!flipped)}
              style={{
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: 18,
                minHeight: 260,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                position: "relative",
                boxShadow: "0 4px 0 0 var(--ink-100)",
                marginBottom: 20,
                transition: "transform 200ms",
                userSelect: "none",
              }}
            >
              <div style={{ position: "absolute", top: 14, left: 14 }} className="gp-eyebrow">
                {flipped ? "MEANING" : "HANZI"}
              </div>
              <div style={{ textAlign: "center", padding: 24 }}>
                {!flipped ? (
                  <>
                    <div style={{ fontSize: 84, fontWeight: 700, color: "var(--ink-900)", lineHeight: 1 }}>{card.front}</div>
                    <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-400)" }}>Tap to flip</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 36, fontWeight: 800, color: "var(--ink-900)" }}>{card.back}</div>
                    <div style={{ marginTop: 6, fontSize: 18, color: "var(--ink-500)", fontFamily: "var(--font-mono)" }}>{card.pinyin}</div>
                  </>
                )}
              </div>
            </div>
            {flipped && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
                {[
                  { key: "again", label: "Again", color: "var(--coral-500)", shadow: "var(--coral-700)", sub: "<1m" },
                  { key: "hard", label: "Hard", color: "var(--sun-400)", shadow: "var(--sun-500)", sub: "6m" },
                  { key: "good", label: "Good", color: "var(--green-600)", shadow: "var(--green-700)", sub: "10m" },
                  { key: "easy", label: "Easy", color: "var(--green-500)", shadow: "var(--green-700)", sub: "4d" },
                ].map((b) => (
                  <button
                    key={b.key}
                    onClick={() => rate(b.key)}
                    style={{
                      background: b.color, color: ["sun"].some((k) => b.color.includes(k)) ? "var(--ink-900)" : "#fff",
                      border: "none",
                      padding: "10px 0",
                      borderRadius: 12,
                      cursor: "pointer",
                      boxShadow: `0 4px 0 0 ${b.shadow}`,
                      fontWeight: 800,
                      fontFamily: "var(--font-sans)",
                      fontSize: 13,
                      transition: "transform 100ms, box-shadow 100ms",
                    }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = "translateY(2px)"; e.currentTarget.style.boxShadow = `0 2px 0 0 ${b.shadow}`; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = `0 4px 0 0 ${b.shadow}`; }}
                  >
                    <div>{b.label}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 500, opacity: 0.85, marginTop: 2 }}>{b.sub}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </LessonShell>
    </div>
  );
}

Object.assign(window, {
  TranslationExerciseV2, SentenceBuilderExerciseV2, DialogueExerciseV2,
  ConjugationExerciseV2, ReadingExerciseV2, CrosswordExerciseV2,
  WordSearchExerciseV2, SRSFlashcardExerciseV2,
});
