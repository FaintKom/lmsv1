// q-other.jsx — leftovers
// MapPinDrop, FileUpload, SCORMPackage

const { useState: useStateO, useRef: useRefO } = React;

// ─── 26. MAP PIN DROP ─────────────────────────────────────────────
function MapPinDropExerciseV2() {
  // A stylized map of Europe. User must drop a pin on Paris.
  // Correct point in % coords:
  const TARGET = { x: 41, y: 50 };
  const TOLERANCE = 6; // percent
  const [pin, setPin] = useStateO(null);
  const [fb, setFb] = useStateO(null);
  const mapRef = useRefO(null);
  const { fire, layer } = useConfetti();

  const drop = (e) => {
    if (fb) return;
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setPin({ x, y });
  };

  const dist = pin ? Math.hypot(pin.x - TARGET.x, pin.y - TARGET.y) : Infinity;

  const check = () => {
    if (dist < TOLERANCE) { setFb({ kind: "ok", msg: "Right on Paris." }); fire(); }
    else setFb({ kind: "no", msg: "Off by quite a bit.", correct: "Paris is in northern France" });
  };
  const cont = () => { setFb(null); setPin(null); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={3} step={5} totalSteps={12}
        eyebrow="GEOGRAPHY · EUROPE"
        title={<>Drop a pin on <span className="gp-mark">Paris</span></>}
        feedback={fb}
        canCheck={!!pin}
        onCheck={check}
        onContinue={cont}
      >
        <div
          ref={mapRef}
          onClick={drop}
          style={{
            position: "relative",
            width: "100%",
            maxWidth: 540,
            margin: "0 auto",
            aspectRatio: "1.4 / 1",
            background: "linear-gradient(180deg, #cce7ff 0%, #b3d9ff 100%)",
            borderRadius: 18,
            border: "2px solid var(--ink-100)",
            cursor: fb ? "default" : "crosshair",
            overflow: "hidden",
          }}
        >
          {/* Stylized Europe outline (very abstract) */}
          <svg viewBox="0 0 140 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            {/* sea texture lines */}
            <defs>
              <pattern id="waves" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M0 5 Q 2.5 3, 5 5 T 10 5" stroke="rgba(255,255,255,0.35)" strokeWidth="0.5" fill="none"/>
              </pattern>
            </defs>
            <rect x="0" y="0" width="140" height="100" fill="url(#waves)"/>
            {/* Iberia */}
            <path d="M30 70 Q 25 60, 30 50 L 45 48 L 50 60 L 48 72 Z" fill="#b6e69e" stroke="#0a8754" strokeWidth="0.6"/>
            {/* France */}
            <path d="M50 60 L 48 48 L 55 38 L 65 42 L 68 55 L 62 65 L 52 65 Z" fill="#8fd770" stroke="#0a8754" strokeWidth="0.6"/>
            {/* UK/Ireland */}
            <path d="M44 30 L 48 20 L 56 18 L 58 30 L 50 38 Z" fill="#b6e69e" stroke="#0a8754" strokeWidth="0.6"/>
            <ellipse cx="38" cy="28" rx="4" ry="3" fill="#b6e69e" stroke="#0a8754" strokeWidth="0.6"/>
            {/* Italy boot */}
            <path d="M72 56 L 78 48 L 82 60 L 84 75 L 86 80 L 80 80 L 76 70 Z" fill="#8fd770" stroke="#0a8754" strokeWidth="0.6"/>
            {/* Germany / central */}
            <path d="M68 38 L 80 36 L 86 48 L 78 50 L 70 50 Z" fill="#b6e69e" stroke="#0a8754" strokeWidth="0.6"/>
            {/* Eastern */}
            <path d="M86 38 L 110 32 L 120 50 L 100 58 L 88 50 Z" fill="#8fd770" stroke="#0a8754" strokeWidth="0.6"/>
            {/* Scandinavia */}
            <path d="M70 8 L 90 4 L 95 28 L 80 36 L 70 22 Z" fill="#b6e69e" stroke="#0a8754" strokeWidth="0.6"/>
            {/* Greece-ish */}
            <path d="M90 70 L 102 68 L 105 78 L 95 80 Z" fill="#8fd770" stroke="#0a8754" strokeWidth="0.6"/>
          </svg>
          {/* hint city dots */}
          {[
            { x: 48, y: 22, label: "London" },
            { x: 60, y: 42, label: "" },
            { x: 80, y: 48, label: "Berlin" },
            { x: 82, y: 70, label: "Rome" },
            { x: 38, y: 64, label: "Madrid" },
          ].map((c, i) => (
            <div key={i} style={{
              position: "absolute", left: `${c.x}%`, top: `${c.y}%`,
              transform: "translate(-50%, -50%)",
              pointerEvents: "none",
            }}>
              <div style={{ width: 4, height: 4, background: "var(--ink-700)", borderRadius: 999, margin: "0 auto" }} />
              {c.label && (
                <div style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 10, fontWeight: 600,
                  color: "var(--ink-700)",
                  marginTop: 2,
                  whiteSpace: "nowrap",
                }}>{c.label}</div>
              )}
            </div>
          ))}
          {/* Drop pin */}
          {pin && (
            <div style={{
              position: "absolute",
              left: `${pin.x}%`, top: `${pin.y}%`,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              color: fb ? (fb.kind === "ok" ? "var(--green-600)" : "var(--coral-500)") : "var(--coral-500)",
              filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))",
              transition: "color 200ms",
            }}>
              <Icon.MapPin s={32} />
            </div>
          )}
          {/* Correct pin on wrong */}
          {fb && fb.kind === "no" && (
            <div style={{
              position: "absolute",
              left: `${TARGET.x}%`, top: `${TARGET.y}%`,
              transform: "translate(-50%, -100%)",
              pointerEvents: "none",
              color: "var(--green-600)",
            }} className="gp-pop">
              <Icon.MapPin s={32} />
            </div>
          )}
        </div>
        <div style={{ textAlign: "center", marginTop: 12, fontSize: 13, color: "var(--ink-400)" }}>
          {!pin ? "Tap anywhere on the map" : `Pin at (${Math.round(pin.x)}%, ${Math.round(pin.y)}%)`}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 27. FILE UPLOAD ──────────────────────────────────────────────
function FileUploadExerciseV2() {
  const [file, setFile] = useStateO(null);
  const [fb, setFb] = useStateO(null);
  const [hover, setHover] = useStateO(false);
  const inputRef = useRefO(null);
  const { fire, layer } = useConfetti();

  const onDrop = (e) => {
    e.preventDefault(); setHover(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  };

  const submit = () => {
    if (!file) return;
    setTimeout(() => { setFb({ kind: "ok", msg: "Uploaded — your essay is awaiting review.", explain: "Your teacher will leave feedback within 48h." }); fire(); }, 300);
  };
  const cont = () => { setFb(null); setFile(null); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hearts={5} streak={2} step={11} totalSteps={12}
        eyebrow="ENGLISH 101 · ESSAY"
        title="Upload your final draft"
        feedback={fb}
        canCheck={!!file}
        onCheck={submit}
        onContinue={cont}
        checkLabel="Submit"
        showSkip={false}
      >
        <div style={{ maxWidth: 480, margin: "0 auto" }}>
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setHover(true); }}
            onDragLeave={() => setHover(false)}
            onDrop={onDrop}
            style={{
              padding: "44px 24px",
              background: hover ? "var(--green-50)" : "var(--paper-2)",
              border: `3px dashed ${hover ? "var(--green-500)" : "var(--ink-200)"}`,
              borderRadius: 18,
              textAlign: "center",
              cursor: "pointer",
              transition: "all 150ms",
            }}
          >
            <div style={{
              width: 64, height: 64,
              background: "var(--green-50)",
              borderRadius: "50%",
              margin: "0 auto 14px",
              display: "grid", placeItems: "center",
              color: "var(--green-700)",
            }}><Icon.Upload s={28} /></div>
            <div style={{ fontWeight: 700, fontSize: 17, color: "var(--ink-900)" }}>
              {file ? file.name : "Drop a PDF, DOCX, or TXT here"}
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-400)", marginTop: 6 }}>
              {file ? `${(file.size / 1024).toFixed(1)} KB · ready` : "or click to browse · max 25 MB"}
            </div>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              style={{ display: "none" }}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
          </div>
          {file && (
            <div style={{
              marginTop: 14,
              padding: 12,
              background: "var(--green-50)",
              borderRadius: 12,
              display: "flex", alignItems: "center", gap: 12,
              border: "2px solid var(--green-200)",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 8,
                background: "var(--green-600)", color: "#fff",
                display: "grid", placeItems: "center",
                fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 11,
              }}>
                {file.name.split(".").pop().toUpperCase().slice(0,3)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink-900)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-500)", fontFamily: "var(--font-mono)" }}>
                  {(file.size / 1024).toFixed(1)} KB
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                style={{
                  background: "transparent", border: "none",
                  cursor: "pointer", color: "var(--ink-500)",
                  width: 28, height: 28, borderRadius: 999,
                  display: "grid", placeItems: "center",
                }}
              ><Icon.X /></button>
            </div>
          )}
        </div>
      </LessonShell>
    </div>
  );
}

// ─── 28. SCORM PACKAGE ────────────────────────────────────────────
function SCORMPackageExerciseV2() {
  const [progress, setProgress] = useStateO(0);
  const [done, setDone] = useStateO(false);
  const [fb, setFb] = useStateO(null);
  const { fire, layer } = useConfetti();

  const advance = () => {
    if (fb) return;
    const next = Math.min(100, progress + 25);
    setProgress(next);
    if (next === 100) {
      setDone(true);
      setFb({ kind: "ok", msg: "Module complete — score 92/100." });
      fire();
    }
  };
  const cont = () => { setFb(null); setProgress(0); setDone(false); };

  return (
    <div style={{ position: "relative", height: "100%" }}>
      {layer}
      <LessonShell
        hideStats
        eyebrow="SCORM 1.2 · SAFETY-101"
        title="Workplace safety basics"
        feedback={fb}
        canCheck={false}
        onCheck={() => {}}
        onContinue={cont}
        showSkip={false}
      >
        <div style={{ maxWidth: 540, margin: "0 auto" }}>
          {/* SCORM "frame" simulating embedded content */}
          <div style={{
            background: "var(--paper-2)",
            border: "2px solid var(--ink-100)",
            borderRadius: 16,
            overflow: "hidden",
          }}>
            {/* chrome */}
            <div style={{
              padding: "10px 14px",
              borderBottom: "1px solid var(--ink-100)",
              display: "flex", alignItems: "center", gap: 8,
              background: "var(--ink-50)",
              fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-500)",
            }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: "var(--green-500)" }} />
              SCORM PLAYER · ENGAGED · {progress}%
              <span style={{ marginLeft: "auto" }}>module.zip</span>
            </div>
            {/* slide */}
            <div style={{
              padding: 28,
              minHeight: 280,
              display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 16,
              background: "#fafbf6",
              position: "relative",
            }}>
              {progress < 100 ? (
                <>
                  <div style={{
                    width: 80, height: 80, borderRadius: 16,
                    background: ["var(--green-500)","var(--sun-400)","var(--coral-500)","var(--green-700)"][Math.floor(progress / 25)],
                    boxShadow: "0 6px 0 0 rgba(0,0,0,0.15)",
                    display: "grid", placeItems: "center",
                    color: "#fff", fontWeight: 800, fontSize: 32,
                  }}>{Math.floor(progress / 25) + 1}</div>
                  <div style={{ textAlign: "center" }}>
                    <div className="gp-eyebrow">Slide {Math.floor(progress / 25) + 1} of 4</div>
                    <h3 style={{ margin: "6px 0 0", fontSize: 19, fontWeight: 800 }}>
                      {["Identify hazards", "Apply PPE", "Report incidents", "Practice drills"][Math.floor(progress / 25)]}
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 8, maxWidth: 320 }}>
                      Slide content rendered by SCORM module. The LMS only tracks completion and score.
                    </p>
                  </div>
                  <button
                    onClick={advance}
                    className="gp-btn"
                    style={{ padding: "10px 24px", fontSize: 13 }}
                  >Next slide →</button>
                </>
              ) : (
                <>
                  <div style={{
                    width: 80, height: 80, borderRadius: "50%",
                    background: "var(--green-600)",
                    display: "grid", placeItems: "center",
                    color: "#fff",
                  }} className="gp-pop"><Icon.Check s={40} /></div>
                  <div style={{ textAlign: "center" }}>
                    <h3 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "var(--green-800)" }}>Module complete</h3>
                    <p style={{ fontSize: 13, color: "var(--ink-500)", marginTop: 6 }}>Score reported back to LMS: 92/100</p>
                  </div>
                </>
              )}
            </div>
            {/* progress strip */}
            <div style={{ height: 6, background: "var(--ink-100)" }}>
              <div style={{
                height: "100%", width: `${progress}%`,
                background: "var(--green-600)",
                transition: "width 400ms",
              }} />
            </div>
          </div>
        </div>
      </LessonShell>
    </div>
  );
}

Object.assign(window, {
  MapPinDropExerciseV2, FileUploadExerciseV2, SCORMPackageExerciseV2,
});
