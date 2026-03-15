# LMS UI/UX Design Guide

Full knowledge base of 50+ proven recommendations from design agencies, developers, and researchers.
Use as a reference when designing and developing the LMS platform.

> Source: Collected from real cases, redesigns, and LMS platform experience.
> See memory reference for when to consult this guide.

---

## 1. Fatal Mistakes

- Loss of orientation in course (Eleken)
- 53% find LMS hard to use (Capterra)
- 88% won't return after bad first impression (Forrester)
- Wrong colors cause irritation or boredom (RiseApps)
- 70% leave without mobile version (Vorecol)
- 94% judge by intuitiveness (JatApp)
- Cognitive overload raises bounce rate (Selleo)

## 2. User Research

Three user types: Students, Teachers, Admins.
- Students: progress, grades, schedule, deadlines. Goal: reduce stress.
- Teachers: course creation, grading, group tracking. Critical: fast onboarding.
- Admins: analytics, user management, platform config. Need: bulk ops, reports.
- Methods: personas, pain point lists, affinity mapping (Mural/Miro).

## 3. Visual Hierarchy

- Font size/weight: modular scale 1.25-1.5x
- Color contrast: bright for CTA, muted for secondary
- Whitespace: generous padding reduces cognitive load
- Consistency: same colors, fonts, icons across all screens

## 4. Typography

- Max 2-3 font families. Popular pairs: Inter + Source Serif, DM Sans + Lora
- Line-height: 1.5-1.7 for body text
- Min 16px body, 14px mobile, 24px+ headings
- Contrast via weight (Bold headings, Regular body, Light captions)
- Max text block width: 65-75 characters

## 5. Color Palette

- Rule 60-30-10: 60% base, 30% secondary, 10% accent
- Avoid aggressive reds and overly muted palettes
- Ideal: calm background + one bright accent + semantic colors
- Unified color scheme across all dashboard sections

## 6. Navigation & Structure

- Sidebar (collapsible) + Breadcrumbs + Tabs + Global search
- Rule of Three: where am I, where can I go, how to go back
- Progressive disclosure: basics first, details on demand
- Consistent patterns across all pages

## 7. Dashboard

- Show only critical KPIs
- Customizable widgets
- Link data to actions (click progress -> open course)
- Smart filters (date, course, group, status)
- Real-time or near-real-time updates

## 8. Mobile-First

- Adaptive layouts for all screen sizes
- Touch-friendly: min 44x44px buttons
- Offline access to materials
- Hamburger menu with clear indication
- Scalable fonts and spacing

## 9. Micro-interactions

Must-have: hover effects, progress bar animations, real-time form validation, tooltips, skeleton screens, task completion animations.
- Each effect = one task
- Consistent design language across platform
- Must not interrupt workflow

## 10. Animation Rules

- Timing: 200-500ms golden range
- Hover: 150-250ms, Screen transitions: 300-500ms
- Staggered delay: 50-100ms
- Easing: ease-out (appear), ease-in (disappear), ease-in-out (move)
- Material Design curve: cubic-bezier(0.4, 0, 0.2, 1)
- Always support prefers-reduced-motion
- One action = one animation

## 11. Gamification

- Points & levels (89% say it makes them more productive)
- Badges & achievements (visual rewards in profile)
- Leaderboards (toggleable, team > individual, periodic reset)
- Progress trackers (goal proximity effect)
- Storytelling (learning as journey)
- Start with max 3 elements, add one at a time

## 12. Onboarding

- Welcome screens (2-3 slides max)
- Interactive tours (spotlight pattern)
- Newcomer checklist with progress bar
- Contextual tooltips + hotspots
- Empty states with CTA and recommendations
- Teacher onboarding: separate, minimal, immediate value
- Value first, pricing later

## 13. Dark Mode

- Background: #121212-#1E1E1E (NOT #000000)
- Text: #E0E0E0-#F0F0F0 (NOT #FFFFFF)
- Contrast: 15.8:1 (Google Material Design)
- Elevation via lighter surfaces, not shadows
- Desaturate bright colors (P300 vs P500)
- Always provide Light/Dark/System toggle
- WCAG 1.4.11: UI components min 3:1 contrast

## 14. Accessibility (WCAG 2.2 AA)

- Keyboard navigation with clear focus indicators
- Text contrast: 4.5:1 normal, 3:1 large (18px+)
- UI element contrast: 3:1
- Alt texts, downloadable PDFs, video subtitles
- ARIA attributes + semantic HTML
- Adjustable font size, text-to-speech support
- Proper heading structure (h1 > h2 > h3)

## 15. Content Presentation

- Video: fullscreen, speed control, subtitles, split-screen
- Text: high-contrast, readable fonts, 65-75 char width
- Micro-learning: 1-3 minute modules
- Interactive: quizzes, polls, drag-and-drop, hotspot video
- Focus on content, remove visual noise (Khan Academy)

## 16. Performance

- Async widget loading
- Cache rarely-changing data
- Optimize charts (aggregate, drill-down for details)
- Real-time updates without page reload
- Lazy loading for images/heavy content
- Image compression, code minification, CDN

## 17. Social Learning

- Forums/discussions with reactions
- Peer review with clear UI
- Built-in messenger/chat
- Group news feed
- Co-creation approach (360Learning)

## 18. AI Features

- Personalized recommendations
- Adaptive learning paths
- AI content generation
- Chatbot assistant 24/7
- Automatic skill mapping

## 19. Integrations

- Zoom, Google Calendar, Slack, HR systems
- SCORM and LTI standards
- Custom API connections

## 20. Testing & Iterations

- Test early (don't wait for perfection)
- Principles over trends
- Mandatory feedback loop
- Tools: Hotjar, Crazy Egg, Lighthouse, New Relic
- Metrics: completion rate, time on platform, engagement, NPS, bounce rate

## 21. Case Studies

- Blackboard: student focus -> 28% US market
- Docebo: 70:20:10 model -> 87% engagement
- Bayes -> Moodle 4: invisible transition, saved 30 work days/year
- Booking.com -> Udemy Business: mobile + offline -> 5+ hours avg
- Living Security: gamified cybersecurity for Fortune 500

## 22. Launch Checklist

See full checklist in the original guide document covering:
Foundation, Navigation, Mobile, Animations, Gamification, Onboarding, Accessibility, Content, Performance, Testing.
