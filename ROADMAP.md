# GrassLMS — Roadmap & Feature Specification

## Current State: 80+ features implemented (see bottom for full list)

---

## PHASE 1 — MVP for First Clients (Priority: Critical)

### A1. Homework Assignments with Deadlines
**Backend:**
- Model `Assignment`: title, description, course_id, group_id (optional), due_date, max_score, allow_late_submission, created_by
- Model `AssignmentSubmission`: assignment_id, student_id, content (text/link), file_path, submitted_at, score, feedback, graded_by, graded_at, status (pending/submitted/graded/late)
- Endpoints:
  - `POST /assignments` — teacher creates assignment, links to course and/or group
  - `GET /assignments` — list (student: mine, teacher: created by me)
  - `GET /assignments/{id}` — details
  - `PUT /assignments/{id}` — edit
  - `DELETE /assignments/{id}` — delete
  - `POST /assignments/{id}/submit` — student submits (text + file)
  - `GET /assignments/{id}/submissions` — teacher sees all submissions
  - `PUT /assignments/{id}/submissions/{sub_id}/grade` — teacher grades + comment

**Frontend:**
- `/assignments` (student): cards with countdown to deadline, filters (all/active/overdue/graded)
- `/assignments/{id}` (student): description, submit form (textarea + file upload), submission history
- `/admin/assignments` (teacher): list, "Create" button, filter by course
- Create form: title, description (rich text), course, group, deadline (date picker), max score, checkbox "accept late submissions"
- Review page `/admin/assignments/{id}/review`: submissions table, for each — source text/file, grade field, comment field, "Grade" button

### A2. Gradebook
**Backend:**
- `GET /admin/gradebook?course_id=X` — matrix: rows = students, columns = quizzes + assignments + code challenges. Cells = scores
- `PUT /admin/gradebook/override` — manual grade change (teacher override)
- `GET /admin/gradebook/export?course_id=X&format=csv` — export CSV/Excel

**Frontend:**
- Page `/admin/gradebook`: select course -> matrix table
- Columns: Student Name | Quiz 1 | Quiz 2 | Assignment 1 | Code Challenge 1 | Total | %
- Color coding: green >=80%, yellow 60-79%, red <60%
- Click cell -> popup with details + manual override
- "Export to CSV" button
- Summary row at bottom: average per assignment

### A3. Manual Assignment Review by Teacher
**Backend:**
- `GET /admin/review-queue` — list of ungraded submissions (files, essays, assignments) with pagination
- `GET /admin/review-queue/count` — ungraded count (for sidebar badge)
- `PUT /submissions/{id}/grade` — grade + text feedback
- Notification to student when graded

**Frontend:**
- Badge in sidebar for teacher: "Review (5)" — ungraded count
- Page `/admin/review`: cards — student name, assignment, submit date, file/text
- On click: fullscreen view of submission (left), grade form (right) — split view
- Form: score (number or slider 0-100), text feedback (textarea), buttons "Grade" and "Return for revision"
- Student sees on assignment page: "Grade: 85/100" + teacher comment

### A4. Separate Teacher Dashboard
**Backend:**
- `GET /teacher/dashboard` — stats: my courses, student count, ungraded work, average score
- `GET /teacher/my-courses` — courses created by teacher
- `GET /teacher/my-groups` — groups linked to teacher's courses

**Frontend:**
- Change sidebar: if `role === "teacher"` -> show teacherNav (not adminNav)
- teacherNav: Dashboard, My Courses, Assignments, Review Queue, Groups, Analytics
- Dashboard `/teacher`: 4 cards (my courses, my students, to review, avg score) + recent submissions + quick actions
- Teacher CANNOT see: user management, billing, global analytics
- Teacher CAN see: own courses, own students, own assignments, own course analytics

### A5. Learning Paths
**Backend:**
- Model `LearningPath`: title, description, org_id, created_by, is_published
- Model `LearningPathStep`: path_id, course_id, sort_order, is_required
- Model `LearningPathEnrollment`: path_id, student_id, current_step, enrolled_at
- Endpoints:
  - CRUD for LearningPath
  - `POST /learning-paths/{id}/enroll` — student enrolls in path
  - `GET /learning-paths/{id}/progress` — progress per step
  - Auto-unlock next course when previous is completed

**Frontend:**
- Page `/paths` (student): learning path cards with progress bar
- Page `/paths/{id}` (student): vertical timeline — courses in order, current highlighted, future locked (lock icon)
- Admin page `/admin/paths`: create path — drag-and-drop courses in order, mark required ones
- On course completion -> notification "Next course unlocked!"

### A6. Mobile Adaptation
**What to do:**
- Audit all pages at 375px (iPhone SE) and 768px (iPad)
- Sidebar: burger menu already exists, verify overlay closes, swipe to close
- Tables (gradebook, users): horizontal scroll or card view on mobile
- Code editor: ensure typing is comfortable, Run button visible
- Quizzes: answer buttons large enough for finger (min 44px touch target)
- Forms: labels on top (not side), full-width inputs
- Navigation: bottom tab bar on mobile (Dashboard, Courses, Progress, Profile)
- Meta viewport, PWA manifest (home screen icon)

### A7. Password Reset
**Backend:**
- `POST /auth/forgot-password` — accepts email, generates token (UUID), saves in `password_reset_tokens` (token, user_id, expires_at: +1 hour), sends email
- `POST /auth/reset-password` — accepts token + new_password, verifies token, updates password, deletes token
- Model `PasswordResetToken`: token, user_id, expires_at, used
- Email service integration (Resend / SendGrid / SMTP)

**Frontend:**
- Login page: link "Forgot password?"
- Page `/forgot-password`: email field, "Send Reset Link" button
- After sending: "Check your email for reset instructions"
- Page `/reset-password?token=xxx`: two fields (new password, confirm), "Reset Password" button
- After success: redirect to login with message "Password updated"

### A8. Email Notifications
**Backend:**
- Service `EmailService` with methods: `send_welcome`, `send_password_reset`, `send_assignment_notification`, `send_grade_notification`, `send_deadline_reminder`
- HTML templates for each type (Jinja2 templates)
- Integration with Resend API (free up to 3000 emails/month) or SMTP
- Cron task: 24 hours before deadline -> email students who haven't submitted
- Env variable `EMAIL_ENABLED=true/false` to disable

**Frontend:**
- In profile: checkboxes for email notification settings (assignments, grades, deadlines, new courses)
- Page `/admin/settings`: email configuration (from address, reply-to)

---

## PHASE 2 — Competitive Advantages

### B1. AI Student Assistant
**Backend:**
- `POST /ai/hint` — body: {context, code, error} -> Claude API -> returns hint (not solution)
- System prompt: "You are a tutor. Give a hint, not the answer. Ask a guiding question."
- Rate limit: 10 requests/hour per student
- Log all requests for analytics
- Env: `ANTHROPIC_API_KEY`

**Frontend:**
- Code challenge page: "Get Hint" button in editor toolbar
- On click: slide panel with AI response
- Quiz page: if wrong answer -> "Want a hint?" -> explanation
- Lesson page: floating "Ask AI" button -> chat window for questions about material
- Limit indicator: "8/10 hints remaining today"

### B2. AI Essay/Text Grading
**Backend:**
- `POST /ai/pre-grade` — body: {submission_text, rubric, max_score} -> Claude API -> JSON {score, feedback, strengths, improvements}
- Teacher sets rubric (grading criteria) when creating assignment
- AI gives preliminary grade -> teacher confirms or adjusts
- Fields `ai_score` and `ai_feedback` in submission model

**Frontend:**
- Assignment creation form: textarea "Grading Rubric"
- Review page: next to student work — block "AI Suggestion: 78/100" with detailed feedback
- "Accept AI Grade" button or fields to adjust
- Badge "AI-assisted" on AI-reviewed grades

### B3. Code Plagiarism Detection
**Backend:**
- `POST /admin/plagiarism-check` — body: {challenge_id} -> compares all submissions
- Algorithm: normalize code (remove whitespace, comments, rename variables) -> calculate similarity (Jaccard/Levenshtein on AST tokens)
- Model `PlagiarismReport`: challenge_id, pair (student1_id, student2_id), similarity_percent, flagged
- Threshold: >80% similarity -> auto-flag

**Frontend:**
- Code challenge page (admin): "Check Plagiarism" button
- Result: table of pairs with similarity %, sorted descending
- Click on pair: side-by-side diff with highlighted matches
- Filter: show only flagged (>80%)

### B4. Schedule / Calendar
**Backend:**
- Model `CalendarEvent`: title, description, event_type (deadline/lesson/meeting/custom), start_time, end_time, course_id, group_id, created_by, recurrence (RRULE)
- Endpoints: CRUD for events
- `GET /calendar/events?from=&to=` — events for period
- Auto events: assignment deadlines automatically appear in calendar
- `GET /calendar/ical` — iCal feed for Google Calendar subscription

**Frontend:**
- Page `/calendar` (student + teacher): monthly/weekly/daily view
- Library: `@fullcalendar/react` (free)
- Color coding: red = deadlines, blue = lessons, green = meetings
- Click day -> create event (teacher) or view details (student)
- Dashboard widget: "Upcoming" — next 5 events

### B5. Video Conferences (Jitsi)
**Backend:**
- `POST /meetings/create` — generates unique Jitsi room (room name = UUID)
- Model `Meeting`: title, room_url, course_id, scheduled_at, duration_minutes, created_by, recording_url
- `GET /meetings/active` — current active conferences
- Integration: Jitsi Meet (free, self-hosted or meet.jit.si)
- Optional: recording via Jitsi API -> save link

**Frontend:**
- "Start Live Lesson" button in course (teacher)
- "Join Live Lesson" for student (green button if active)
- Jitsi embed via iframe inside LMS (no redirect)
- Notification to students when conference starts
- Conference history with recordings (if enabled)

### B6. Parent Account
**Backend:**
- New role `UserRole.parent`
- Model `ParentChild`: parent_id, child_id
- `GET /parent/children` — list children
- `GET /parent/children/{child_id}/progress` — child progress
- `GET /parent/children/{child_id}/grades` — grades
- `GET /parent/children/{child_id}/attendance` — attendance
- Weekly email report to parent

**Frontend:**
- Parent login -> separate dashboard
- Child selection (if multiple) -> view-only progress, grades, achievements
- No access to lesson content — only statistics
- Page `/parent`: child cards with key metrics
- `/parent/child/{id}`: tabs — Progress | Grades | Attendance | Achievements

### B7. Skills System
**Backend:**
- Model `Skill`: name, icon, category (programming/math/language)
- Model `LessonSkill`: lesson_id, skill_id, xp_amount
- Model `UserSkill`: user_id, skill_id, total_xp, level
- On lesson completion -> XP to linked skills
- `GET /skills/my` — student skills with levels
- `GET /skills/radar` — data for radar chart

**Frontend:**
- Profile page: radar chart of skills (recharts library)
- Page `/skills`: all skills with progress bars
- Lesson creation (admin): multi-select "Skills" for linking
- Course card: skill tags it develops

### B8. Personalized Recommendations
**Backend:**
- `GET /recommendations` — AI analyzes: quiz errors, weak skills, incomplete courses -> returns recommendation list
- Types: "Review topic X", "Try course Y", "Complete lesson Z"
- Algorithm: rules (if score <60% in topic -> recommend review) + optionally Claude API for smart recommendations

**Frontend:**
- Student dashboard: "Recommended for you" block — 3-4 cards
- Card types: "Review" (orange), "New" (blue), "Almost done" (green)
- Each with link to specific lesson/course

---

## PHASE 3 — Premium Features

### C1. SCORM/xAPI Support + Authoring Tool Import
- SCORM 1.2/2004 package parser (ZIP with imsmanifest.xml)
- xAPI (Tin Can API) activity support — send/receive xAPI statements
- Endpoint `POST /courses/{id}/import-scorm` — upload ZIP -> extract -> create lessons
- Endpoint `POST /courses/{id}/import-xapi` — import xAPI packages
- Import from authoring tools: Articulate Storyline/Rise 360, iSpring Suite,
  Adobe Captivate, Lectora, Camtasia (SCORM export), H5P
- SCORM content rendering via iframe with JS API bridge (SCORM RTE)
- Built-in LRS (Learning Record Store) for xAPI statement storage + optional
  integration with external LRS (Learning Locker, Watershed, etc.)
- Tracking: completion_status, score, time_spent, interactions sent to LMS
- Admin UI: drag-drop SCORM/xAPI package upload, preview, assign to course

### C2. White Label
- Model `OrgBranding`: org_id, logo_url, primary_color, accent_color, custom_domain, favicon_url
- API: `GET/PUT /admin/branding` — upload logo, choose colors
- Frontend: CSS variables from branding -> dynamic theme
- Sidebar logo and colors from branding
- Custom domain: CNAME instructions + Render custom domain

### C3. Attendance
- Model `AttendanceRecord`: student_id, group_id, date, status (present/absent/late/excused), marked_by
- `POST /admin/attendance` — teacher marks attendance for group on date
- `GET /admin/attendance?group_id=X&from=&to=` — attendance journal
- Frontend: `/admin/attendance` — select group -> calendar table, click cell = present/absent/late
- Stats: attendance % per student, per group

### C4. Peer Code Review
- Model `PeerReview`: submission_id, reviewer_id, score, feedback, criteria_scores (JSONB)
- Teacher configures: reviewers per task (2-3), grading criteria
- Auto-distribution: each student gets N others' solutions to review
- Frontend: `/review` page — list of solutions to review, form with criteria and comments
- Final score: average of peer reviews (teacher can override)

### C5. Team Projects
- Model `Team`: name, assignment_id, max_members
- Model `TeamMember`: team_id, user_id, role (leader/member)
- Teacher creates "team project" assignment -> students form teams or auto-assign
- Shared project page: description, timeline, file uploads, in-team discussion
- One grade for whole team (or individual with participation coefficient)

### C6. Webhook API
- Model `Webhook`: org_id, url, events (array: enrollment.created, grade.submitted, course.completed), secret
- On event -> HTTP POST to URL with signed payload (HMAC-SHA256)
- Admin UI: `/admin/settings/webhooks` — add URL, select events, test ping
- API documentation for developers

### C7. Offline / PWA
- Service Worker: cache static assets + recently viewed lessons
- manifest.json: name, icons, theme_color -> "Add to Home Screen"
- IndexedDB: save progress offline -> sync when connected
- Indicator "You're offline — some features unavailable"
- Text lessons available offline, video and code — online only

### C8. Multi-tenancy (Extension)
- Already have org_id in models — complete full isolation
- Middleware: determine org by domain (subdomain or custom domain)
- New org registration: `/register-org` -> creates org + admin
- Super admin panel: `/super-admin/orgs` — list all orgs, stats, blocking

### C9. New Assignment Types
**Audio Recording:**
- Student records audio directly in the browser (MediaRecorder API)
- Model `AudioSubmission`: lesson_id, student_id, audio_url, duration_seconds, transcription (optional)
- Teacher can play back, add timestamped comments
- Use case: language learning pronunciation, oral presentations

**Video Recording:**
- Student records video via webcam (MediaRecorder API)
- Upload to object storage (S3/R2), generate thumbnail
- Model `VideoSubmission`: lesson_id, student_id, video_url, duration_seconds, thumbnail_url
- Teacher reviews with timestamped feedback
- Use case: presentation skills, sign language, lab demonstrations

**Essay with Rich Text Editor:**
- Replace plain textarea with TipTap (ProseMirror-based) or Lexical editor
- Formatting: bold, italic, headings, lists, blockquotes, code blocks, images, tables
- Auto-save drafts (localStorage + server)
- Model `EssaySubmission`: lesson_id, student_id, content_html, content_text, word_count
- Plagiarism indicator (optional), word count, reading time
- Teacher sees rendered HTML with inline annotation/commenting tools

### C10. Protected Group Video Calls
- Jitsi Meet integration with JWT authentication (only enrolled students + teacher can join)
- Model `VideoRoom`: course_id, group_id, room_id, jwt_secret, started_at, ended_at, recording_url
- Teacher starts room → students get notification + "Join" button
- Room locked by default — teacher admits students from lobby
- Optional recording with cloud storage (Jitsi Jibri or browser-based)
- Breakout rooms support for group exercises
- Screen sharing for code review / presentation

### C11. Lesson Whiteboard
- Real-time collaborative whiteboard embedded in lesson (Excalidraw or tldraw)
- WebSocket-based sync (all participants see live drawing)
- Teacher controls: lock/unlock student drawing, clear canvas, save snapshot
- Tools: pen, shapes, text, arrow, eraser, color picker, undo/redo
- Model `WhiteboardSession`: lesson_id, room_id, snapshot_json, created_by
- Export as PNG/SVG for download
- Replay mode: playback of drawing steps (for review)
- Use case: math explanations, architecture diagrams, brainstorming

### C12. Course Import/Export (was C9)
- `GET /courses/{id}/export` -> ZIP (JSON metadata + files)
- `POST /courses/import` -> upload ZIP -> create course with modules, lessons, quizzes
- Format: `course.json` + `/lessons/` + `/quizzes/` + `/challenges/`
- Admin UI: "Export" button on course page, "Import Course" button in course list

### C13. School Reports (PDF)
- `GET /admin/reports/student/{id}?period=quarter` -> PDF
- Content: name, photo, period, grade table, attendance %, course progress, skills (radar), teacher comment
- Generation via WeasyPrint or Puppeteer (HTML -> PDF)
- `GET /admin/reports/group/{id}` -> group summary PDF
- Admin UI: "Generate Report" button on student and group pages

---

## ALREADY IMPLEMENTED (80+ features)

### Authentication & Users
- Registration with auto org creation
- Login by email/password
- JWT tokens + refresh
- 4 roles: super_admin, admin, teacher, student
- User profile (name, bio, avatar)
- Data isolation by organizations
- i18n: EN, ES, RU, TR

### Course Management
- CRUD courses (create, edit, delete)
- Modules inside courses + reorder
- Lessons inside modules + reorder
- Course statuses: draft / published / archived
- Search courses and lessons
- Course preview as student
- Course categories

### Lesson Content Types (6 types)
- Text (rich content)
- Video (YouTube/URL embed)
- Quiz (multiple choice + text answer)
- Code Challenge (with auto-check)
- File Upload
- Interactive (5 exercise types)

### Interactive Exercises (5 types)
- Categorization
- Fill in the blanks
- Matching pairs
- Ordering
- True/False

### Assessment System
- Quizzes with passing score
- Time-limited quizzes
- Auto-grading quizzes
- Code challenges with test cases (hidden + visible)
- Math problem checking with tolerance (0.02)
- Points per question

### Code Execution (Sandbox)
- Execution via Judge0 CE (safe)
- Support: Python, JavaScript, Java, C++, Go
- Starter code
- Time and memory limits
- Statuses: passed, failed, error, timeout

### Progress Tracking
- Course enrollment
- Lesson completion marking
- Course progress percentage
- "My Progress" page
- Course completion date

### Gamification
- XP system (lesson +10, quiz +25, code +50, streak +5)
- 5 leagues: Bronze -> Silver -> Gold -> Platinum -> Diamond
- Badges (auto by criteria)
- Streaks (current + record)
- Leaderboard
- Achievements page with league progress bar

### Certificates
- Auto-generation on course completion
- Unique certificate number
- Download (HTML)
- Verification by number (public URL)

### Discussions
- Lesson comments
- Nested replies (threading)
- Comment deletion

### Notifications
- System notifications
- Unread count (bell icon)
- Mark as read / mark all read
- Links to content from notification

### Administration
- Dashboard with statistics
- CRUD users
- Role changes
- Activate/deactivate users
- Student groups (create, manage)
- Bulk group enrollment in course
- Enroll/unenroll student in course
- Course student list with progress
- Analytics (completion rate, top courses, charts)
- Analytics export to CSV

### Billing (Stripe)
- 4 plans: Free / Starter $29 / Pro $79 / Enterprise $199
- Stripe Checkout (payment)
- Stripe Customer Portal (subscription management)
- Webhook handling (subscriptions, invoices)
- Invoice history
- Plan limits (max students, max courses)

### Math
- Problem generation: arithmetic, algebra, geometry
- Answer checking (batch)
- Visual UI with scoring and explanations

### QoL / UX
- Toast notifications (Sonner)
- Confirm dialogs instead of window.confirm
- Error Boundary
- API error interceptor (auto-toast on 500)
- Breadcrumbs navigation
- Global search (courses + lessons)
