// q-mobile.jsx — mobile (iPhone-sized) variants of the most "Duolingo" exercises
// SentenceBuilderMobile, QuizMobile, FillBlanksMobile, FlashcardMobile

const { useState: useStateMo, useRef: useRefMo, useEffect: useEffectMo } = React;

function MobileFrame({ children }) {
  return (
    <div className="mobile-frame" style={{ display: "flex", flexDirection: "column" }}>
      <div className="mobile-statusbar">
        <span>9:41</span>
        <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 18, height: 10, borderRadius: 2, background: "var(--ink-900)", display: "inline-block", position: "relative" }}>
            <span style={{ position: "absolute", inset: "1.5px 6px 1.5px 1.5px", background: "var(--green-500)", borderRadius: 1 }} />
          </span>
        </span>
      </div>
      <div style={{ flex: 1, overflow: "hidden", borderRadius: "0 0 36px 36px" }}>
        {children}
      </div>
    </div>
  );
}

// ─── M1. Sentence Builder (mobile) ────────────────────────────────
function SentenceBuilderMobile() {
  const PROMPT = "I would like a coffee, please.";
  const FULL = ["Je", "voudrais", "un", "café", "s’il", "vous", "plaît", "le", "tu", "veux"];
  const CORRECT = ["Je", "voudrais", "un", "café", "s’il", "vous", "plaît"];
  const [bank, setBank] = useStateMo(() => shuffle(FULL.map((w, i) => ({ w, i }))));
  const [picked, setPicked] = useStateMo([]);
  const [fb, setFb] = useStateMo(null);
  const { fire, layer } = useConfetti();

  const pick = (item) => { if (fb) return; setBank(bank.filter((b) => b.i !== item.i)); setPicked([...picked, item]); };
  const unpick = (item) => { if (fb) return; setPicked(picked.filter((p) => p.i !== item.i)); setBank([...bank, item]); };
  const check = () => {
    const got = picked.map((p) => p.w);
    const ok = got.length === CORRECT.length && got.every((w, i) => w === CORRECT[i]);
    if (ok) { setFb({ kind: "ok", msg: "Excellent!" }); fire(); }
    else setFb({ kind: "no", msg: "Almost.", correct: CORRECT.join(" ") });
  };
  const cont = () => { setFb(null); setBank(shuffle(FULL.map((w, i) => ({ w, i })))); setPicked([]); };

  return (
    <MobileFrame>
      <div style={{ position: "relative", height: "100%" }}>
        {layer}
        <LessonShell
          hearts={3} streak={18} step={6} totalSteps={12}
          eyebrow="FRENCH · A1"
          title="Build the sentence"
          feedback={fb}
          canCheck={picked.length > 0}
          onCheck={check}
          onContinue={cont}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start", marginBottom: 16 }}>
            <button style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--green-50)", color: "var(--green-700)",
              border: "2px solid var(--green-200)", display: "grid", placeItems: "center",
              flexShrink: 0,
            }}><Icon.Volume s={18} /></button>
            <div style={{
              flex: 1, padding: "10px 14px",
              background: "var(--paper-2)", borderRadius: 12, border: "2px solid var(--ink-100)",
              fontSize: 15, fontWeight: 600,
            }}>{PROMPT}</div>
          </div>

          <div style={{
            minHeight: 100,
            padding: 8,
            borderTop: "2px solid var(--ink-100)", borderBottom: "2px solid var(--ink-100)",
            display: "flex", flexWrap: "wrap", gap: 6,
            alignContent: "flex-start",
            marginBottom: 18,
          }}>
            {picked.map((p) => (
              <button key={p.i} className="gp-tile" style={{ padding: "8px 12px", fontSize: 15 }} onClick={() => unpick(p)}>
                {p.w}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
            {bank.map((b) => (
              <button key={b.i} className="gp-tile" style={{ padding: "8px 12px", fontSize: 15 }} onClick={() => pick(b)}>
                {b.w}
              </button>
            ))}
          </div>
        </LessonShell>
      </div>
    </MobileFrame>
  );
}

// ─── M2. Quiz (mobile) ─────────────────────────────────────────────
function QuizMobile() {
  const Q = {
    prompt: "Which keyword defines a function in Python?",
    options: ["function", "def", "fn", "func"],
    correct: 1,
    explain: "Python uses def to introduce a function definition.",
  };
  const [pick, setPick] = useStateMo(null);
  const [fb, setFb] = useStateMo(null);
  const { fire, layer } = useConfetti();

  const check = () => {
    if (pick === Q.correct) { setFb({ kind: "ok", msg: "Exactly right.", explain: Q.explain }); fire(); }
    else setFb({ kind: "no", msg: "Not quite.", correct: Q.options[Q.correct], explain: Q.explain });
  };
  const cont = () => { setFb(null); setPick(null); };

  return (
    <MobileFrame>
      <div style={{ position: "relative", height: "100%" }}>
        {layer}
        <LessonShell
          hearts={4} streak={7} step={5} totalSteps={12}
          eyebrow="PYTHON · CORE"
          title="Pick the keyword"
          feedback={fb}
          canCheck={pick !== null}
          onCheck={check}
          onContinue={cont}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                  style={{ padding: "14px 18px", justifyContent: "flex-start", fontFamily: "var(--font-mono)", fontSize: 16 }}
                  onClick={() => !fb && setPick(i)}
                >
                  <span style={{
                    marginRight: 14,
                    fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800,
                    background: "var(--ink-50)", color: "var(--ink-500)",
                    padding: "3px 8px", borderRadius: 6,
                  }}>{i + 1}</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </LessonShell>
      </div>
    </MobileFrame>
  );
}

// ─── M3. Fill Blanks (mobile) ──────────────────────────────────────
function FillBlanksMobile() {
  const parts = ["The ", null, " of an array is the ", null, " of its elements."];
  const correctAns = ["length", "count"];
  const bank = ["count", "size", "length", "amount"];
  const [used, setUsed] = useStateMo([]);
  const [slots, setSlots] = useStateMo([null, null]);
  const [fb, setFb] = useStateMo(null);
  const { fire, layer } = useConfetti();

  const place = (wi) => {
    const empty = slots.findIndex((s) => s === null);
    if (empty < 0 || fb) return;
    const ns = slots.slice(); ns[empty] = wi;
    setSlots(ns); setUsed([...used, wi]);
  };
  const unplace = (si) => {
    if (slots[si] === null || fb) return;
    const wi = slots[si]; const ns = slots.slice(); ns[si] = null;
    setSlots(ns); setUsed(used.filter((u) => u !== wi));
  };

  const check = () => {
    const got = slots.map((s) => s == null ? "" : bank[s]);
    const ok = got[0] === correctAns[0] && got[1] === correctAns[1];
    if (ok) { setFb({ kind: "ok", msg: "Sweet." }); fire(); }
    else setFb({ kind: "no", msg: "Try again.", correct: correctAns.join(" · ") });
  };
  const cont = () => { setFb(null); setSlots([null, null]); setUsed([]); };

  return (
    <MobileFrame>
      <div style={{ position: "relative", height: "100%" }}>
        {layer}
        <LessonShell
          hearts={5} streak={3} step={2} totalSteps={10}
          eyebrow="ARRAYS · BASICS"
          title="Tap to fill the blanks"
          feedback={fb}
          canCheck={slots.every((s) => s !== null)}
          onCheck={check}
          onContinue={cont}
        >
          <div style={{
            fontSize: 17, lineHeight: 2, textAlign: "center",
            fontWeight: 600, color: "var(--ink-900)", marginBottom: 20,
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
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    minWidth: 80, padding: "4px 10px", margin: "0 3px",
                    borderRadius: 8, border: "none",
                    background: wi == null ? "transparent" : "var(--green-50)",
                    borderBottom: `3px solid ${wi == null ? "var(--ink-300)" : "var(--green-500)"}`,
                    fontWeight: 700, fontSize: 17,
                    color: wi == null ? "transparent" : "var(--green-800)",
                    fontFamily: "var(--font-sans)",
                  }}
                >{wi == null ? "_" : bank[wi]}</button>
              );
            })}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
            {bank.map((w, i) => (
              <button
                key={i}
                className={"gp-tile " + (used.includes(i) ? "locked" : "")}
                style={{ padding: "10px 16px", fontSize: 15, opacity: used.includes(i) ? 0.3 : 1 }}
                onClick={() => place(i)}
              >{w}</button>
            ))}
          </div>
        </LessonShell>
      </div>
    </MobileFrame>
  );
}

// ─── M4. Flashcard (mobile) ─────────────────────────────────────────
function FlashcardMobile() {
  const CARDS = [
    { front: "猫", back: "cat", pinyin: "māo" },
    { front: "狗", back: "dog", pinyin: "gǒu" },
    { front: "鸟", back: "bird", pinyin: "niǎo" },
  ];
  const [idx, setIdx] = useStateMo(0);
  const [flipped, setFlipped] = useStateMo(false);
  const [done, setDone] = useStateMo(false);
  const { fire, layer } = useConfetti();

  const rate = () => {
    if (idx === CARDS.length - 1) { setDone(true); fire(); return; }
    setIdx(idx + 1); setFlipped(false);
  };
  const card = CARDS[idx];

  return (
    <MobileFrame>
      <div style={{ position: "relative", height: "100%" }}>
        {layer}
        <LessonShell
          hearts={5} streak={14}
          eyebrow={`CHINESE · ${done ? "DONE" : (idx + 1) + " / " + CARDS.length}`}
          title="Review"
          feedback={done ? { kind: "ok", msg: "Deck complete." } : null}
          onContinue={() => { setIdx(0); setFlipped(false); setDone(false); }}
          canCheck={false}
          onCheck={() => {}}
          showSkip={false}
        >
          {!done && (
            <div>
              <div
                onClick={() => setFlipped(!flipped)}
                style={{
                  background: "var(--paper-2)",
                  border: "2px solid var(--ink-100)",
                  borderRadius: 18,
                  minHeight: 280,
                  display: "grid", placeItems: "center",
                  cursor: "pointer", position: "relative",
                  boxShadow: "0 4px 0 0 var(--ink-100)",
                  marginBottom: 16,
                }}
              >
                <div style={{ position: "absolute", top: 12, left: 12 }} className="gp-eyebrow">
                  {flipped ? "MEANING" : "HANZI"}
                </div>
                <div style={{ textAlign: "center", padding: 18 }}>
                  {!flipped ? (
                    <>
                      <div style={{ fontSize: 96, fontWeight: 700, lineHeight: 1 }}>{card.front}</div>
                      <div style={{ marginTop: 12, fontSize: 12, color: "var(--ink-400)" }}>Tap to flip</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 36, fontWeight: 800 }}>{card.back}</div>
                      <div style={{ marginTop: 4, fontSize: 17, color: "var(--ink-500)", fontFamily: "var(--font-mono)" }}>{card.pinyin}</div>
                    </>
                  )}
                </div>
              </div>
              {flipped && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {[
                    { label: "Again", color: "var(--coral-500)", shadow: "var(--coral-700)", sub: "<1m" },
                    { label: "Hard", color: "var(--sun-400)", shadow: "var(--sun-500)", sub: "6m", dark: true },
                    { label: "Good", color: "var(--green-600)", shadow: "var(--green-700)", sub: "10m" },
                    { label: "Easy", color: "var(--green-500)", shadow: "var(--green-700)", sub: "4d" },
                  ].map((b, i) => (
                    <button
                      key={i}
                      onClick={rate}
                      style={{
                        background: b.color, color: b.dark ? "var(--ink-900)" : "#fff",
                        border: "none", padding: "10px 0", borderRadius: 10, cursor: "pointer",
                        boxShadow: `0 3px 0 0 ${b.shadow}`,
                        fontWeight: 800, fontSize: 12,
                      }}
                    >
                      <div>{b.label}</div>
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 500, opacity: 0.85, marginTop: 1 }}>{b.sub}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </LessonShell>
      </div>
    </MobileFrame>
  );
}

Object.assign(window, {
  MobileFrame, SentenceBuilderMobile, QuizMobile, FillBlanksMobile, FlashcardMobile,
  CodeMobile, WebEditorMobile,
});

// ─── M5. Code editor (mobile · Replit-style) ───────────────────────
function CodeMobile() {
  const PROBLEM = {
    title: "Two Sum",
    desc: "Return indices of the two numbers that add to target.",
  };
  const [tab, setTab] = useStateMo("code");
  const [code, setCode] = useStateMo(
`def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target-n in seen:
            return [seen[target-n], i]
        seen[n] = i`
  );
  const [running, setRunning] = useStateMo(false);
  const [ran, setRan] = useStateMo(false);
  const inputRef = useRefMo(null);
  const { fire, layer } = useConfetti();

  const insert = (s) => {
    if (!inputRef.current) return;
    const el = inputRef.current;
    const start = el.selectionStart ?? code.length;
    const end = el.selectionEnd ?? code.length;
    const next = code.slice(0, start) + s + code.slice(end);
    setCode(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + s.length, start + s.length);
    });
  };

  const run = () => {
    setRunning(true);
    setTab("console");
    setTimeout(() => { setRunning(false); setRan(true); fire(); }, 700);
  };

  // Mock syntax-highlighted lines for the static "preview" mode
  const lines = code.split("\n");

  return (
    <MobileFrame>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0a1a10", color: "#d4f1c4", fontFamily: "var(--font-mono)" }}>
        {layer}
        {/* top bar */}
        <div style={{
          height: 48, padding: "0 12px",
          display: "flex", alignItems: "center", gap: 10,
          background: "#07251a",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          <button style={{
            background: "transparent", border: "none", color: "#d4f1c4",
            width: 32, height: 32, borderRadius: 8, cursor: "pointer",
            display: "grid", placeItems: "center",
          }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-sans)", fontSize: 11, color: "rgba(212,241,196,0.5)", lineHeight: 1, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>two_sum.py</div>
            <div style={{ fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 14, color: "#fff" }}>{PROBLEM.title}</div>
          </div>
          <button
            onClick={run}
            disabled={running}
            style={{
              background: "var(--green-500)",
              color: "#fff", border: "none",
              padding: "8px 14px", borderRadius: 999,
              fontFamily: "var(--font-sans)", fontWeight: 800, fontSize: 12,
              cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4,
              boxShadow: "0 3px 0 0 var(--green-700)",
            }}
          >
            <Icon.Play s={11} />{running ? "…" : "Run"}
          </button>
        </div>
        {/* tab bar */}
        <div style={{
          display: "flex",
          background: "#07251a",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}>
          {[
            { k: "code", label: "Code" },
            { k: "console", label: "Console" },
            { k: "tests", label: "Tests", badge: ran ? "3/3" : null },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                padding: "10px 0",
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.08em", textTransform: "uppercase",
                color: tab === t.k ? "#8fd770" : "rgba(212,241,196,0.5)",
                borderBottom: tab === t.k ? "2px solid var(--green-500)" : "2px solid transparent",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {t.label}
              {t.badge && (
                <span style={{
                  marginLeft: 6, padding: "2px 6px", borderRadius: 999,
                  background: "var(--green-500)", color: "#0a1a10",
                  fontSize: 9, fontWeight: 800, fontFamily: "var(--font-mono)",
                }}>{t.badge}</span>
              )}
            </button>
          ))}
        </div>

        {/* body */}
        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          {tab === "code" && (
            <div style={{ flex: 1, display: "flex", overflow: "hidden", minHeight: 0 }}>
              {/* line numbers */}
              <div style={{
                padding: "10px 6px",
                fontFamily: "var(--font-mono)", fontSize: 12,
                color: "rgba(212,241,196,0.3)",
                textAlign: "right", userSelect: "none",
                background: "#07251a",
                lineHeight: 1.55,
              }}>
                {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
              </div>
              <textarea
                ref={inputRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                spellCheck={false}
                autoCapitalize="none"
                autoCorrect="off"
                style={{
                  flex: 1,
                  background: "#0a1a10",
                  border: "none", outline: "none", resize: "none",
                  padding: "10px 8px",
                  fontFamily: "var(--font-mono)", fontSize: 12.5,
                  lineHeight: 1.55,
                  color: "#d4f1c4",
                  caretColor: "var(--green-300)",
                }}
              />
            </div>
          )}
          {tab === "console" && (
            <div style={{
              flex: 1, padding: 12, overflow: "auto",
              fontFamily: "var(--font-mono)", fontSize: 12, lineHeight: 1.55,
            }}>
              {running ? (
                <div style={{ color: "rgba(212,241,196,0.5)" }}>
                  <span style={{ color: "var(--sun-400)" }}>›</span> running solution…
                </div>
              ) : ran ? (
                <>
                  <div style={{ color: "rgba(212,241,196,0.5)" }}>
                    <span style={{ color: "var(--green-300)" }}>›</span> python two_sum.py
                  </div>
                  <div style={{ color: "#d4f1c4", marginTop: 4 }}>[0, 1]</div>
                  <div style={{ color: "#d4f1c4" }}>[1, 2]</div>
                  <div style={{ color: "rgba(212,241,196,0.4)", marginTop: 8, fontSize: 11 }}>
                    Process finished · 0.024s · exit 0
                  </div>
                </>
              ) : (
                <div style={{ color: "rgba(212,241,196,0.4)" }}>
                  <span style={{ color: "var(--green-300)" }}>›</span> ready · tap Run
                </div>
              )}
            </div>
          )}
          {tab === "tests" && (
            <div style={{ flex: 1, padding: 12, overflow: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {[
                { n: 1, name: "[2,7,11,15], t=9", passed: ran, time: 11 },
                { n: 2, name: "[3,2,4], t=6", passed: ran, time: 9 },
                { n: 3, name: "[3,3], t=6", passed: ran, time: 8 },
              ].map((t) => (
                <div key={t.n} style={{
                  padding: "10px 12px", borderRadius: 8,
                  background: t.passed ? "rgba(63,176,75,0.15)" : "rgba(255,255,255,0.04)",
                  display: "flex", alignItems: "center", gap: 10,
                  fontFamily: "var(--font-mono)", fontSize: 11.5,
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: 999,
                    background: t.passed ? "var(--green-500)" : "rgba(212,241,196,0.2)",
                    color: "#0a1a10", display: "grid", placeItems: "center",
                  }}>{t.passed ? <Icon.Check s={11} /> : "·"}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: t.passed ? "#8fd770" : "rgba(212,241,196,0.7)", fontWeight: 700 }}>Test {t.n}</div>
                    <div style={{ color: "rgba(212,241,196,0.5)", fontSize: 10.5 }}>{t.name}</div>
                  </div>
                  <span style={{ color: "rgba(212,241,196,0.5)", fontSize: 10 }}>{t.time}ms</span>
                </div>
              ))}
              <div style={{
                marginTop: 4, padding: 10, borderRadius: 8,
                background: ran ? "rgba(63,176,75,0.2)" : "rgba(255,255,255,0.04)",
                fontFamily: "var(--font-sans)", fontWeight: 700, fontSize: 13,
                color: ran ? "var(--green-300)" : "rgba(212,241,196,0.5)",
                textAlign: "center",
              }}>
                {ran ? "All 3 tests passed · +10 XP" : "Run to see results"}
              </div>
            </div>
          )}
        </div>

        {/* code keyboard (always visible above OS keyboard) */}
        {tab === "code" && (
          <div style={{
            borderTop: "1px solid rgba(255,255,255,0.08)",
            background: "#07251a",
            padding: "8px 8px 10px",
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", gap: 4, overflow: "auto" }}>
              {["Tab", "(", ")", "[", "]", "{", "}", ":", ";", "="].map((k) => (
                <CodeKey key={k} k={k} onClick={() => insert(k === "Tab" ? "    " : k)} />
              ))}
            </div>
            <div style={{ display: "flex", gap: 4, overflow: "auto" }}>
              {['"', "'", "#", "_", "<", ">", "+", "-", "*", "/"].map((k) => (
                <CodeKey key={k} k={k} onClick={() => insert(k)} />
              ))}
            </div>
          </div>
        )}
        {/* fake home indicator */}
        <div style={{ height: 22, display: "grid", placeItems: "center", background: tab === "code" ? "#07251a" : "transparent" }}>
          <div style={{ width: 130, height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 999 }} />
        </div>
      </div>
    </MobileFrame>
  );
}
function CodeKey({ k, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        minWidth: 32, height: 32,
        padding: "0 8px",
        background: "rgba(255,255,255,0.06)",
        border: "none", borderRadius: 6,
        color: "#d4f1c4",
        fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600,
        cursor: "pointer",
        flexShrink: 0,
      }}
    >{k}</button>
  );
}

// ─── M6. Web Editor (mobile · CodePen-style tabs + preview) ────────
function WebEditorMobile() {
  const [tab, setTab] = useStateMo("preview");
  const [html, setHtml] = useStateMo(`<button class="btn">Click me</button>`);
  const [css, setCss] = useStateMo(`.btn {
  background: #0a8754;
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 0 0 #07683f;
}`);
  const inputRef = useRefMo(null);

  const code = tab === "html" ? html : tab === "css" ? css : "";
  const setCode = (v) => tab === "html" ? setHtml(v) : tab === "css" ? setCss(v) : null;

  const srcDoc = `<html><head><style>${css}</style></head><body style="display:grid;place-items:center;height:100vh;background:#fafbf6;margin:0;font-family:Manrope,sans-serif">${html}</body></html>`;

  return (
    <MobileFrame>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper)" }}>
        {/* top */}
        <div style={{
          height: 48, padding: "0 14px",
          display: "flex", alignItems: "center", gap: 10,
          borderBottom: "1px solid var(--ink-100)",
          background: "var(--paper-2)",
        }}>
          <button style={{
            background: "transparent", border: "none", padding: 0,
            color: "var(--ink-500)", cursor: "pointer",
            display: "grid", placeItems: "center",
          }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg></button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="gp-eyebrow">HTML/CSS · BRAND BUTTON</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Build the button</div>
          </div>
          <button style={{
            background: "var(--green-600)", color: "#fff",
            border: "none", borderRadius: 999,
            padding: "8px 14px", fontWeight: 800, fontSize: 12,
            cursor: "pointer", boxShadow: "0 3px 0 0 var(--green-700)",
          }}>Submit</button>
        </div>
        {/* tab bar — sticky */}
        <div style={{
          display: "flex",
          background: "var(--paper-2)",
          borderBottom: "1px solid var(--ink-100)",
        }}>
          {[
            { k: "html", label: "HTML", color: "var(--coral-500)" },
            { k: "css", label: "CSS", color: "var(--info)" },
            { k: "js", label: "JS", color: "var(--sun-500)" },
            { k: "preview", label: "Preview", color: "var(--green-600)" },
          ].map((t) => (
            <button
              key={t.k}
              onClick={() => setTab(t.k)}
              style={{
                flex: 1, padding: "10px 0",
                background: "transparent", border: "none",
                fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.08em",
                color: tab === t.k ? t.color : "var(--ink-400)",
                borderBottom: tab === t.k ? `2px solid ${t.color}` : "2px solid transparent",
                cursor: "pointer",
              }}
            >{t.label}</button>
          ))}
        </div>
        {/* body */}
        {tab === "preview" ? (
          <iframe srcDoc={srcDoc} style={{ flex: 1, border: "none", background: "var(--paper)" }} />
        ) : tab === "js" ? (
          <div style={{
            flex: 1, display: "grid", placeItems: "center",
            background: "var(--ink-50)",
            fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-400)",
            padding: 20, textAlign: "center",
          }}>
            // no JavaScript needed for this exercise.<br/>switch back to HTML or CSS.
          </div>
        ) : (
          <div style={{ flex: 1, display: "flex", minHeight: 0, background: "#0a1a10" }}>
            <div style={{
              padding: "10px 6px",
              fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.55,
              color: "rgba(212,241,196,0.3)", textAlign: "right",
              background: "#07251a", flexShrink: 0,
            }}>
              {code.split("\n").map((_, i) => <div key={i}>{i + 1}</div>)}
            </div>
            <textarea
              ref={inputRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              autoCapitalize="none"
              autoCorrect="off"
              style={{
                flex: 1,
                background: "#0a1a10",
                border: "none", outline: "none", resize: "none",
                padding: "10px 8px",
                fontFamily: "var(--font-mono)", fontSize: 12,
                lineHeight: 1.55, color: "#d4f1c4",
                caretColor: "var(--green-300)",
              }}
            />
          </div>
        )}
        {/* requirements strip · always visible */}
        <div style={{
          padding: "8px 12px",
          background: "var(--green-50)",
          borderTop: "2px solid var(--green-200)",
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <span style={{
            width: 22, height: 22, borderRadius: 999,
            background: "var(--green-600)", color: "#fff",
            display: "grid", placeItems: "center", flexShrink: 0,
          }}><Icon.Check s={12} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--green-700)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>3 / 3 requirements</div>
            <div style={{ fontSize: 12, color: "var(--green-800)", fontWeight: 700 }}>Button, brand color, padding & radius</div>
          </div>
        </div>
        {/* fake home indicator */}
        <div style={{ height: 22, display: "grid", placeItems: "center", background: tab === "html" || tab === "css" ? "#07251a" : "var(--paper-2)" }}>
          <div style={{ width: 130, height: 4, background: tab === "html" || tab === "css" ? "rgba(255,255,255,0.3)" : "rgba(10,26,16,0.3)", borderRadius: 999 }} />
        </div>
      </div>
    </MobileFrame>
  );
}
