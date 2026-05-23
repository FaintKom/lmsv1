// app.jsx — assembles the design canvas with all 24 task types
// Sections: Quiz basics · Languages · Programming · Math · Other · Mobile

const ARTBOARD_W = 720;
const ARTBOARD_H = 560;

function Frame({ children }) {
  // visual outline that anchors each desktop exercise to a card shape
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--paper)",
      borderRadius: 18,
      overflow: "hidden",
      border: "1px solid var(--ink-100)",
      boxShadow: "var(--shadow-sm)",
    }}>
      {children}
    </div>
  );
}

function App() {
  return (
    <DesignCanvas>
      <DCSection id="intro" title="GrassLMS · Exercise types redesign" subtitle="24 task types · Duolingo-style polish · interactive prototypes · GrassLMS tokens">
        <DCArtboard id="intro-card" label="System" width={420} height={ARTBOARD_H}>
          <IntroCard />
        </DCArtboard>
      </DCSection>

      <DCSection id="basics" title="Quiz basics" subtitle="The core of every lesson — used 80% of the time">
        <DCArtboard id="quiz" label="1 · Quiz · multiple choice" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><QuizExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="tf" label="2 · True / false" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><TrueFalseExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="fb" label="3 · Fill in the blanks" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><FillBlanksExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="match" label="4 · Matching pairs" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><MatchingExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="ord" label="5 · Ordering · drag" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><OrderingExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="cat" label="6 · Categorize · drag" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><CategorizeExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="bub" label="7 · Bubble sheet · SAT" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><BubbleSheetExerciseV2 /></Frame></DCArtboard>
      </DCSection>

      <DCSection id="languages" title="Languages" subtitle="Translation, sentence building, dialogue, vocab">
        <DCArtboard id="tr" label="8 · Translation" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><TranslationExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="sb" label="9 · Sentence builder · canonical Duolingo" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><SentenceBuilderExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="dia" label="10 · Dialogue · chat" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><DialogueExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="con" label="11 · Conjugation · verb table" width={ARTBOARD_W} height={640}><Frame><ConjugationExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="read" label="12 · Reading · passage + Q" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><ReadingExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="cw" label="13 · Crossword" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><CrosswordExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="ws" label="14 · Word search" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><WordSearchExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="srs" label="15 · SRS flashcard · Anki" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><SRSFlashcardExerciseV2 /></Frame></DCArtboard>
      </DCSection>

      <DCSection id="code" title="Programming" subtitle="Code, web editor, robot blocks, 3D world">
        <DCArtboard id="cc" label="16 · Code challenge · 37 langs" width={ARTBOARD_W} height={620}><Frame><CodeChallengeExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="we" label="17 · Web editor · HTML/CSS/JS" width={ARTBOARD_W} height={620}><Frame><WebEditorExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="r2d" label="18 · Robot 2D · Blockly" width={ARTBOARD_W} height={620}><Frame><Robot2DExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="w3d" label="19 · World 3D · isometric" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><World3DExerciseV2 /></Frame></DCArtboard>
      </DCSection>

      <DCSection id="math" title="Mathematics" subtitle="Stepwise solving + interactive templates">
        <DCArtboard id="mss" label="20 · Math stepwise" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><MathStepwiseExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="mnum" label="21 · Numeric input · keypad" width={ARTBOARD_W} height={640}><Frame><NumericInputExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="meq" label="22 · Equation balance · scale" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><EquationBalanceExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="mnl" label="23 · Number line · drag marker" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><NumberLineExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="mvf" label="24 · Visual fractions · pie + bar" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><VisualFractionsExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="mmc" label="25 · Multiple choice math" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><MultipleChoiceMathExerciseV2 /></Frame></DCArtboard>
      </DCSection>

      <DCSection id="math-templates" title="Math · interactive templates" subtitle="11 specialized math widgets — arithmetic puzzles, coordinate plane, function graphs, scatter plots, Venn diagrams, etc. Each lives under math_interactive but has its own UI.">
        <DCArtboard id="t-arith" label="26 · Arithmetic puzzle" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><ArithmeticPuzzleExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-card" label="27 · Card sort · drag" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><CardSortExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-coord" label="28 · Coordinate plane · drag points" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><CoordinatePlaneExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-solver" label="29 · Equation solver · pick operations" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><EquationSolverExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-fg" label="30 · Function graph · sliders" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><FunctionGraphExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-gt" label="31 · Graph transform · sliders" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><GraphTransformExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-ig" label="32 · Inequality graph · shade region" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><InequalityGraphExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-sp" label="33 · Scatter plot · drag best-fit" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><ScatterPlotExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-tp" label="34 · Table pattern · find rule" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><TablePatternExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-tw" label="35 · Two-way table" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><TwoWayTableExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-venn" label="36 · Venn · numbers" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><VennDiagramExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-venn-el" label="36b · Venn · drag elements" width={ARTBOARD_W} height={640}><Frame><VennDiagramElementsExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="t-venn-tx" label="36c · Venn · text labels" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><VennDiagramTextExerciseV2 /></Frame></DCArtboard>
      </DCSection>

      <DCSection id="other" title="Other" subtitle="Map, file upload, embedded SCORM">
        <DCArtboard id="map" label="26 · Map pin drop" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><MapPinDropExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="up" label="27 · File upload" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><FileUploadExerciseV2 /></Frame></DCArtboard>
        <DCArtboard id="sc" label="28 · SCORM package" width={ARTBOARD_W} height={ARTBOARD_H}><Frame><SCORMPackageExerciseV2 /></Frame></DCArtboard>
      </DCSection>

      <DCSection id="theory" title="Theory · presentations" subtitle="A new content type for static teaching material. Teachers upload PDF, PPTX, Keynote (.key), or paste a Google Slides share link — we convert it to an embed URL.">
        <DCArtboard id="th-inline" label="Theory · inline (in lesson)" width={ARTBOARD_W} height={760}><Frame><TheoryViewerExercise /></Frame></DCArtboard>
        <DCArtboard id="th-upload" label="Teacher · upload card · 4 sources" width={ARTBOARD_W} height={760}><Frame><TheoryUploadCard /></Frame></DCArtboard>
        <DCArtboard id="th-fs" label="Theory · fullscreen presenter" width={1280} height={720}><TheoryFullscreen /></DCArtboard>
        <DCArtboard id="th-mob" label="Theory · mobile" width={390} height={780}><TheoryMobile /></DCArtboard>
      </DCSection>

      <DCSection id="fullscreen" title="Fullscreen mode" subtitle="Robot 2D, World 3D, and SCORM open in a wider 16:9 layout — taking over the lesson viewport instead of sitting inside the standard card. SCORM is always fullscreen.">
        <DCArtboard id="fs-robot" label="18 · Robot 2D · fullscreen" width={1280} height={720}><Robot2DFullscreen /></DCArtboard>
        <DCArtboard id="fs-world" label="19 · World 3D · fullscreen" width={1280} height={720}><World3DFullscreen /></DCArtboard>
        <DCArtboard id="fs-scorm" label="28 · SCORM · fullscreen (always)" width={1280} height={720}><SCORMFullscreen /></DCArtboard>
      </DCSection>

      <DCSection id="mobile" title="Mobile · iPhone-sized" subtitle="The same exercises in the phone-first Duolingo posture">
        <DCArtboard id="mob-sb" label="Sentence builder · mobile" width={390} height={780}><SentenceBuilderMobile /></DCArtboard>
        <DCArtboard id="mob-quiz" label="Quiz · mobile" width={390} height={780}><QuizMobile /></DCArtboard>
        <DCArtboard id="mob-fb" label="Fill blanks · mobile" width={390} height={780}><FillBlanksMobile /></DCArtboard>
        <DCArtboard id="mob-flash" label="Flashcard · mobile" width={390} height={780}><FlashcardMobile /></DCArtboard>
        <DCArtboard id="mob-code" label="Code · mobile · Replit-style" width={390} height={780}><CodeMobile /></DCArtboard>
        <DCArtboard id="mob-web" label="Web editor · mobile · CodePen-style" width={390} height={780}><WebEditorMobile /></DCArtboard>
      </DCSection>
    </DesignCanvas>
  );
}

function IntroCard() {
  return (
    <div style={{
      width: "100%", height: "100%",
      background: "var(--paper)",
      borderRadius: 18,
      border: "1px solid var(--ink-100)",
      padding: 28,
      display: "flex", flexDirection: "column", gap: 16,
      fontFamily: "var(--font-sans)",
      color: "var(--ink-900)",
      boxShadow: "var(--shadow-sm)",
    }}>
      <div className="gp-eyebrow">GRASSLMS · LIVELY V1 · EXERCISE REDESIGN</div>
      <h1 style={{ margin: 0, fontWeight: 800, fontSize: 28, lineHeight: 1.15, textWrap: "pretty" }}>
        24 task types, polished in the <span className="gp-mark">Duolingo</span> posture
      </h1>
      <p style={{ margin: 0, fontSize: 14, color: "var(--ink-500)", lineHeight: 1.55 }}>
        Each artboard is a fully interactive exercise. Try them — pick answers, drag tiles,
        run code, drop pins. They'll grade you and play feedback.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
        <SystemRow label="Chrome" v="Progress bar · streak flame · hearts (lose on wrong)" />
        <SystemRow label="Primary CTA" v="Shadow-pop button (4px solid offset, no blur)" />
        <SystemRow label="Tiles" v="2px inset border + 2px pop shadow · selected = green-50" />
        <SystemRow label="Feedback" v="Bottom sheet · green-50 ok · coral-50 wrong · Continue CTA" />
        <SystemRow label="Reward" v="Confetti burst · streak/XP unchanged" />
        <SystemRow label="Type" v="Manrope display · Geist Mono for code & eyebrows" />
        <SystemRow label="Color" v="Green primary · coral hearts · sun-300 marker on hero word" />
      </div>

      <div style={{
        marginTop: "auto",
        padding: 14,
        background: "var(--green-50)",
        borderRadius: 12,
        border: "2px solid var(--green-200)",
        fontSize: 13, lineHeight: 1.5, color: "var(--green-800)",
      }}>
        <strong style={{ fontWeight: 800 }}>How to read this canvas →</strong> Scroll & zoom freely.
        Click the ↗ icon in an artboard's corner to focus it fullscreen.
        Drag the grip ⋮⋮ to reorder.
      </div>
    </div>
  );
}

function SystemRow({ label, v }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "baseline", fontSize: 13 }}>
      <span style={{
        fontFamily: "var(--font-mono)",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        fontSize: 10,
        color: "var(--ink-400)",
        fontWeight: 700,
        width: 80, flexShrink: 0,
      }}>{label}</span>
      <span style={{ color: "var(--ink-700)" }}>{v}</span>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
