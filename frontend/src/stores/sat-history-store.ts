import { create } from "zustand";
import { persist } from "zustand/middleware";

type SATDomain =
  | "algebra"
  | "advanced_math"
  | "problem_solving"
  | "geometry_trig";

interface DomainScore {
  correct: number;
  total: number;
  avgTimeSeconds: number;
}

interface SATTestRecord {
  id: string;
  date: string;
  mode: "full_adaptive" | "mini" | "domain_practice";
  scaledScore: number;
  rawCorrect: number;
  totalQuestions: number;
  module2Difficulty: "easy" | "hard" | "none";
  totalTimeSeconds: number;
  domainScores: Record<SATDomain, DomainScore>;
}

interface SATHistoryState {
  records: SATTestRecord[];
  addRecord: (record: SATTestRecord) => void;
  clearHistory: () => void;
  getScoreTrend: () => { date: string; score: number; mode: string }[];
  getDomainStats: () => Record<
    SATDomain,
    { correct: number; total: number; percent: number }
  >;
  getWeakDomains: () => SATDomain[];
  getRecentTests: (n: number) => SATTestRecord[];
}

const ALL_DOMAINS: SATDomain[] = [
  "algebra",
  "advanced_math",
  "problem_solving",
  "geometry_trig",
];

export const useSATHistoryStore = create<SATHistoryState>()(
  persist(
    (set, get) => ({
      records: [],

      addRecord: (record) =>
        set((state) => ({
          records: [record, ...state.records].slice(0, 50),
        })),

      clearHistory: () => set({ records: [] }),

      getScoreTrend: () => {
        const { records } = get();
        return [...records]
          .sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
          )
          .map((r) => ({ date: r.date, score: r.scaledScore, mode: r.mode }));
      },

      getDomainStats: () => {
        const { records } = get();
        const stats = {} as Record<
          SATDomain,
          { correct: number; total: number; percent: number }
        >;

        for (const domain of ALL_DOMAINS) {
          let correct = 0;
          let total = 0;
          for (const r of records) {
            const ds = r.domainScores[domain];
            if (ds) {
              correct += ds.correct;
              total += ds.total;
            }
          }
          stats[domain] = {
            correct,
            total,
            percent: total > 0 ? Math.round((correct / total) * 100) : 0,
          };
        }

        return stats;
      },

      getWeakDomains: () => {
        const stats = get().getDomainStats();
        return ALL_DOMAINS.filter(
          (d) => stats[d].total > 0 && stats[d].percent < 60
        ).sort((a, b) => stats[a].percent - stats[b].percent);
      },

      getRecentTests: (n) => {
        return get().records.slice(0, n);
      },
    }),
    {
      name: "sat-practice-history",
      skipHydration: true,
    }
  )
);
