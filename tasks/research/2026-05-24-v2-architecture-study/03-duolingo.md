# Duolingo Clone — gamification schema (quests + shop + leaderboard)

Source: https://github.com/DhavalDudheliya/DuoLingo_Clone (Next.js + Drizzle + Postgres + Clerk + Stripe)
Adjacent: https://github.com/bouzayenilyes/Lingo (similar stack, video-tutorial origin)

## Stack
- Next.js 14 (App Router)
- Drizzle ORM + PostgreSQL
- Clerk auth
- Stripe subscriptions (premium)
- shadcn/ui + Tailwind
- AI-generated voices (ElevenLabs)

## DB schema (paraphrased from `db/schema.ts`)

```ts
// Course = a track of units (one per language)
courses {
  id, title, imageSrc
}

units {
  id, courseId, order, title, description
}

lessons {
  id, unitId, order, title, type
}

challenges {           // = our "exercise"
  id, lessonId, type, question, order
  // type: "SELECT" | "ASSIST"
}

challengeOptions {
  id, challengeId, text, correct, imageSrc, audioSrc
}

// Per-user progress
userProgress {
  userId, userName, userImageSrc,
  activeCourseId,
  hearts,           // global hearts pool (5 default)
  points            // total XP
}

challengeProgress {
  id, userId, challengeId, completed
}

userSubscription {
  userId, stripeCustomerId, stripeSubscriptionId,
  stripePriceId, stripeCurrentPeriodEnd
}

// Quests = daily/weekly goals
// (frontend-only in this clone — array of {title, value} hard-coded,
// progress derived from points)

// Shop items
// Hearts refill: -50 XP per refill (when hearts < 5)
// Pro / Unlimited hearts: subscription
```

## Quests model
This clone keeps it minimal: an array of objects in `constants.ts`:
```ts
export const quests = [
  { title: "Earn 20 XP", value: 20 },
  { title: "Earn 50 XP", value: 50 },
  { title: "Earn 100 XP", value: 100 },
  { title: "Earn 500 XP", value: 500 },
  { title: "Earn 1000 XP", value: 1000 },
];
```
Progress = `points / value`, capped at 1. Reset is daily (calendar day, not 24h).

## Shop model
Two items:
1. **Heart refill** — costs 50 XP, only buyable if `hearts < 5` and `userPoints >= 50`. Resets `hearts = 5`.
2. **Pro subscription** — Stripe checkout link, grants `hasActiveSubscription` flag (unlimited hearts, ad-free).

## Leaderboard
- Query: `SELECT user_id, user_name, user_image, points FROM user_progress ORDER BY points DESC LIMIT 10`
- Rendered as ranked list with avatars
- Highlight own row if in top 10
- No friend-only filter, no weekly reset — lifetime XP only

## What's worth adopting for our LMS

### Already have (or partially)
- Hearts pool (per-task in our V2 model, not global — debatable which is better)
- Streak (cross-task in our V2 model)
- XP / points (existing `points` field on user)

### Gaps worth filling
1. **Daily quests** — 1-2 day implementation
   - Backend: `daily_quests` table `{user_id, date, quest_id, progress}`
   - Frontend: card on dashboard with progress bars, reset at local midnight
   - Hook: every `onFinish` from V2 components adds to today's XP

2. **Shop with heart refill**
   - Backend: extend `users` with `hearts` field (or `user_progress`)
   - Frontend: `/shop` page, refill button enabled when `hearts < max`
   - Spend: deduct points, reset hearts
   - Caveat: our per-task HP model means hearts ≠ shop hearts. Two models
     of "lives" would confuse. Recommend: keep per-task HP for in-lesson
     stamina, add **separate "energy" or "lives" global pool** as the
     shop currency.

3. **Leaderboard**
   - Simple — `SELECT user_id, name, points ORDER BY points DESC LIMIT 50`
   - Render as table with own-row highlight
   - Already have endpoint? Check `/api/v1/leaderboard` — yes, exists.
     Just needs V2 visual upgrade matching design tokens.

### Skip
- Stripe Pro subscription gating (different business model — we sell to schools, not individual learners)
- ElevenLabs voice generation (separate research)
- shadcn/ui — we're on TipTap + Tailwind + Sonner, different design system

## Recommended next step (out of scope this session)
**1 PR** adding daily quests:
- Migration: `daily_quests {user_id, date, quest_template_id, progress}`
- Endpoint: GET `/api/v1/quests/today`, POST `/api/v1/quests/progress`
- Frontend: dashboard card listing 3 quests with progress bars
- Hook: V2LessonRunner `onComplete` fires `POST /api/v1/quests/progress`
  with `{xp_delta}` payload

This is the highest-ROI gamification add we don't already have.
