/* ex-basic.jsx — QuizV2 + TrueFalseV2 (playground ports with audit fixes)

   QuizV2 fixes:
   - QZ-01 eliminated wrong picks stay struck out across retries
   - QZ-02 keyboard: 1–9 select option, Enter = Check / Continue
   - QZ-03 selection dot ≠ correct ✓ (filled dot for selection only)
   - QZ-04 friendly empty state for unconfigured exercise

   TrueFalseV2 fixes:
   - TF-01 answer is NOT revealed while retries remain (upstream leak)
   - TF-02 keyboard: ←/→ or T/F keys
   - TF-03 network failure = neutral "meh" sheet, heart NOT consumed
*/

const { useState: useStateB, useEffect: useEffectB } = React;

/* ════════════════ QUIZ ════════════════ */
function QuizV2({ questions, eyebrow, maxAttemptsPerTask = 3, title, onQuit, onFinish }) {
  const [idx, setIdx] = useStateB(0);
  const [pick, setPick] = useStateB(null);
  const [feedback, setFeedback] = useStateB(null);
  const [attemptsLeft, setAttemptsLeft] = useStateB(maxAttemptsPerTask);
  const [eliminated, setEliminated] = useStateB([]); // QZ-01
  const [lostHeart, setLostHeart] = useStateB(false);
  const [streak, setStreak] = useStateB(0);
  const [usedAttempts, setUsedAttempts] = useStateB(0);
  const [correctFirstTry, setCorrectFirstTry] = useStateB(0);
  const [correctEventually, setCorrectEventually] = useStateB(0);
  const { fire, layer } = useConfetti();

  const q = questions[idx];

  /* QZ-02 keyboard */
  useEffectB(() => {
    const onKey = (e) => {
      if (!q) return;
      if (e.key === "Enter") return; // shell buttons own Enter via focus
      if (feedback) return;
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= q.options.length && !eliminated.includes(n - 1)) {
        setPick(n - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [q, feedback, eliminated]);

  if (!q) {
    /* QZ-04 friendly empty state */
    return (
      <div className="lf-shell" style={{ alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32 }}>
        <div style={{ fontSize: 44, marginBottom: 8 }} aria-hidden="true">🪴</div>
        <div style={{ fontWeight: 800, fontSize: 19 }}>Nothing to practise here yet</div>
        <div style={{ color: "var(--ink-500)", fontSize: 14, marginTop: 6, maxWidth: 300 }}>
          This exercise has no questions configured. Ask your teacher to add some!
        </div>
      </div>
    );
  }

  const correctIdx = q.options.findIndex((o) => o.is_correct);

  const handleCheck = () => {
    if (pick === null) return;
    if (pick === correctIdx) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Exactly right!" : "Got it!" });
      setStreak((s) => s + 1);
      setCorrectEventually((c) => c + 1);
      if (usedAttempts === 0) setCorrectFirstTry((c) => c + 1);
      fire();
      return;
    }
    const remaining = attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setEliminated((els) => [...els, pick]); // QZ-01
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (remaining <= 0) {
      setFeedback({ kind: "no", msg: "Out of tries — here's the answer", correct: q.options[correctIdx] && q.options[correctIdx].text });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: remaining === 1 ? "Almost! 1 try left" : "Not that one — " + remaining + " tries left" });
    }
  };

  const handleRetry = () => { setFeedback(null); setPick(null); };

  const handleContinue = () => {
    setFeedback(null);
    setPick(null);
    setEliminated([]);
    setAttemptsLeft(maxAttemptsPerTask);
    setUsedAttempts(0);
    if (idx + 1 < questions.length) setIdx((i) => i + 1);
    else onFinish && onFinish({ correctOnFirstTry: correctFirstTry, correctEventually, total: questions.length, finalStreak: streak });
  };

  const canRetry = feedback && feedback.kind === "no" && attemptsLeft > 0;

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak}
        step={idx + 1} totalSteps={questions.length}
        lostHeart={lostHeart} eyebrow={eyebrow}
        title={title ? title : q.question_text}
        feedback={feedback} canCheck={pick !== null}
        checkHint="Pick an answer first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 460, margin: "0 auto", width: "100%" }} role="radiogroup" aria-label="Answer options">
          {q.options.map((opt, i) => {
            const failedOut = feedback && feedback.kind === "no" && attemptsLeft <= 0;
            let state = "";
            if (feedback) {
              if (i === correctIdx && ((feedback.kind === "ok") || failedOut)) state = "correct";
              else if (i === pick && feedback.kind === "no") state = "wrong";
              else if (eliminated.includes(i)) state = "eliminated";
              else state = "locked";
            } else if (eliminated.includes(i)) state = "eliminated"; // QZ-01
            else if (pick === i) state = "selected";
            const isElim = state === "eliminated";
            return (
              <button
                key={i}
                className={"gp-tile " + state}
                disabled={!!feedback || isElim}
                role="radio" aria-checked={pick === i}
                style={{ display: "flex", alignItems: "center", justifyContent: "flex-start", textAlign: "left", gap: 14, padding: "16px 20px", width: "100%" }}
                onClick={() => !feedback && !isElim && setPick(i)}
              >
                <span className="tile-dot">{state === "wrong" || isElim ? "✕" : state === "correct" ? "✓" : ""}</span>
                <span style={{ flex: 1 }}>{opt.text}</span>
                <span aria-hidden="true" style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--ink-200)", flex: "none" }}>{i + 1}</span>
                {state === "correct" && <span className="tile-chip ok">CORRECT</span>}
                {state === "wrong" && <span className="tile-chip no">MISS</span>}
              </button>
            );
          })}
        </div>
      </LessonShell>
    </div>
  );
}

/* ════════════════ TRUE / FALSE ════════════════ */
function TrueFalseV2({ statement, correctAnswer, explain, eyebrow, title, maxAttemptsPerTask = 2, streak: initialStreak = 0, onGrade, onQuit, onFinish }) {
  const [pick, setPick] = useStateB(null);
  const [feedback, setFeedback] = useStateB(null);
  const [attemptsLeft, setAttemptsLeft] = useStateB(maxAttemptsPerTask);
  const [usedAttempts, setUsedAttempts] = useStateB(0);
  const [lostHeart, setLostHeart] = useStateB(false);
  const [streak, setStreak] = useStateB(initialStreak);
  const [checking, setChecking] = useStateB(false);
  const [taskOver, setTaskOver] = useStateB(false);
  const { fire, layer } = useConfetti();

  /* TF-02 keyboard */
  useEffectB(() => {
    const onKey = (e) => {
      if (feedback || checking) return;
      if (e.key === "ArrowLeft" || e.key.toLowerCase() === "t") setPick(true);
      if (e.key === "ArrowRight" || e.key.toLowerCase() === "f") setPick(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [feedback, checking]);

  const applyResult = (res) => {
    if (res.correct) {
      setFeedback({ kind: "ok", msg: usedAttempts === 0 ? "Right you are!" : "Got it!", explain: res.explain || explain });
      setStreak((s) => s + 1);
      setTaskOver(true);
      fire();
      return;
    }
    const remaining = res.attemptsRemaining != null ? res.attemptsRemaining : attemptsLeft - 1;
    setAttemptsLeft(remaining);
    setUsedAttempts((u) => u + 1);
    setLostHeart(true);
    setTimeout(() => setLostHeart(false), 500);
    if (res.maxReached || remaining <= 0) {
      setTaskOver(true);
      setFeedback({ kind: "no", msg: "Out of tries — here's the answer", correct: res.correctAnswer, explain: res.explain || explain });
      setStreak(0);
    } else {
      setFeedback({ kind: "no", msg: remaining === 1 ? "Hmm, not quite — 1 try left" : "Not quite — " + remaining + " tries left" });
    }
  };

  const handleCheck = async () => {
    if (pick === null || checking) return;
    if (onGrade) {
      setChecking(true);
      try {
        const res = await onGrade({ answer: pick });
        applyResult(res);
      } catch (err) {
        /* TF-03: neutral sheet, no heart lost, no streak reset */
        setFeedback({ kind: "meh", msg: "Hmm, we couldn't check that", explain: "Check your connection and try again — your answer is safe." });
      } finally {
        setChecking(false);
      }
      return;
    }
    applyResult({
      correct: pick === correctAnswer,
      correctAnswer: correctAnswer ? "True" : "False",
      attemptsRemaining: attemptsLeft - 1,
    });
  };

  const handleRetry = () => {
    const wasNetwork = feedback && feedback.kind === "meh";
    setFeedback(null);
    if (!wasNetwork) setPick(null); // keep the child's answer after a network hiccup
  };

  const handleContinue = () => {
    onFinish && onFinish({ correct: feedback && feedback.kind === "ok", attemptsUsed: usedAttempts + (feedback && feedback.kind === "ok" ? 1 : 0), streak });
  };

  const canRetry = feedback && (feedback.kind === "meh" || (feedback.kind === "no" && attemptsLeft > 0));

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={attemptsLeft} maxHearts={maxAttemptsPerTask} streak={streak}
        lostHeart={lostHeart} eyebrow={eyebrow} title={title || "True or false?"}
        feedback={feedback} canCheck={pick !== null} checking={checking}
        checkHint="Pick True or False first"
        onCheck={handleCheck} onContinue={handleContinue}
        onRetry={canRetry ? handleRetry : undefined} onQuit={onQuit}
      >
        <div style={{
          background: "var(--paper-2)", border: "2px solid var(--ink-100)", borderRadius: 18,
          padding: "26px 24px", textAlign: "center", fontFamily: "var(--font-mono)",
          fontSize: "clamp(15px, 4.2cqw, 18px)", color: "var(--ink-900)",
          maxWidth: 460, margin: "0 auto 24px", lineHeight: 1.5,
        }}>
          “{statement}”
        </div>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          {[true, false].map((v) => {
            /* TF-01: only reveal once the task is OVER */
            let state = "";
            if (feedback && feedback.kind !== "meh") {
              if (taskOver && v === correctAnswer && correctAnswer !== undefined) state = "correct";
              else if (taskOver && feedback.kind === "ok" && v === pick && pick === correctAnswer) state = "correct";
              else if (v === pick && feedback.kind === "no") state = "wrong";
              else state = "locked";
            } else if (pick === v) state = "selected";
            return (
              <button
                key={String(v)}
                className={"gp-tile " + state}
                style={{ minWidth: 140, padding: "20px 24px", fontSize: 17, flex: "1 1 140px", maxWidth: 220 }}
                disabled={!!feedback && feedback.kind !== "meh"}
                onClick={() => (!feedback || feedback.kind === "meh") && setPick(v)}
                aria-pressed={pick === v}
              >
                {v ? "True" : "False"}
              </button>
            );
          })}
        </div>
        <div style={{ textAlign: "center", marginTop: 18, fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-300)" }}>
          tip: press T or F
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, { QuizV2, TrueFalseV2 });
