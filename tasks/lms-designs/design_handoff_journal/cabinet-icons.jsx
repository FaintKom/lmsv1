// cabinet-icons.jsx — extended Lucide-stroke icon set for the student cabinet,
// plus custom SVG marks for leagues, podium ranks, and badge criteria_keys.
//
// All icons accept { s, sw, c }: size, stroke width, color.
// Drop-in: load AFTER shell.jsx — extends window.Icon with the new ones.

const _Icon = window.Icon || {};
const _stroke = (sw) => sw || 2;

// ── general Lucide-stroke icons used across cabinet pages ──────────
Object.assign(_Icon, {
  // navigation / chrome
  LayoutDashboard: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>,
  BookOpen: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M2 4h6a4 4 0 0 1 4 4v12a3 3 0 0 0-3-3H2Z"/><path d="M22 4h-6a4 4 0 0 0-4 4v12a3 3 0 0 1 3-3h7Z"/></svg>,
  ClipboardList: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M9 12h6M9 16h6M9 8h.01"/></svg>,
  Trophy: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M7 4h10v5a5 5 0 0 1-10 0Z"/><path d="M7 6H4a2 2 0 0 0 2 4M17 6h3a2 2 0 0 1-2 4"/><path d="M10 14h4l-.5 4h1.5a1 1 0 0 1 1 1v1H8v-1a1 1 0 0 1 1-1h1.5Z"/></svg>,
  Calendar: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>,
  Video: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="14" height="12" rx="2"/><path d="m22 8-6 4 6 4Z"/></svg>,
  Calculator: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v3M8 18h.01M12 18h.01"/></svg>,
  Settings: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06A2 2 0 0 1 4.2 16.96l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 0 1 7.04 4.2l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></svg>,
  Bell: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>,
  Menu: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>,
  LogOut: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/></svg>,
  ChevronRight: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>,
  ArrowRight: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>,

  // gamification
  Star: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill={p.filled?"currentColor":"none"} stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.5 14.93 8.7l6.82.78-5.04 4.76 1.36 6.76L12 17.77l-6.07 3.23 1.36-6.76L2.25 9.48l6.82-.78Z"/></svg>,
  Zap: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill={p.filled?"currentColor":"none"} stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7Z"/></svg>,
  TrendingUp: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="m22 7-9.5 9.5L8 12 2 18"/><path d="M16 7h6v6"/></svg>,
  CheckCircle: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m8.5 12.5 2.5 2.5 4.5-5"/></svg>,
  Sparkles: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/><path d="M12 7a5 5 0 0 0 5 5 5 5 0 0 0-5 5 5 5 0 0 0-5-5 5 5 0 0 0 5-5Z"/></svg>,
  Award: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="9" r="6"/><path d="m8.5 13.5-2 8.5L12 18l5.5 4-2-8.5"/></svg>,
  Clock: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v5l3 2"/></svg>,
  FileText: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>,
  GraduationCap: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>,
  Code: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="m8 6-6 6 6 6M16 6l6 6-6 6"/></svg>,
  MessageSquare: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8Z"/></svg>,
  User: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>,
  Mail: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m2 7 10 6 10-6"/></svg>,
  Globe: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z"/></svg>,
  Shield: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 4 5v6.5C4 16.5 7.5 20.5 12 22c4.5-1.5 8-5.5 8-10.5V5Z"/></svg>,
  Download: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>,
  Pencil: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>,
  Filter: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M3 5h18l-7 9v6l-4-2v-4Z"/></svg>,
  Plus: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>,
  Dot: (p) => <svg style={p.style} width={p.s||16} height={p.s||16} viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/></svg>,
  PlayCircle: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m10 8 6 4-6 4Z" fill="currentColor"/></svg>,
  Lock: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>,
  CalcSymbols: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3.5"/><path d="M16 3v6M13 6h6M3 16.5h6M16 14l4 4M20 14l-4 4"/></svg>,
  Languages: (p) => <svg style={p.style} width={p.s||18} height={p.s||18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={_stroke(p.sw)} strokeLinecap="round" strokeLinejoin="round"><path d="m5 8 6 6M4 14l6-6 2-3M2 5h12M7 2h1"/><path d="m22 22-5-10-5 10M14 18h6"/></svg>,
});

// ── League marks ─────────────────────────────────────────────────────
// Each league gets its own custom SVG token, sized to fit a 36–48px chip.
// Used by Leaderboard, Achievements, Profile.
function LeagueMark({ kind = "bronze", size = 40 }) {
  // base ribbon-style medal (used by bronze/silver/gold) — same shape, different fills
  const ribbonMedal = (fill, stroke, accent) => (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      {/* ribbons */}
      <path d="M11 4 4 14l5 2 4-7Z" fill={accent} />
      <path d="M29 4l7 10-5 2-4-7Z" fill={accent} stroke={stroke} strokeWidth="0.5" />
      <path d="M9 16l3-4 8 0 8 0 3 4-3 4-8 0-8 0-3-4Z" opacity="0.18" fill={stroke} />
      {/* coin */}
      <circle cx="20" cy="24" r="11" fill={fill} stroke={stroke} strokeWidth="1.5" />
      <circle cx="20" cy="24" r="7.5" fill="none" stroke={stroke} strokeWidth="1" opacity="0.6" />
      {/* tick / star inside coin */}
      <path d="M20 19l1.6 3.4 3.7.4-2.8 2.5.8 3.7L20 27.2 16.7 29l.8-3.7-2.8-2.5 3.7-.4Z" fill={stroke} opacity="0.55"/>
    </svg>
  );
  if (kind === "bronze")   return ribbonMedal("#e8a87c", "#7a3f1a", "#c2643b");
  if (kind === "silver")   return ribbonMedal("#dde2e6", "#5b6770", "#9aa3ab");
  if (kind === "gold")     return ribbonMedal("#ffd84d", "#7a5500", "#e8a93b");
  if (kind === "platinum") {
    // octagonal plate
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
        <path d="M14 4h12l8 8v12l-8 8H14l-8-8V12Z" fill="#cdd9ff" stroke="#3358a6" strokeWidth="1.5"/>
        <path d="M14 4h12l8 8v12l-8 8H14l-8-8V12Z" fill="url(#plat)" opacity="0.6"/>
        <defs>
          <linearGradient id="plat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.7"/>
            <stop offset="100%" stopColor="#3358a6" stopOpacity="0.2"/>
          </linearGradient>
        </defs>
        <path d="M14 20l4-5 2 3 2-5 4 7Z" fill="#3358a6" opacity="0.7"/>
        <circle cx="26" cy="26" r="2" fill="#3358a6"/>
      </svg>
    );
  }
  // diamond — faceted gem
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <path d="M10 13h20l-10 22Z" fill="#7ad8ff" stroke="#155b73" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M10 13l5-7h10l5 7" fill="#a8e8ff" stroke="#155b73" strokeWidth="1.5" strokeLinejoin="round"/>
      <path d="M15 6l5 7 5-7M10 13l10 22 10-22M15 13l5 22 5-22" stroke="#155b73" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M11 13l4-6 5 6-5 5Z" fill="#fff" opacity="0.45"/>
    </svg>
  );
}

// ── Podium rank medals (1st/2nd/3rd) ─────────────────────────────────
function RankMedal({ rank, size = 28 }) {
  const colors = {
    1: { face: "#ffd84d", stroke: "#7a5500", ribbon: "#e8a93b" },
    2: { face: "#dde2e6", stroke: "#5b6770", ribbon: "#9aa3ab" },
    3: { face: "#e8a87c", stroke: "#7a3f1a", ribbon: "#c2643b" },
  }[rank] || { face: "#dde2e6", stroke: "#5b6770", ribbon: "#9aa3ab" };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      {/* ribbons */}
      <path d="M8 2 4 11l4 1 3-6Z" fill={colors.ribbon} />
      <path d="M24 2l4 9-4 1-3-6Z" fill={colors.ribbon} />
      {/* coin */}
      <circle cx="16" cy="19" r="10" fill={colors.face} stroke={colors.stroke} strokeWidth="1.4" />
      <circle cx="16" cy="19" r="6.5" fill="none" stroke={colors.stroke} strokeWidth="0.8" opacity="0.55" />
      {/* number */}
      <text x="16" y="22.5" textAnchor="middle" fontFamily="Manrope, sans-serif" fontWeight="800" fontSize="10" fill={colors.stroke}>{rank}</text>
    </svg>
  );
}

// ── BadgeIcon — maps criteria_key → Lucide-style mark ────────────────
// If the key is unknown, falls back to Trophy.
function BadgeIcon({ criteriaKey = "default", size = 28, color, sw = 2 }) {
  const MAP = {
    // streaks
    streak_3:     { I: _Icon.Flame,       c: "var(--coral-500)" },
    streak_7:     { I: _Icon.Flame,       c: "var(--coral-500)" },
    streak_14:    { I: _Icon.Flame,       c: "var(--coral-500)" },
    streak_30:    { I: _Icon.Flame,       c: "var(--coral-700)" },
    streak_100:   { I: _Icon.Flame,       c: "var(--coral-700)" },
    // lessons
    lessons_1:    { I: _Icon.BookOpen,    c: "var(--green-600)" },
    lessons_10:   { I: _Icon.BookOpen,    c: "var(--green-600)" },
    lessons_50:   { I: _Icon.GraduationCap, c: "var(--green-700)" },
    lessons_100:  { I: _Icon.GraduationCap, c: "var(--green-800)" },
    // quizzes
    quiz_first:   { I: _Icon.CheckCircle, c: "var(--green-600)" },
    quiz_perfect: { I: _Icon.Star,        c: "var(--sun-500)", filled: true },
    quiz_master:  { I: _Icon.Award,       c: "var(--sun-700)" },
    // code / programming
    code_first:   { I: _Icon.Code,        c: "var(--info-fg)" },
    code_5:       { I: _Icon.Code,        c: "var(--info-fg)" },
    code_master:  { I: _Icon.Code,        c: "var(--ink-900)" },
    // math
    math_first:   { I: _Icon.CalcSymbols, c: "var(--green-600)" },
    math_perfect: { I: _Icon.CalcSymbols, c: "var(--green-800)" },
    // language
    lang_first:   { I: _Icon.Languages,   c: "var(--coral-500)" },
    lang_master:  { I: _Icon.Languages,   c: "var(--coral-700)" },
    // course completion
    course_complete: { I: _Icon.Award,    c: "var(--green-700)" },
    course_5:        { I: _Icon.Trophy,   c: "var(--sun-500)" },
    // XP
    xp_500:       { I: _Icon.Zap,         c: "var(--sun-500)", filled: true },
    xp_5000:      { I: _Icon.Zap,         c: "var(--sun-700)", filled: true },
    // social / early
    early_bird:   { I: _Icon.Sparkles,    c: "var(--info-fg)" },
    night_owl:    { I: _Icon.Sparkles,    c: "var(--ink-700)" },
    default:      { I: _Icon.Trophy,      c: "var(--sun-700)" },
  };
  const entry = MAP[criteriaKey] || MAP.default;
  const Ico = entry.I;
  return <Ico s={size} sw={sw} filled={entry.filled} style={{ color: color || entry.c }} />;
}

// ── Language code shield — replaces emoji flags in profile selector ──
function LangCode({ code, label, active = false, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 14px",
      borderRadius: 12,
      border: active ? "2px solid var(--green-500)" : "1px solid var(--ink-100)",
      background: active ? "var(--green-50)" : "var(--paper-2)",
      color: active ? "var(--green-800)" : "var(--ink-700)",
      fontWeight: 600, fontSize: 13,
      cursor: "pointer", flex: 1, justifyContent: "flex-start",
      textAlign: "left",
    }}>
      <span style={{
        width: 30, height: 22,
        borderRadius: 5,
        background: active ? "var(--green-600)" : "var(--ink-100)",
        color: active ? "#fff" : "var(--ink-700)",
        display: "grid", placeItems: "center",
        fontFamily: "var(--font-mono)", fontWeight: 700,
        fontSize: 10, letterSpacing: "0.08em",
        flexShrink: 0,
      }}>{code.toUpperCase()}</span>
      <span>{label}</span>
    </button>
  );
}

Object.assign(window, { Icon: _Icon, LeagueMark, RankMedal, BadgeIcon, LangCode });
