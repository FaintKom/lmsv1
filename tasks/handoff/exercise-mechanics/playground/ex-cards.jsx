/* ex-cards.jsx — CardSortV2 + SRSFlashcardV2 (batch 4 ports with audit fixes)

   CardSortV2:
   - CS-01 HTML5 drag-and-drop replaced with pointer events — upstream
           used draggable/onDrop which DOES NOT FIRE on iOS/Android touch.
           Tap-to-arm → tap-a-column included (keyboard + touch path).
   - CS-02 on retry, wrong cards hop back to the bank (correct stay locked)
   - CS-03 structured reveal list
   - CS-06 placed cards are tappable to return to the bank

   SRSFlashcardV2:
   - SR-01 keyboard: Space/Enter flips, 1–4 rates
   - SR-02 rating buttons go 2×2 in narrow containers
   - SR-03 "Again" cards re-queue within the session (upstream dropped them
           — a card you failed never came back)
   - SR-04 flip card is a real button with aria-pressed; dots show lapses
   - FSRS approximated locally (interval preview table) — production keeps
           ts-fsrs; the UX contract is identical.
*/

const { useState: useStateC, useRef: useRefC, useMemo: useMemoC, useEffect: useEffectC } = React;

/* ════════════════ CARD SORT ════════════════ */
const CS_PAL = [
  { color: "var(--green-50)", border: "var(--green-300)", text: "var(--green-800)" },
  { color: "var(--sun-50)", border: "var(--sun-400)", text: "var(--sun-700)" },
  { color: "var(--coral-50)", border: "var(--coral-300)", text: "var(--coral-700)" },
  { color: "var(--ink-50)", border: "var(--ink-300)", text: "var(--ink-700)" },
];

function CardSortV2({ categories, cards, eyebrow, title, maxAttemptsPerTask = 3, streak: initialStreak = 0, onQuit, onFinish }) {
  const [placed, setPlaced] = useStateC({});
  const [lockedOk, setLockedOk] = useStateC({});
  const [results, setResults] = useStateC({});
  const [drag, setDrag] = useStateC(null);
  const [armed, setArmed] = useStateC(null);
  const [feedback, setFeedback] = useStateC(null);
  const [attemptsLeft, setAttemptsLeft] = useStateC(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateC(0);
  const [lostHeart, setLostHeart] = useStateC(false);
  const [streak, setStreak] = useStateC(initialStreak);
  const [announce, setAnnounce] = useStateC("");
  const start = useRefC({ x: 0, y: 0 });
  const colRefs = useRefC({});
  const { fire, layer } = useConfetti();

  const colAt = (x, y) => {
    for (const c of categories) {
      const el = colRefs.current[c.id];
      if (!el) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return c.id;
    }
    return null;
  };

  const placeCard = (cardId, catId) => {
    setPlaced((p) => ({ ...p, [cardId]: catId }));
    const card = cards.find((c) => c.id === cardId);
    const cat = categories.find((c) => c.id === catId);
    setAnnounce("“" + (card ? card.text : cardId) + "” placed in " + (cat ? cat.label : catId));
  };

  const down = (cardId) => (e) => {
    if (feedback || lockedOk[cardId]) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY };
    setDrag({ id: cardId, dx: 0, dy: 0, over: null, moved: false });
  };
  const move = (e) => {
    if (!drag) return;
    const dx = e.clientX - start.current.x;
    const dy = e.clientY - start.current.y;
    setDrag({ ...drag, dx, dy, over: colAt(e.clientX, e.clientY), moved: drag.moved || Math.hypot(dx, dy) > 6 });
  };
  const up = () => {
    if (!drag) return;
    const { id, over, moved } = drag;
    setDrag(null);
    if (!moved) { setArmed((a) => (a === id ? null : id)); return; }
    setArmed(null);
    if (over) placeCard(id, over);
  };

  const colTap = (catId) => {
    if (!armed || feedback) return;
    const id = armed;
    setArmed(null);
    placeCard(id, catId);
  };

  const returnCard = (cardId) => {
    if (feedback || lockedOk[cardId]) return;
    setPlaced((p) => { const np = { ...p }; delete np[cardId]; return np; });
    setResults((r) => { const nr = { ...r }; delete nr[cardId]; return nr; });
  };

  const allPlaced = cards.every((c) => placed[c.id]);

  const handleCheck = () => {
    const res = {};
    let wrong = 0;
    cards.forEach((c) => {
      const ok = placed[c.id] === c.cat;
      res[c.id] = ok;
      if (!ok) wrong++;
    });
    setResults(res);
    if (wrong === 0) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "All sorted, first try!" : "Got it!" });
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
      setFeedback({
        kind: "no",
        msg: wrong === 1 ? "1 card is in the wrong column" : wrong + " cards are in the wrong columns",
        correctList: cards.map((c) => [c.text, (categories.find((cat) => cat.id === c.cat) || {}).label || c.cat]),
      });
      setStreak(0);
    } else {
      setFeedback({
        kind: "no",
        msg: (wrong === 1 ? "1 card is off" : wrong + " cards are off") + " — " + remaining + (remaining === 1 ? " try left" : " tries left"),
        explain: "The right ones will stay put; the others hop back.",
      });
    }
  };

  const handleRetry = () => {
    /* CS-02: lock correct, bounce wrong back to bank */
    const locks = {};
    const keep = {};
    cards.forEach((c) => {
      if (placed[c.id] === c.cat) { locks[c.id] = true; keep[c.id] = placed[c.id]; }
    });
    setLockedOk(locks);
    setPlaced(keep);
    setResults({});
    setFeedback(null);
  };
  const handleContinue = () => {
    const wrongCount = cards.filter((c) => placed[c.id] !== c.cat).length;
    onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak, wrongCount });
  };
  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;
  const unsorted = cards.filter((c) => !placed[c.id]);

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }} aria-live="polite">{announce}</span>
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak} lostHeart={lostHeart}
        eyebrow={eyebrow} title={title || "Sort the cards"}
        feedback={feedback} canCheck={allPlaced}
        checkHint="Sort every card first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 14 }}>
            {categories.map((c, idx) => {
              const pal = CS_PAL[idx % CS_PAL.length];
              const cardsHere = cards.filter((cd) => placed[cd.id] === c.id);
              const isOver = drag !== null && drag.over === c.id;
              const isTarget = !!armed && !feedback;
              return (
                <div key={c.id}
                  ref={(el) => { colRefs.current[c.id] = el; }}
                  className={isTarget && !isOver ? "fb-bucket target" : ""}
                  role={isTarget ? "button" : undefined}
                  tabIndex={isTarget ? 0 : -1}
                  aria-label={isTarget ? "Place card in " + c.label : c.label + " column, " + cardsHere.length + " cards"}
                  onClick={() => colTap(c.id)}
                  onKeyDown={(e) => { if (isTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); colTap(c.id); } }}
                  style={{
                    minHeight: 150, background: pal.color,
                    border: "2px dashed " + (isOver ? pal.border : "var(--ink-200)"),
                    borderRadius: 14, padding: 10,
                    display: "flex", flexDirection: "column", gap: 6,
                    transition: "border-color 150ms, transform 150ms",
                    transform: isOver ? "scale(1.015)" : "none",
                  }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: pal.text, marginBottom: 4 }}>{c.label}</div>
                  {cardsHere.map((cd) => {
                    const wrong = results[cd.id] === false;
                    const ok = results[cd.id] === true || lockedOk[cd.id];
                    return (
                      <button key={cd.id} className="landed"
                        onClick={(e) => { e.stopPropagation(); returnCard(cd.id); }}
                        disabled={!!feedback || lockedOk[cd.id]}
                        aria-label={lockedOk[cd.id] ? "“" + cd.text + "” — locked correct" : "“" + cd.text + "” in " + c.label + ". Tap to return"}
                        style={{
                          background: ok ? "var(--green-100)" : wrong ? "var(--err-bg)" : "var(--paper-2)",
                          padding: "8px 12px", borderRadius: 8,
                          fontFamily: "var(--font-mono)", fontSize: 13.5, fontWeight: 600,
                          cursor: feedback || lockedOk[cd.id] ? "default" : "pointer",
                          boxShadow: "var(--shadow-sm)", textAlign: "left",
                          border: wrong ? "1.5px solid var(--err-border)" : ok ? "1.5px solid var(--green-400)" : "1px solid var(--ink-100)",
                          color: wrong ? "var(--err-fg)" : "var(--ink-900)",
                          animation: wrong ? "fb-shake calc(.4s * var(--mdur)) ease both" : undefined,
                        }}>
                        {cd.text}{lockedOk[cd.id] ? " ✓" : ""}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div style={{ background: "var(--paper-2)", borderRadius: 14, border: "2px solid var(--ink-100)", padding: 12, minHeight: 70, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", justifyContent: "center" }}>
            {unsorted.length === 0 ? (
              <span style={{ color: "var(--ink-400)", fontSize: 13, fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.06em", fontSize: 11 }}>all placed — hit check!</span>
            ) : (
              unsorted.map((cd) => {
                const isDrag = drag !== null && drag.id === cd.id;
                const isArmed = armed === cd.id;
                return (
                  <button key={cd.id}
                    className={"fb-chip-drag" + (isDrag ? " dragging" : "") + (isArmed ? " armed" : "")}
                    style={isDrag && drag.moved
                      ? { transform: "translate(" + drag.dx + "px, " + drag.dy + "px) rotate(calc(2deg * var(--mamp))) scale(1.06)", zIndex: 30 }
                      : undefined}
                    onPointerDown={down(cd.id)}
                    onPointerMove={move}
                    onPointerUp={up}
                    onPointerCancel={up}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setArmed((a) => (a === cd.id ? null : cd.id)); } }}
                    aria-pressed={isArmed}
                    disabled={!!feedback}>
                    {cd.text}
                  </button>
                );
              })
            )}
          </div>
          <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-300)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 14 }}>
            drag a card — or tap it, then tap its column
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ SRS FLASHCARDS ════════════════ */
/* Local approximation of FSRS interval previews. Production uses ts-fsrs. */
const SRS_PREVIEW = { again: "<10m", hard: "1d", good: "3d", easy: "7d" };
const SRS_BUTTONS = [
  { key: "again", label: "Again", color: "var(--coral-500)", shadow: "var(--coral-700)", text: "#fff" },
  { key: "hard", label: "Hard", color: "var(--sun-400)", shadow: "var(--sun-500)", text: "var(--ink-900)" },
  { key: "good", label: "Good", color: "var(--green-600)", shadow: "var(--green-700)", text: "#fff" },
  { key: "easy", label: "Easy", color: "var(--green-500)", shadow: "var(--green-700)", text: "#fff" },
];

function SRSFlashcardV2({ cards, eyebrowPrefix = "Deck", frontLabel = "Front", backLabel = "Meaning", title, streak: initialStreak = 0, onQuit, onFinish }) {
  /* queue holds card indices; Again pushes the index back in (SR-03) */
  const [queue, setQueue] = useStateC(() => cards.map((_, i) => i));
  const [qPos, setQPos] = useStateC(0);
  const [flipped, setFlipped] = useStateC(false);
  const [anim, setAnim] = useStateC("enter");
  const [stats, setStats] = useStateC({ again: 0, hard: 0, good: 0, easy: 0 });
  const [lapsed, setLapsed] = useStateC({});
  const [done, setDone] = useStateC(false);
  const [streak, setStreak] = useStateC(initialStreak);
  const { fire, layer } = useConfetti();
  const swapTimer = useRefC(null);
  const cardRef = useRefC(null);

  useEffectC(() => () => clearTimeout(swapTimer.current), []);

  const cardIdx = queue[qPos];
  const card = cards[cardIdx];

  /* SR-01 keyboard */
  useEffectC(() => {
    const onKey = (e) => {
      if (done) return;
      if (!flipped && (e.key === " " || e.key === "Enter")) {
        if (document.activeElement === cardRef.current || document.activeElement === document.body) {
          e.preventDefault();
          setFlipped(true);
        }
        return;
      }
      if (flipped && anim !== "exit") {
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= 4) rate(SRS_BUTTONS[n - 1].key);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const rate = (key) => {
    if (anim === "exit" || done) return;
    setStats((s) => ({ ...s, [key]: s[key] + 1 }));
    let nextQueue = queue;
    if (key === "again") {
      /* SR-03: requeue 2 positions later (or at end) */
      nextQueue = queue.slice();
      const reinsert = Math.min(qPos + 3, nextQueue.length);
      nextQueue.splice(reinsert, 0, cardIdx);
      setQueue(nextQueue);
      setLapsed((l) => ({ ...l, [cardIdx]: true }));
    }
    if (qPos === nextQueue.length - 1) {
      setDone(true);
      setStreak((s) => s + 1);
      fire();
      return;
    }
    setAnim("exit");
    swapTimer.current = setTimeout(() => {
      setQPos((p) => p + 1);
      setFlipped(false);
      setAnim("enter");
    }, 320);
  };

  const known = stats.good + stats.easy;
  const feedback = done
    ? { kind: "ok", msg: "Deck complete — " + known + " of " + cards.length + " felt good or easy!", explain: stats.again > 0 ? "The " + stats.again + " tough " + (stats.again === 1 ? "one" : "ones") + " came back for another look — that's how remembering works." : undefined }
    : null;

  const handleContinue = () => onFinish && onFinish({ correct: known === cards.length, stats, total: cards.length, streak });

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        streak={streak} hideStats={false} hearts={0} maxHearts={0}
        eyebrow={eyebrowPrefix + (done ? " · done!" : " · card " + (qPos + 1) + " / " + queue.length)}
        title={title || "Flip & rate yourself"}
        feedback={feedback} onContinue={handleContinue}
        canCheck={false} showSkip={false} onCheck={() => {}}
        onQuit={onQuit} instant
        instantLabel={flipped ? "how well did you know it?" : "tap the card to flip · space flips, 1–4 rate"}
      >
        {!done && card && (
          <div style={{ maxWidth: 420, margin: "0 auto" }}>
            <div className="fb-dots" aria-label={"Card " + (qPos + 1) + " of " + queue.length}>
              {queue.map((ci, i) => (
                <i key={i} className={i < qPos ? (lapsed[ci] ? "lapse" : "done") : i === qPos ? "cur" : ""}></i>
              ))}
            </div>
            <div className={"fb-cardwrap " + anim} style={{ marginBottom: 20 }}>
              <div
                ref={cardRef}
                className={"fb-card3d" + (flipped ? " flipped" : "")}
                style={{ height: 240 }}
                role="button" tabIndex={0}
                aria-pressed={flipped}
                aria-label={flipped ? backLabel + ": " + card.back : frontLabel + ": " + card.front + ". Tap to flip."}
                onClick={() => setFlipped(true)}
                onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !flipped) { e.preventDefault(); setFlipped(true); } }}
              >
                <div className="inner" style={{ height: "100%" }}>
                  <div className="fb-card-face">
                    <div style={{ textAlign: "center" }}>
                      <div className="gp-eyebrow">{frontLabel}</div>
                      <div style={{ fontSize: "clamp(34px, 13cqw, 58px)", fontWeight: 700, color: "var(--ink-900)", lineHeight: 1.15, letterSpacing: "-0.02em", overflowWrap: "anywhere" }}>{card.front}</div>
                      <div style={{ marginTop: 8, fontSize: 13, color: "var(--ink-400)" }}>tap to flip</div>
                    </div>
                  </div>
                  <div className="fb-card-face back">
                    <div style={{ textAlign: "center" }}>
                      <div className="gp-eyebrow">{backLabel}</div>
                      <div style={{ fontSize: "clamp(20px, 7cqw, 30px)", fontWeight: 800, color: "var(--ink-900)", overflowWrap: "anywhere" }}>{card.back}</div>
                      {card.hint && <div style={{ marginTop: 6, fontSize: 15, color: "var(--ink-500)", fontFamily: "var(--font-mono)" }}>{card.hint}</div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {flipped && anim !== "exit" && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
                {SRS_BUTTONS.map((b, i) => (
                  <button key={b.key} type="button" className="fb-rate"
                    onClick={() => rate(b.key)}
                    aria-label={b.label + " — see it again in " + SRS_PREVIEW[b.key] + ". Shortcut: " + (i + 1)}
                    style={{ background: b.color, color: b.text, boxShadow: "0 4px 0 0 " + b.shadow }}>
                    {b.label}
                    <small>{SRS_PREVIEW[b.key]}</small>
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

Object.assign(window, { CardSortV2, SRSFlashcardV2 });
