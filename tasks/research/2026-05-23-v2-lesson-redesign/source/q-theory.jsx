// q-theory.jsx — Theory (presentation viewer) content type
// Supports: PDF · PPTX · Keynote · Google Slides (via embed URL)
//
// 1. TheoryViewerExercise — inline view inside the lesson (presentation hero card)
// 2. TheoryUploadCard — teacher picks the source for a new theory block
// 3. TheoryFullscreen — fullscreen presentation player with thumbnails sidebar
// 4. TheoryMobile — phone-sized slide viewer

const { useState: useStateTh, useEffect: useEffectTh, useRef: useRefTh } = React;

// ─── Sample deck used by all viewer variants ────────────────────────
const SAMPLE_DECK = {
  title: "Recursion · Stack frames",
  subtitle: "How a function call unwinds",
  source: { kind: "pptx", filename: "recursion-intro.pptx", pages: 14, by: "Mr. Kim", updated: "2 days ago" },
  slides: [
    { i: 1, title: "What is recursion?",
      body: "A function that calls itself, with a smaller version of the problem.",
      bg: "linear-gradient(135deg, var(--green-600), var(--green-800))",
      art: "λ",
    },
    { i: 2, title: "The call stack",
      body: "Each call gets its own frame · local variables · return address.",
      bg: "linear-gradient(135deg, var(--ink-700), var(--green-900))",
      art: "▣",
    },
    { i: 3, title: "Base case first",
      body: "Without a base case the recursion never stops · stack overflow.",
      bg: "linear-gradient(135deg, var(--coral-500), var(--coral-700))",
      art: "!",
    },
    { i: 4, title: "Example · factorial",
      body: "fact(n) = n × fact(n−1)\nfact(0) = 1",
      bg: "linear-gradient(135deg, var(--sun-400), var(--coral-500))",
      art: "n!",
      dark: true,
    },
    { i: 5, title: "Trace · fact(4)",
      body: "fact(4) → 4 × fact(3) → 4 × 3 × fact(2) → … → 24",
      bg: "linear-gradient(135deg, var(--green-500), var(--green-700))",
      art: "→",
    },
  ],
};

// Small re-usable slide thumbnail
function SlideThumb({ slide, active, onClick, scale = 1 }) {
  const w = 200 * scale, h = 112 * scale;
  return (
    <button onClick={onClick}
      style={{
        width: w, height: h,
        background: "transparent",
        border: `2px solid ${active ? "var(--green-600)" : "transparent"}`,
        borderRadius: 8, padding: 0,
        cursor: "pointer", flexShrink: 0,
        transition: "border-color 120ms",
        boxShadow: active ? "0 4px 0 0 var(--green-700)" : "none",
      }}>
      <div style={{
        width: "100%", height: "100%", borderRadius: 5,
        background: slide.bg, color: slide.dark ? "var(--ink-900)" : "#fff",
        padding: 8 * scale,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
        position: "relative", overflow: "hidden",
      }}>
        <span style={{
          position: "absolute", top: 6 * scale, right: 8 * scale,
          fontFamily: "var(--font-mono)", fontSize: 9 * scale, opacity: 0.6, fontWeight: 600,
        }}>{slide.i}</span>
        <span style={{
          position: "absolute", top: -6 * scale, left: -6 * scale,
          fontSize: 60 * scale, opacity: 0.15, fontWeight: 800,
          fontFamily: "var(--font-mono)",
        }}>{slide.art}</span>
        <div style={{
          fontWeight: 800, fontSize: 11 * scale, lineHeight: 1.25,
          textWrap: "pretty", textAlign: "left",
        }}>{slide.title}</div>
      </div>
    </button>
  );
}

// Big slide canvas
function SlideStage({ slide, aspect = "16/9" }) {
  return (
    <div style={{
      aspectRatio: aspect,
      width: "100%",
      background: slide.bg, color: slide.dark ? "var(--ink-900)" : "#fff",
      borderRadius: 14,
      padding: "40px 48px",
      position: "relative", overflow: "hidden",
      display: "flex", flexDirection: "column", justifyContent: "center",
      boxShadow: "var(--shadow-md)",
    }}>
      <div style={{
        position: "absolute", top: -40, left: -40,
        fontSize: 360, opacity: 0.12, fontWeight: 800, lineHeight: 1,
        fontFamily: "var(--font-mono)",
      }}>{slide.art}</div>
      <div style={{
        position: "absolute", top: 20, right: 28,
        fontFamily: "var(--font-mono)", fontSize: 11, opacity: 0.5, fontWeight: 600, letterSpacing: "0.1em",
      }}>SLIDE {slide.i} / {SAMPLE_DECK.slides.length}</div>
      <h2 style={{
        margin: 0, fontFamily: "var(--font-sans)", fontSize: 36, fontWeight: 800, lineHeight: 1.1, position: "relative",
        textWrap: "pretty", maxWidth: 600,
      }}>{slide.title}</h2>
      <p style={{
        margin: "14px 0 0", fontSize: 18, lineHeight: 1.45, opacity: 0.9, position: "relative",
        whiteSpace: "pre-line", maxWidth: 540,
      }}>{slide.body}</p>
    </div>
  );
}

// Source badge (PDF / PPTX / KEY / GSLIDES)
function SourceBadge({ kind }) {
  const META = {
    pdf:    { label: "PDF",     color: "var(--coral-500)", soft: "var(--coral-50)", text: "var(--coral-700)" },
    pptx:   { label: "PPTX",    color: "var(--sun-500)",   soft: "var(--sun-50)",   text: "var(--sun-700)" },
    key:    { label: "KEYNOTE", color: "var(--info)",      soft: "var(--info-soft, #e6f2ff)", text: "#0a3a7a" },
    gslides:{ label: "G-SLIDES",color: "var(--green-600)", soft: "var(--green-50)", text: "var(--green-800)" },
  };
  const m = META[kind] || META.pdf;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "3px 8px", borderRadius: 6,
      background: m.soft, color: m.text,
      fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 10, letterSpacing: "0.08em",
    }}>
      <span style={{ width: 8, height: 8, background: m.color, borderRadius: 2 }} />
      {m.label}
    </span>
  );
}

// ─── Iconography ────────────────────────────────────────────────────
const TheoryIcons = {
  Slides: (p) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="14" rx="2"/><path d="M8 20h8M12 18v2"/></svg>,
  Fullscreen: (p) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3"/></svg>,
  Download: (p) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  External: (p) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>,
  Notes: (p) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>,
  Link: (p) => <svg width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7L12 19"/></svg>,
};

// ════════════════════════════════════════════════════════════════════
// 1 · INLINE THEORY VIEWER (lives inside a lesson, between exercises)
// ════════════════════════════════════════════════════════════════════
function TheoryViewerExercise() {
  const [i, setI] = useStateTh(0);
  const [showNotes, setShowNotes] = useStateTh(false);
  const D = SAMPLE_DECK;
  const slide = D.slides[i];
  const NOTES = [
    "Open with a question to the class: where else do we see something defined in terms of itself? (Russian dolls, fractals, family trees.)",
    "Call the stack 'the wall of post-it notes' — every call leaves a note, returns peel them off.",
    "Stress that without a base case it's like an infinite loop with a memory cost.",
    "Walk through fact(0)=1 BEFORE doing fact(4). Always anchor the base.",
    "Run it live in the sandbox after the slide.",
  ];

  return (
    <div className="lf-shell">
      {/* same chrome top bar — theory is informational, so no streak/hearts */}
      <div className="lf-top">
        <button className="lf-close" aria-label="Quit"><Icon.X /></button>
        <div className="lf-progress"><div className="lf-progress-fill" style={{ width: "33%" }} /></div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
          color: "var(--ink-500)", flexShrink: 0,
        }}>4 / 12</span>
      </div>

      <div style={{ flex: 1, padding: "20px 24px 14px", overflow: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            padding: "3px 9px", borderRadius: 999,
            background: "var(--info-soft, #e6f2ff)", color: "var(--info-fg, #0a3a7a)",
            fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
          }}>
            <TheoryIcons.Slides s={11} />THEORY
          </span>
          <SourceBadge kind={D.source.kind} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)" }}>
            · {D.source.filename} · {D.source.pages} slides
          </span>
        </div>
        <h2 className="gp-title" style={{ marginTop: 4 }}>{D.title}</h2>
        <div style={{ color: "var(--ink-500)", fontSize: 13, marginBottom: 16 }}>{D.subtitle}</div>

        {/* slide stage */}
        <div style={{ position: "relative", marginBottom: 12 }}>
          <SlideStage slide={slide} />
          {/* prev / next overlay */}
          <button
            onClick={() => setI(Math.max(0, i - 1))}
            disabled={i === 0}
            style={{
              position: "absolute", left: -18, top: "50%", transform: "translateY(-50%)",
              width: 40, height: 40, borderRadius: "50%",
              background: "var(--paper-2)", border: "none", color: "var(--ink-700)",
              boxShadow: "var(--shadow-md)",
              cursor: i === 0 ? "default" : "pointer",
              opacity: i === 0 ? 0.4 : 1,
              display: "grid", placeItems: "center",
            }}>←</button>
          <button
            onClick={() => setI(Math.min(D.slides.length - 1, i + 1))}
            disabled={i === D.slides.length - 1}
            style={{
              position: "absolute", right: -18, top: "50%", transform: "translateY(-50%)",
              width: 40, height: 40, borderRadius: "50%",
              background: "var(--paper-2)", border: "none", color: "var(--ink-700)",
              boxShadow: "var(--shadow-md)",
              cursor: i === D.slides.length - 1 ? "default" : "pointer",
              opacity: i === D.slides.length - 1 ? 0.4 : 1,
              display: "grid", placeItems: "center",
            }}>→</button>
        </div>

        {/* thumbnail strip */}
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
          {D.slides.map((s, idx) => (
            <SlideThumb key={s.i} slide={s} active={idx === i} onClick={() => setI(idx)} scale={0.7} />
          ))}
        </div>

        {showNotes && (
          <div style={{
            marginTop: 14,
            padding: "12px 16px",
            background: "var(--sun-50)",
            border: "2px solid var(--sun-300)",
            borderRadius: 12,
            fontSize: 13, lineHeight: 1.55,
            color: "var(--ink-700)",
          }}>
            <div className="gp-eyebrow" style={{ marginBottom: 6, color: "var(--sun-700)" }}>
              <TheoryIcons.Notes s={12} /> Speaker notes
            </div>
            {NOTES[i]}
          </div>
        )}
      </div>

      {/* bottom bar — viewer controls instead of check */}
      <div className="lf-bottom" style={{ background: "var(--paper)", padding: "12px 22px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="gp-btn ghost"
            style={{ padding: "10px 14px", fontSize: 12 }}
          >
            <TheoryIcons.Notes s={14} />{showNotes ? "Hide notes" : "Notes"}
          </button>
          <button className="gp-btn ghost" style={{ padding: "10px 14px", fontSize: 12 }}>
            <TheoryIcons.Download s={14} />Download
          </button>
          <button className="gp-btn ghost" style={{ padding: "10px 14px", fontSize: 12 }}>
            <TheoryIcons.Fullscreen s={14} />Fullscreen
          </button>
          <button className="gp-btn" style={{ marginLeft: "auto", padding: "12px 30px" }}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 2 · FULLSCREEN PRESENTATION PLAYER (for studying / lecturing)
// ════════════════════════════════════════════════════════════════════
function TheoryFullscreen() {
  const [i, setI] = useStateTh(0);
  const [showThumbs, setShowThumbs] = useStateTh(true);
  const [showNotes, setShowNotes] = useStateTh(false);
  const D = SAMPLE_DECK;
  const slide = D.slides[i];
  const NOTES = [
    "Open with a relatable example — Russian dolls. Then formalize.",
    "Stress: every call gets fresh local variables. Drawings beat text here.",
    "Without base case = stack overflow. Live-demo if you have time.",
    "fact(0) = 1 BEFORE doing fact(4). Always anchor the base case.",
    "Run live in the sandbox. Let students predict each step.",
  ];

  // arrow nav
  useEffectTh(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") setI((x) => Math.min(D.slides.length - 1, x + 1));
      if (e.key === "ArrowLeft") setI((x) => Math.max(0, x - 1));
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <div style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      background: "var(--ink-900)",
      color: "#fff", fontFamily: "var(--font-sans)",
      overflow: "hidden",
    }}>
      {/* top bar */}
      <div style={{
        height: 52,
        display: "flex", alignItems: "center", gap: 16,
        padding: "0 20px",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        flexShrink: 0,
      }}>
        <button style={{
          background: "transparent", border: "none", color: "rgba(255,255,255,0.7)",
          width: 32, height: 32, borderRadius: 999,
          display: "grid", placeItems: "center", cursor: "pointer",
        }}><Icon.X s={14} /></button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
            color: "rgba(255,255,255,0.5)", textTransform: "uppercase", fontWeight: 700,
          }}>
            CS 101 · WEEK 4 · THEORY
          </div>
          <div style={{ fontWeight: 700, fontSize: 14 }}>{D.title}</div>
        </div>
        <SourceBadge kind={D.source.kind} />
        <button
          onClick={() => setShowThumbs(!showThumbs)}
          style={{
            background: showThumbs ? "var(--green-600)" : "transparent",
            color: showThumbs ? "#fff" : "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "6px 12px", borderRadius: 8, cursor: "pointer",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}><TheoryIcons.Slides s={12} />Thumbs</button>
        <button
          onClick={() => setShowNotes(!showNotes)}
          style={{
            background: showNotes ? "var(--sun-400)" : "transparent",
            color: showNotes ? "var(--ink-900)" : "rgba(255,255,255,0.7)",
            border: "1px solid rgba(255,255,255,0.2)",
            padding: "6px 12px", borderRadius: 8, cursor: "pointer",
            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}><TheoryIcons.Notes s={12} />Notes</button>
        <button style={{
          background: "transparent", color: "rgba(255,255,255,0.7)",
          border: "1px solid rgba(255,255,255,0.2)",
          padding: "6px 12px", borderRadius: 8, cursor: "pointer",
          fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700,
          display: "inline-flex", alignItems: "center", gap: 6,
        }}><TheoryIcons.External s={12} />Open in {D.source.kind === "gslides" ? "Google Slides" : "PowerPoint"}</button>
      </div>

      {/* body — slide + optional thumbs sidebar */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {showThumbs && (
          <div style={{
            width: 220,
            background: "rgba(255,255,255,0.04)",
            borderRight: "1px solid rgba(255,255,255,0.08)",
            padding: 14,
            overflowY: "auto",
            flexShrink: 0,
          }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {D.slides.map((s, idx) => (
                <div key={s.i} style={{ position: "relative" }}>
                  <SlideThumb slide={s} active={idx === i} onClick={() => setI(idx)} scale={0.95}/>
                </div>
              ))}
            </div>
          </div>
        )}
        <div style={{
          flex: 1, display: "grid", placeItems: "center",
          padding: 32, overflow: "auto",
          minHeight: 0,
        }}>
          <div style={{ width: "100%", maxWidth: 920 }}>
            <SlideStage slide={slide} />
          </div>
        </div>
        {showNotes && (
          <div style={{
            width: 280,
            background: "rgba(255,216,77,0.08)",
            borderLeft: "1px solid var(--sun-400)",
            padding: 18,
            overflowY: "auto",
            flexShrink: 0,
            color: "rgba(255,255,255,0.85)",
          }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "var(--sun-400)", fontWeight: 800, marginBottom: 8,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <TheoryIcons.Notes s={12} />SPEAKER NOTES
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>{NOTES[i]}</div>
            <div style={{
              marginTop: 18, paddingTop: 14,
              borderTop: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "var(--font-mono)", fontSize: 11, color: "rgba(255,255,255,0.5)",
            }}>SLIDE {slide.i} OF {D.slides.length}</div>
          </div>
        )}
      </div>

      {/* bottom playback strip */}
      <div style={{
        height: 56,
        display: "flex", alignItems: "center", gap: 16,
        padding: "0 20px",
        borderTop: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(0,0,0,0.3)",
        flexShrink: 0,
      }}>
        <button
          onClick={() => setI(Math.max(0, i - 1))}
          disabled={i === 0}
          style={{
            background: "var(--paper-2)", color: "var(--ink-900)",
            border: "none", borderRadius: 10, width: 38, height: 38,
            cursor: i === 0 ? "default" : "pointer", opacity: i === 0 ? 0.4 : 1,
            fontWeight: 800, fontSize: 16,
          }}>←</button>
        <button
          onClick={() => setI(Math.min(D.slides.length - 1, i + 1))}
          disabled={i === D.slides.length - 1}
          style={{
            background: "var(--paper-2)", color: "var(--ink-900)",
            border: "none", borderRadius: 10, width: 38, height: 38,
            cursor: i === D.slides.length - 1 ? "default" : "pointer", opacity: i === D.slides.length - 1 ? 0.4 : 1,
            fontWeight: 800, fontSize: 16,
          }}>→</button>
        {/* progress track */}
        <div style={{
          flex: 1, height: 6, background: "rgba(255,255,255,0.1)",
          borderRadius: 999, position: "relative", overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", left: 0, top: 0, bottom: 0,
            width: `${((i + 1) / D.slides.length) * 100}%`,
            background: "var(--green-500)", borderRadius: 999,
            transition: "width 200ms",
          }} />
          {D.slides.map((s, idx) => (
            <button key={s.i}
              onClick={() => setI(idx)}
              style={{
                position: "absolute", top: -7, left: `${(idx / (D.slides.length - 1)) * 100}%`,
                transform: "translateX(-50%)",
                width: 20, height: 20, borderRadius: 999,
                background: idx <= i ? "var(--green-500)" : "var(--ink-700)",
                border: `2px solid ${idx === i ? "#fff" : "rgba(255,255,255,0.4)"}`,
                cursor: "pointer", padding: 0,
              }} />
          ))}
        </div>
        <span style={{
          fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 600,
          color: "rgba(255,255,255,0.7)", fontVariantNumeric: "tabular-nums",
          minWidth: 50, textAlign: "right",
        }}>{i + 1} / {D.slides.length}</span>
        <span style={{ width: 1, height: 24, background: "rgba(255,255,255,0.15)" }} />
        <button className="gp-btn" style={{ padding: "10px 20px", fontSize: 12 }}>
          Continue lesson
        </button>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 3 · TEACHER UPLOAD CARD — pick the source
// ════════════════════════════════════════════════════════════════════
function TheoryUploadCard() {
  const [picked, setPicked] = useStateTh(null);
  const [url, setUrl] = useStateTh("");
  const [file, setFile] = useStateTh(null);
  const [embedReady, setEmbedReady] = useStateTh(false);
  const fileRef = useRefTh(null);

  const SOURCES = [
    { id: "pdf",   label: "PDF",    sub: "Static slides · best for printable handouts", color: "var(--coral-500)", soft: "var(--coral-50)", text: "var(--coral-700)", glyph: "PDF" },
    { id: "pptx",  label: "PowerPoint", sub: ".pptx · we render via Office Online", color: "var(--sun-500)", soft: "var(--sun-50)", text: "var(--sun-700)", glyph: "PPTX" },
    { id: "key",   label: "Keynote", sub: ".key from macOS · auto-converts on import", color: "var(--info)", soft: "#e6f2ff", text: "#0a3a7a", glyph: "KEY" },
    { id: "gslides", label: "Google Slides", sub: "Paste a share link · we'll convert it to embed URL", color: "var(--green-600)", soft: "var(--green-50)", text: "var(--green-800)", glyph: "GS" },
  ];

  const isFileSource = picked && picked !== "gslides";

  // Mock conversion of Google Slides share link → embed link
  const convertGSlidesUrl = (u) => {
    if (!u) return "";
    // e.g. https://docs.google.com/presentation/d/ABC123/edit?usp=sharing
    //   →  https://docs.google.com/presentation/d/ABC123/embed?start=false&loop=false&delayms=3000
    const m = u.match(/presentation\/d\/([\w-]+)/);
    if (!m) return null;
    return `https://docs.google.com/presentation/d/${m[1]}/embed?start=false`;
  };
  const embedUrl = picked === "gslides" ? convertGSlidesUrl(url) : null;

  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--paper)",
      fontFamily: "var(--font-sans)",
      display: "flex", flexDirection: "column",
      overflow: "auto",
    }}>
      <div style={{
        padding: "18px 24px 14px",
        borderBottom: "1px solid var(--ink-100)",
        background: "var(--paper-2)",
        display: "flex", alignItems: "center", gap: 12,
      }}>
        <span style={{
          width: 36, height: 36, borderRadius: 10,
          background: "var(--info-soft, #e6f2ff)", color: "var(--info-fg, #0a3a7a)",
          display: "grid", placeItems: "center",
        }}><TheoryIcons.Slides s={18} /></span>
        <div>
          <div className="gp-eyebrow">COURSE BUILDER · NEW BLOCK</div>
          <h3 style={{ margin: "2px 0 0", fontWeight: 800, fontSize: 18 }}>Add theory slides</h3>
        </div>
      </div>

      <div style={{ flex: 1, padding: 24, display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className="gp-eyebrow" style={{ marginBottom: 8 }}>1 · Choose source</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {SOURCES.map((s) => {
              const sel = picked === s.id;
              return (
                <button key={s.id}
                  onClick={() => { setPicked(s.id); setFile(null); setUrl(""); setEmbedReady(false); }}
                  style={{
                    background: sel ? s.soft : "var(--paper-2)",
                    border: `2px solid ${sel ? s.color : "var(--ink-100)"}`,
                    borderRadius: 14, padding: "12px 14px",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 12,
                    boxShadow: sel ? `0 3px 0 0 ${s.color}` : "0 2px 0 0 var(--ink-100)",
                    transition: "all 120ms",
                    textAlign: "left",
                  }}>
                  <span style={{
                    width: 44, height: 44, borderRadius: 10,
                    background: s.color, color: "#fff",
                    display: "grid", placeItems: "center",
                    fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 11,
                    flexShrink: 0,
                  }}>{s.glyph}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "var(--ink-900)" }}>{s.label}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-500)", marginTop: 2, lineHeight: 1.35 }}>{s.sub}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* step 2 */}
        {picked && (
          <div>
            <div className="gp-eyebrow" style={{ marginBottom: 8 }}>2 · {isFileSource ? "Upload the file" : "Paste the share link"}</div>

            {isFileSource ? (
              <div
                onClick={() => fileRef.current?.click()}
                style={{
                  padding: "28px 20px",
                  background: file ? "var(--green-50)" : "var(--paper-2)",
                  border: `3px dashed ${file ? "var(--green-500)" : "var(--ink-200)"}`,
                  borderRadius: 14,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 150ms",
                }}>
                {file ? (
                  <>
                    <div style={{
                      width: 52, height: 52, borderRadius: 10,
                      background: "var(--green-600)", color: "#fff",
                      display: "grid", placeItems: "center", margin: "0 auto 10px",
                      fontFamily: "var(--font-mono)", fontWeight: 800, fontSize: 13,
                    }}>{picked.toUpperCase()}</div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{file.name}</div>
                    <div style={{ fontSize: 11, color: "var(--ink-500)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
                      {(file.size / 1024).toFixed(1)} KB · ready to upload
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{
                      width: 52, height: 52, borderRadius: "50%",
                      background: "var(--ink-50)", color: "var(--ink-500)",
                      display: "grid", placeItems: "center", margin: "0 auto 10px",
                    }}><TheoryIcons.Download s={22} /></div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      Drag a {picked.toUpperCase()} here, or click to browse
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-400)", marginTop: 4 }}>
                      Max 50 MB · we'll keep aspect ratio and embed it
                    </div>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept={picked === "pdf" ? ".pdf" : picked === "pptx" ? ".pptx,.ppt" : ".key"}
                  style={{ display: "none" }}
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            ) : (
              <>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setEmbedReady(false); }}
                    placeholder="https://docs.google.com/presentation/d/…/edit"
                    className="gp-input"
                    style={{ flex: 1 }}
                  />
                  <button
                    onClick={() => setEmbedReady(true)}
                    disabled={!convertGSlidesUrl(url)}
                    className="gp-btn"
                    style={{ padding: "12px 18px" }}
                  >Convert</button>
                </div>
                {url && (
                  <div style={{
                    marginTop: 10, padding: "10px 14px",
                    background: embedReady ? "var(--green-50)" : convertGSlidesUrl(url) ? "var(--sun-50)" : "var(--coral-50)",
                    border: `2px solid ${embedReady ? "var(--green-300)" : convertGSlidesUrl(url) ? "var(--sun-300)" : "var(--coral-300)"}`,
                    borderRadius: 10,
                    fontSize: 12, lineHeight: 1.5,
                  }}>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontWeight: 700,
                      color: embedReady ? "var(--green-800)" : convertGSlidesUrl(url) ? "var(--sun-700)" : "var(--coral-700)" }}>
                      <TheoryIcons.Link s={12} />
                      {embedReady ? "Embed URL ready" : convertGSlidesUrl(url) ? "Valid share link · click Convert" : "Not a Google Slides link"}
                    </div>
                    {embedReady && (
                      <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--green-800)", marginTop: 6, wordBreak: "break-all" }}>
                        {embedUrl}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* step 3 — preview */}
        {((file && isFileSource) || embedReady) && (
          <div>
            <div className="gp-eyebrow" style={{ marginBottom: 8 }}>3 · Preview</div>
            <div style={{
              padding: 16, background: "var(--paper-2)",
              border: "2px solid var(--ink-100)", borderRadius: 14,
              display: "flex", alignItems: "center", gap: 14,
            }}>
              <div style={{ width: 96, flexShrink: 0 }}>
                <SlideThumb slide={SAMPLE_DECK.slides[0]} active={false} onClick={() => {}} scale={0.48}/>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <SourceBadge kind={picked} />
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-400)" }}>
                    · ready to publish
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>{file ? file.name : "Google Slides deck"}</div>
                <div style={{ fontSize: 12, color: "var(--ink-500)", marginTop: 2 }}>
                  Students will see this between exercises in the lesson.
                </div>
              </div>
              <button className="gp-btn" style={{ padding: "10px 18px", fontSize: 12 }}>
                Add to lesson
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════
// 4 · MOBILE THEORY VIEWER
// ════════════════════════════════════════════════════════════════════
function TheoryMobile() {
  const [i, setI] = useStateTh(0);
  const [showNotes, setShowNotes] = useStateTh(false);
  const D = SAMPLE_DECK;
  const slide = D.slides[i];
  const NOTES = [
    "Open with Russian dolls metaphor.",
    "Stress: each call has fresh local vars.",
    "No base case → stack overflow.",
    "Always anchor the base case first.",
    "Run live, predict each step.",
  ];

  return (
    <MobileFrame>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--paper)" }}>
        {/* top */}
        <div style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--ink-100)",
          background: "var(--paper-2)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <button className="lf-close"><Icon.X s={14} /></button>
          <div className="lf-progress" style={{ flex: 1 }}>
            <div className="lf-progress-fill" style={{ width: "33%" }} />
          </div>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color: "var(--ink-500)" }}>4/12</span>
        </div>

        <div style={{ padding: "12px 14px 8px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{
              display: "inline-flex", alignItems: "center", gap: 4,
              padding: "2px 7px", borderRadius: 999,
              background: "var(--info-soft, #e6f2ff)", color: "var(--info-fg, #0a3a7a)",
              fontFamily: "var(--font-mono)", fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
            }}><TheoryIcons.Slides s={10}/>THEORY</span>
            <SourceBadge kind={D.source.kind} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 16 }}>{D.title}</div>
        </div>

        {/* slide */}
        <div style={{ flex: 1, padding: "0 14px", display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0 }}>
          <SlideStage slide={slide} aspect="4/3" />
          <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingTop: 12, paddingBottom: 4 }}>
            {D.slides.map((s, idx) => (
              <SlideThumb key={s.i} slide={s} active={idx === i} onClick={() => setI(idx)} scale={0.45}/>
            ))}
          </div>
        </div>

        {showNotes && (
          <div style={{
            padding: "10px 14px",
            background: "var(--sun-50)",
            borderTop: "2px solid var(--sun-300)",
            fontSize: 12, lineHeight: 1.5, color: "var(--ink-700)",
          }}>
            <div style={{
              fontFamily: "var(--font-mono)", fontSize: 9, color: "var(--sun-700)",
              fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 4,
            }}>NOTES</div>
            {NOTES[i]}
          </div>
        )}

        {/* bottom controls */}
        <div style={{
          padding: "10px 14px 14px",
          borderTop: "2px solid var(--ink-100)",
          background: "var(--paper-2)",
          display: "flex", gap: 8,
        }}>
          <button
            onClick={() => setI(Math.max(0, i - 1))}
            disabled={i === 0}
            className="gp-tile"
            style={{ width: 50, padding: "10px 0", fontSize: 16, opacity: i === 0 ? 0.4 : 1 }}
          >←</button>
          <button
            onClick={() => setI(Math.min(D.slides.length - 1, i + 1))}
            disabled={i === D.slides.length - 1}
            className="gp-tile"
            style={{ width: 50, padding: "10px 0", fontSize: 16, opacity: i === D.slides.length - 1 ? 0.4 : 1 }}
          >→</button>
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="gp-tile"
            style={{ flex: 1, padding: "10px 0", fontSize: 12, fontWeight: 700 }}
          >{showNotes ? "Hide notes" : "Notes"}</button>
          <button className="gp-btn" style={{ padding: "10px 18px", fontSize: 12 }}>Done</button>
        </div>
        <div style={{ height: 22, display: "grid", placeItems: "center", background: "var(--paper-2)" }}>
          <div style={{ width: 130, height: 4, background: "rgba(10,26,16,0.3)", borderRadius: 999 }} />
        </div>
      </div>
    </MobileFrame>
  );
}

Object.assign(window, {
  SAMPLE_DECK, SlideThumb, SlideStage, SourceBadge, TheoryIcons,
  TheoryViewerExercise, TheoryFullscreen, TheoryUploadCard, TheoryMobile,
});
