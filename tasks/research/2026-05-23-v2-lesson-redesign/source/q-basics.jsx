// q-basics.jsx — quiz family
// QuizExercise, TrueFalseExercise, FillBlanksExercise, MatchingExercise,
// OrderingExercise, CategorizeExercise, BubbleSheetExercise

const { useState: useStateB, useRef: useRefB, useEffect: useEffectB } = React;

// ─── 1. QUIZ (multiple choice) ─────────────────────────────────────
function QuizExerciseV2() {
  const QUESTION = {
    eyebrow: "PYTHON · LESSON 6 / 12",
    prompt: "Which keyword defines a function in Python?",
    options: ["function", "def", "fn", "func"],
    correct: 1,
    explain: "Python uses def to introduce a function definition.",
  };
  const [pick, setPick] = useStateB(null);
  const [fb, setFb] = useStateB(null);
  const [hearts, setHearts] = useStateB(4);
  const [lost, setLost] = useStateB(false);
  const { fire, layer } = useConfetti();

  const check = () => {
    if (pick === QUESTION.correct) {
      setFb({ kind: "ok", msg: "Exactly right.", explain: QUESTION.explain });
      fire();
    } else {
      setHearts((h) => Math.max(0, h - 1));
      setLost(true);
      setTimeout(() => setLost(false), 500);
      setFb({ kind: "no", msg: "Not quite.", correct: QUESTION.options[QUESTION.correct], explain: QUESTION.explain });
    }
  };
  const cont = () => { setFb(null); setPick(null); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={hearts} streak={7} step={5} totalSteps={12} lostHeart={lost}
        eyebrow={QUESTION.eyebrow}
        title={<>Choose the <span className="gp-mark">correct</span> keyword</>}
        feedback={fb}
        canCheck={pick !== null}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 460, margin: "0 auto" }}>
          {QUESTION.options.map((opt, i) => {
            let state = "";
            if (fb) {
              if (i === QUESTION.correct) state = "correct";
              else if (i === pick) state = "wrong";
              else state = "locked";
            } else if (pick === i) state = "selected";
            return (
              <button
                key={i}
                className={"gp-tile " + state}
                style={{ justifyContent: "space-between", padding: "16px 20px", fontFamily: "var(--font-mono)" }}
                onClick={() => !fb && setPick(i)}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
                  <kbd style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                    padding: "3px 8px",
                    borderRadius: 6,
                    border: "1.5px solid currentColor",
                    opacity: 0.5,
                  }}>{i + 1}</kbd>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 2. TRUE / FALSE ───────────────────────────────────────────────
function TrueFalseExerciseV2() {
  const STMT = {
    text: "In Python, lists are immutable.",
    answer: false,
    explain: "Lists are mutable. Tuples are the immutable variant.",
  };
  const [pick, setPick] = useStateB(null);
  const [fb, setFb] = useStateB(null);
  const { fire, layer } = useConfetti();

  const check = () => {
    if (pick === STMT.answer) {
      setFb({ kind: "ok", msg: "Right!", explain: STMT.explain });
      fire();
    } else {
      setFb({ kind: "no", msg: "Not quite.", correct: STMT.answer ? "True" : "False", explain: STMT.explain });
    }
  };
  const cont = () => { setFb(null); setPick(null); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={3} streak={12} step={7} totalSteps={12}
        eyebrow="PYTHON · CORE TYPES"
        title="True or false?"
        feedback={fb}
        canCheck={pick !== null}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{
          background: "var(--paper-2)",
          border: "2px solid var(--ink-100)",
          borderRadius: 18,
          padding: "26px 24px",
          textAlign: "center",
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          color: "var(--ink-900)",
          maxWidth: 460, margin: "0 auto 24px",
          lineHeight: 1.5,
        }}>
          “{STMT.text}”
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center" }}>
          {[true, false].map((v) => {
            let state = "";
            if (fb) {
              if (v === STMT.answer) state = "correct";
              else if (v === pick) state = "wrong";
              else state = "locked";
            } else if (pick === v) state = "selected";
            return (
              <button
                key={String(v)}
                className={"gp-tile " + state}
                style={{ minWidth: 140, padding: "20px 24px", fontSize: 17 }}
                onClick={() => !fb && setPick(v)}
              >
                {v ? "True" : "False"}
              </button>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 3. FILL IN THE BLANKS ─────────────────────────────────────────
function FillBlanksExerciseV2() {
  // Template: "The {{blank}} of an array is the {{blank}} of its elements."
  const parts = ["The ", null, " of an array is the ", null, " of its elements."];
  const correctAns = ["length", "count"];
  const bank = ["count", "size", "length", "amount", "total"];
  const [used, setUsed] = useStateB([]); // word indices used in slots, in order
  const [slots, setSlots] = useStateB([null, null]); // word indices
  const [fb, setFb] = useStateB(null);
  const { fire, layer } = useConfetti();

  const place = (wi) => {
    const empty = slots.findIndex((s) => s === null);
    if (empty < 0 || fb) return;
    const ns = slots.slice(); ns[empty] = wi;
    setSlots(ns);
    setUsed([...used, wi]);
  };
  const unplace = (si) => {
    if (slots[si] === null || fb) return;
    const wi = slots[si];
    const ns = slots.slice(); ns[si] = null;
    setSlots(ns);
    setUsed(used.filter((u) => u !== wi));
  };

  const check = () => {
    const got = slots.map((s) => s == null ? "" : bank[s]);
    const ok = got[0] === correctAns[0] && got[1] === correctAns[1];
    if (ok) { setFb({ kind: "ok", msg: "Sweet." }); fire(); }
    else setFb({ kind: "no", msg: "Not quite.", correct: correctAns.join(" · ") });
  };
  const cont = () => { setFb(null); setSlots([null, null]); setUsed([]); };

  const allFilled = slots.every((s) => s !== null);
  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={3} step={2} totalSteps={10}
        eyebrow="ARRAYS · BASICS"
        title="Tap the words to fill the blanks"
        feedback={fb}
        canCheck={allFilled}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{
          fontSize: 19, lineHeight: 2.2, color: "var(--ink-900)", maxWidth: 520, margin: "8px auto 28px",
          textAlign: "center", fontWeight: 600,
        }}>
          {parts.map((p, i) => {
            if (p !== null) return <span key={i}>{p}</span>;
            const si = parts.slice(0, i).filter((x) => x === null).length;
            const wi = slots[si];
            return (
              <button
                key={i}
                onClick={() => unplace(si)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 96,
                  padding: "6px 12px",
                  margin: "0 4px",
                  borderRadius: 10,
                  border: "none",
                  background: wi == null ? "transparent" : "var(--green-50)",
                  borderBottom: wi == null ? "3px solid var(--ink-300)" : "3px solid var(--green-500)",
                  fontWeight: 700,
                  fontSize: 19,
                  color: wi == null ? "transparent" : "var(--green-800)",
                  cursor: "pointer",
                  fontFamily: "var(--font-sans)",
                }}
              >
                {wi == null ? "_" : bank[wi]}
              </button>
            );
          })}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", maxWidth: 520, margin: "0 auto" }}>
          {bank.map((w, i) => (
            <button
              key={i}
              className={"gp-tile " + (used.includes(i) ? "locked" : "")}
              style={{ padding: "10px 18px", fontSize: 16, opacity: used.includes(i) ? 0.3 : 1 }}
              onClick={() => place(i)}
            >
              {w}
            </button>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 4. MATCHING ────────────────────────────────────────────────────
function MatchingExerciseV2() {
  // Each pair {left, right} — but display shuffled
  const PAIRS = [
    { left: "len()", right: "size of a sequence" },
    { left: "str()", right: "convert to string" },
    { left: "int()", right: "convert to integer" },
    { left: "abs()", right: "absolute value" },
  ];
  const [leftOrder] = useStateB(() => shuffle([0, 1, 2, 3]));
  const [rightOrder] = useStateB(() => shuffle([0, 1, 2, 3]));
  const [pickedL, setPickedL] = useStateB(null);
  const [pickedR, setPickedR] = useStateB(null);
  const [matched, setMatched] = useStateB({}); // { idx: 'ok' | 'no' }
  const [wrongPair, setWrongPair] = useStateB(null);
  const [fb, setFb] = useStateB(null);
  const { fire, layer } = useConfetti();

  useEffectB(() => {
    if (pickedL !== null && pickedR !== null) {
      if (pickedL === pickedR) {
        const nm = { ...matched, [pickedL]: "ok" };
        setMatched(nm);
        setPickedL(null); setPickedR(null);
        if (Object.keys(nm).length === PAIRS.length) {
          setTimeout(() => { setFb({ kind: "ok", msg: "All matched!" }); fire(); }, 300);
        }
      } else {
        setWrongPair([pickedL, pickedR]);
        setTimeout(() => { setWrongPair(null); setPickedL(null); setPickedR(null); }, 600);
      }
    }
  }, [pickedL, pickedR]);

  const cont = () => { setFb(null); setMatched({}); setPickedL(null); setPickedR(null); };

  const stateForLeft = (idx) => {
    if (matched[idx] === "ok") return "correct";
    if (wrongPair && wrongPair[0] === idx) return "wrong";
    if (pickedL === idx) return "selected";
    return "";
  };
  const stateForRight = (idx) => {
    if (matched[idx] === "ok") return "correct";
    if (wrongPair && wrongPair[1] === idx) return "wrong";
    if (pickedR === idx) return "selected";
    return "";
  };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={9} step={8} totalSteps={12}
        eyebrow="PYTHON · BUILT-INS"
        title="Tap the matching pairs"
        feedback={fb}
        canCheck={false}
        checkLabel="Check"
        onCheck={() => {}}
        onContinue={cont}
        showSkip={false}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 520, margin: "0 auto" }}>
          {leftOrder.map((idx) => (
            <button
              key={"l" + idx}
              className={"gp-tile " + stateForLeft(idx)}
              style={{ fontFamily: "var(--font-mono)", padding: "14px 16px", fontSize: 16 }}
              disabled={matched[idx] === "ok"}
              onClick={() => setPickedL(idx)}
            >
              {PAIRS[idx].left}
            </button>
          ))}
          {rightOrder.map((idx) => (
            <button
              key={"r" + idx}
              className={"gp-tile " + stateForRight(idx)}
              style={{ padding: "14px 16px", fontSize: 14 }}
              disabled={matched[idx] === "ok"}
              onClick={() => setPickedR(idx)}
            >
              {PAIRS[idx].right}
            </button>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}
// fix: rewrite MatchingExerciseV2 grid layout (the above reduce was a noop & weird)
// — react renders left then right rows naturally, that's actually what we want
// since grid auto-flows row by row. We'll just keep the structure clean.

// ─── 5. ORDERING ───────────────────────────────────────────────────
function OrderingExerciseV2() {
  const STEPS = [
    "Initialize an empty result list",
    "Loop through each item in the input",
    "Apply the transformation",
    "Append to the result list",
    "Return the result list",
  ];
  const CORRECT = [0, 1, 2, 3, 4];
  const [order, setOrder] = useStateB(() => shuffle([0, 1, 2, 3, 4]));
  const [fb, setFb] = useStateB(null);
  const dragIdx = useRefB(null);
  const { fire, layer } = useConfetti();

  const onDragStart = (i) => (e) => {
    dragIdx.current = i;
    e.dataTransfer.effectAllowed = "move";
  };
  const onDragOver = (i) => (e) => {
    e.preventDefault();
    if (dragIdx.current === null || dragIdx.current === i) return;
    const next = order.slice();
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    dragIdx.current = i;
    setOrder(next);
  };
  const onDragEnd = () => { dragIdx.current = null; };

  const check = () => {
    const ok = order.every((v, i) => v === CORRECT[i]);
    if (ok) { setFb({ kind: "ok", msg: "Perfect order." }); fire(); }
    else setFb({ kind: "no", msg: "The steps aren't right.", explain: "Try moving the loop body before the return." });
  };
  const cont = () => { setFb(null); setOrder(shuffle([0,1,2,3,4])); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={4} streak={5} step={9} totalSteps={12}
        eyebrow="ALGORITHMS · MAP"
        title="Drag the steps into the right order"
        feedback={fb}
        canCheck={true}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 480, margin: "0 auto" }}>
          {order.map((idx, i) => (
            <div
              key={idx}
              draggable={!fb}
              onDragStart={onDragStart(i)}
              onDragOver={onDragOver(i)}
              onDragEnd={onDragEnd}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "14px 16px",
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: 14,
                fontWeight: 600,
                cursor: fb ? "default" : "grab",
                fontSize: 15,
                boxShadow: "0 2px 0 0 var(--ink-100)",
              }}
            >
              <span style={{
                fontFamily: "var(--font-mono)",
                background: "var(--ink-50)",
                color: "var(--ink-500)",
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 12,
                fontWeight: 700,
              }}>{i + 1}</span>
              <span style={{ flex: 1 }}>{STEPS[idx]}</span>
              <span style={{ color: "var(--ink-300)" }}><Icon.Grip /></span>
            </div>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 6. CATEGORIZE ──────────────────────────────────────────────────
function CategorizeExerciseV2() {
  const CATS = [
    { name: "Mutable", color: "var(--green-50)", border: "var(--green-300)", items: ["list", "dict", "set"] },
    { name: "Immutable", color: "var(--sun-50)", border: "var(--sun-400)", items: ["tuple", "str", "int"] },
  ];
  const ALL = CATS.flatMap((c) => c.items);
  const [placed, setPlaced] = useStateB({}); // { item: catName }
  const [hover, setHover] = useStateB(null);
  const [fb, setFb] = useStateB(null);
  const dragItem = useRefB(null);
  const { fire, layer } = useConfetti();

  const handleDrop = (cat) => () => {
    if (!dragItem.current) return;
    setPlaced({ ...placed, [dragItem.current]: cat });
    dragItem.current = null;
    setHover(null);
  };

  const check = () => {
    const allPlaced = ALL.every((it) => placed[it]);
    if (!allPlaced) return;
    const ok = ALL.every((it) => {
      const cat = CATS.find((c) => c.items.includes(it));
      return placed[it] === cat.name;
    });
    if (ok) { setFb({ kind: "ok", msg: "Spot on." }); fire(); }
    else setFb({ kind: "no", msg: "Some are in the wrong bucket.", correct: "list/dict/set → Mutable · tuple/str/int → Immutable" });
  };
  const cont = () => { setFb(null); setPlaced({}); };

  const unplaced = ALL.filter((it) => !placed[it]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={2} step={3} totalSteps={10}
        eyebrow="PYTHON · TYPE SYSTEM"
        title="Drag each type into its bucket"
        feedback={fb}
        canCheck={Object.keys(placed).length === ALL.length}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "flex", gap: 12, marginBottom: 16, justifyContent: "center", maxWidth: 520, margin: "0 auto 16px" }}>
          {CATS.map((c) => {
            const items = ALL.filter((it) => placed[it] === c.name);
            return (
              <div
                key={c.name}
                onDragOver={(e) => { e.preventDefault(); setHover(c.name); }}
                onDragLeave={() => setHover(null)}
                onDrop={handleDrop(c.name)}
                style={{
                  flex: 1,
                  minHeight: 140,
                  background: c.color,
                  border: `2px dashed ${hover === c.name ? c.border : "var(--ink-200)"}`,
                  borderRadius: 18,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  transition: "border-color 150ms",
                }}
              >
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  color: "var(--ink-500)",
                  fontWeight: 600,
                }}>{c.name}</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {items.map((it) => (
                    <span
                      key={it}
                      draggable
                      onDragStart={(e) => { dragItem.current = it; e.dataTransfer.effectAllowed = "move"; }}
                      style={{
                        background: "var(--paper-2)",
                        padding: "8px 12px",
                        borderRadius: 999,
                        fontFamily: "var(--font-mono)",
                        fontWeight: 500,
                        fontSize: 14,
                        cursor: "grab",
                        boxShadow: "var(--shadow-sm)",
                      }}
                    >{it}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          padding: 12,
          background: "var(--paper-2)",
          borderRadius: 14,
          border: "2px solid var(--ink-100)",
          minHeight: 60,
          maxWidth: 520, margin: "0 auto",
        }}>
          {unplaced.length === 0
            ? <span style={{ color: "var(--ink-400)", fontSize: 13 }}>All placed — hit Check.</span>
            : unplaced.map((it) => (
              <span
                key={it}
                draggable
                onDragStart={(e) => { dragItem.current = it; e.dataTransfer.effectAllowed = "move"; }}
                style={{
                  background: "var(--ink-50)",
                  padding: "10px 14px",
                  borderRadius: 999,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 500,
                  fontSize: 14,
                  cursor: "grab",
                  boxShadow: "0 2px 0 0 var(--ink-200)",
                }}
              >{it}</span>
            ))}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 7. BUBBLE SHEET (SAT-style) ────────────────────────────────────
function BubbleSheetExerciseV2() {
  const Q = [
    { n: 1, q: "If 3x + 7 = 22, then x = ?", opts: ["3", "5", "7", "15"], correct: 1 },
    { n: 2, q: "The mean of 4, 8, 12, 16 is:", opts: ["8", "9", "10", "12"], correct: 2 },
    { n: 3, q: "If f(x) = x² + 1, then f(3) =", opts: ["7", "9", "10", "16"], correct: 2 },
  ];
  const [ans, setAns] = useStateB({});
  const [fb, setFb] = useStateB(null);
  const { fire, layer } = useConfetti();

  const allAnswered = Q.every((q) => ans[q.n] != null);
  const check = () => {
    const correct = Q.filter((q) => ans[q.n] === q.correct).length;
    if (correct === Q.length) { setFb({ kind: "ok", msg: `${correct}/${Q.length} — perfect score.` }); fire(); }
    else setFb({ kind: "no", msg: `${correct}/${Q.length} correct.`, explain: "Review the marked answers below." });
  };
  const cont = () => { setFb(null); setAns({}); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={4} step={6} totalSteps={12}
        eyebrow="SAT · MATH · SECTION 1"
        title="Fill in the bubble for each answer"
        feedback={fb}
        canCheck={allAnswered}
        onCheck={check}
        onContinue={cont}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 600, margin: "0 auto" }}>
          {Q.map((q) => (
            <div
              key={q.n}
              style={{
                background: "var(--paper-2)",
                border: "2px solid var(--ink-100)",
                borderRadius: 14,
                padding: "14px 18px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <span style={{
                  width: 26, height: 26, borderRadius: 999,
                  background: "var(--ink-50)", color: "var(--ink-500)",
                  display: "grid", placeItems: "center",
                  fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 12,
                  flexShrink: 0,
                }}>{q.n}</span>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, fontWeight: 500, color: "var(--ink-900)", flex: 1 }}>{q.q}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginLeft: 36 }}>
                {q.opts.map((opt, i) => {
                  const picked = ans[q.n] === i;
                  const isCorrect = fb && i === q.correct;
                  const isWrongPick = fb && picked && i !== q.correct;
                  let bg = "var(--paper-2)", color = "var(--ink-700)", border = "var(--ink-200)", bubbleBg = "var(--paper-2)", bubbleColor = "var(--ink-500)";
                  if (isCorrect) { bg = "var(--green-50)"; color = "var(--green-800)"; border = "var(--green-500)"; bubbleBg = "var(--green-600)"; bubbleColor = "#fff"; }
                  else if (isWrongPick) { bg = "var(--coral-50)"; color = "var(--coral-700)"; border = "var(--coral-500)"; bubbleBg = "var(--coral-500)"; bubbleColor = "#fff"; }
                  else if (picked) { bg = "var(--ink-50)"; color = "var(--ink-900)"; border = "var(--ink-900)"; bubbleBg = "var(--ink-900)"; bubbleColor = "#fff"; }
                  return (
                    <button
                      key={i}
                      onClick={() => !fb && setAns({ ...ans, [q.n]: i })}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "8px 10px",
                        background: bg,
                        border: `2px solid ${border}`,
                        borderRadius: 10,
                        cursor: fb ? "default" : "pointer",
                        transition: "all 120ms",
                        fontFamily: "var(--font-sans)",
                        textAlign: "left",
                      }}
                    >
                      <span style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: bubbleBg, color: bubbleColor,
                        border: `2px solid ${border}`,
                        fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 11,
                        display: "grid", placeItems: "center",
                        flexShrink: 0,
                      }}>
                        {String.fromCharCode(65 + i)}
                      </span>
                      <span style={{ color, fontFamily: "var(--font-mono)", fontWeight: 600, fontSize: 14 }}>{opt}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, {
  QuizExerciseV2, TrueFalseExerciseV2, FillBlanksExerciseV2,
  MatchingExerciseV2, OrderingExerciseV2, CategorizeExerciseV2,
  BubbleSheetExerciseV2,
});
