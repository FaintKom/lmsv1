-- =============================================================
-- Create Web Development Basics course
-- =============================================================
-- Run via:  psql $DATABASE_URL -f create_webdev_course.sql
-- =============================================================

BEGIN;

-- ── IDs ──────────────────────────────────────────────────────
-- org / teacher (existing)
-- course:   b1b1b1b1-1111-4111-8111-111111111111
-- module:   c1c1c1c1-1111-4111-8111-111111111111
-- lesson1:  d1d1d1d1-1111-4111-8111-111111111111
-- lesson2:  d2d2d2d2-1111-4111-8111-111111111111
-- ex 1-5:   e1e1e1e1..e5e5e5e5-1111-4111-8111-111111111111

-- ── 1. Course ────────────────────────────────────────────────
INSERT INTO courses (id, org_id, teacher_id, title, slug, description, category, status, is_template, template_version, created_at, updated_at)
VALUES (
    'b1b1b1b1-1111-4111-8111-111111111111',
    '193f3b5c-0b2e-4115-af45-da4b66a52455',
    'd1d376ee-debb-48cc-9ee9-8255e8112c81',
    'Web Development Basics',
    'web-development-basics',
    'Learn HTML, CSS, and JavaScript by building real projects. Start from zero and create web pages, style them beautifully, and add interactivity — all in your browser.',
    'WEB DEVELOPMENT',
    'published',
    false,
    1,
    NOW(), NOW()
);

-- ── 2. Module ────────────────────────────────────────────────
INSERT INTO modules (id, course_id, title, sort_order, created_at, updated_at)
VALUES (
    'c1c1c1c1-1111-4111-8111-111111111111',
    'b1b1b1b1-1111-4111-8111-111111111111',
    'HTML Fundamentals',
    0,
    NOW(), NOW()
);

-- ── 3. Lessons ───────────────────────────────────────────────

-- Lesson 1: Your First Web Page
INSERT INTO lessons (id, module_id, title, content_type, sort_order, duration_minutes, content, created_at, updated_at)
VALUES (
    'd1d1d1d1-1111-4111-8111-111111111111',
    'c1c1c1c1-1111-4111-8111-111111111111',
    'Your First Web Page',
    'text',
    0,
    20,
    $${"version":2,"blocks":[{"id":"t1a0001","type":"text","format":"html","body":"<div style=\"max-width:800px;margin:0 auto;font-family:system-ui,sans-serif;color:#1e293b;line-height:1.7\"><h2 style=\"color:#6366f1;border-bottom:2px solid #e0e7ff;padding-bottom:8px\">Your First Web Page</h2><p>HTML (HyperText Markup Language) is the skeleton of every web page. It tells the browser <em>what</em> content to display — headings, paragraphs, images, links, and lists.</p><h3>Essential Tags</h3><ul><li><code>&lt;h1&gt;</code> to <code>&lt;h6&gt;</code> — headings from largest to smallest</li><li><code>&lt;p&gt;</code> — paragraph of text</li><li><code>&lt;strong&gt;</code> / <code>&lt;em&gt;</code> — bold / italic emphasis</li><li><code>&lt;a href=&quot;...&quot;&gt;</code> — hyperlink to another page</li><li><code>&lt;img src=&quot;...&quot; alt=&quot;...&quot;&gt;</code> — display an image</li><li><code>&lt;ul&gt;</code> / <code>&lt;ol&gt;</code> — unordered / ordered list</li><li><code>&lt;li&gt;</code> — list item (goes inside ul or ol)</li><li><code>&lt;div&gt;</code> — generic container for grouping content</li></ul><p>Every HTML document starts with <code>&lt;!DOCTYPE html&gt;</code>, followed by <code>&lt;html&gt;</code>, <code>&lt;head&gt;</code> (metadata), and <code>&lt;body&gt;</code> (visible content). Tags usually come in pairs: an opening tag and a closing tag with a forward slash.</p></div>","page":1,"sort_order":0},{"id":"ex1b001","type":"exercise","exercise_id":"e1e1e1e1-1111-4111-8111-111111111111","page":1,"sort_order":1},{"id":"ex1b002","type":"exercise","exercise_id":"e2e2e2e2-1111-4111-8111-111111111111","page":1,"sort_order":2},{"id":"ex1b003","type":"exercise","exercise_id":"e3e3e3e3-1111-4111-8111-111111111111","page":1,"sort_order":3}]}$$::jsonb,
    NOW(), NOW()
);

-- Lesson 2: CSS Styling Basics
INSERT INTO lessons (id, module_id, title, content_type, sort_order, duration_minutes, content, created_at, updated_at)
VALUES (
    'd2d2d2d2-1111-4111-8111-111111111111',
    'c1c1c1c1-1111-4111-8111-111111111111',
    'CSS Styling Basics',
    'text',
    1,
    20,
    $${"version":2,"blocks":[{"id":"t2a0001","type":"text","format":"html","body":"<div style=\"max-width:800px;margin:0 auto;font-family:system-ui,sans-serif;color:#1e293b;line-height:1.7\"><h2 style=\"color:#6366f1;border-bottom:2px solid #e0e7ff;padding-bottom:8px\">CSS Styling Basics</h2><p>CSS (Cascading Style Sheets) controls <em>how</em> your HTML looks — colors, spacing, fonts, layout, and more. You write rules that target HTML elements and apply visual styles.</p><h3>Selectors</h3><p>A CSS rule has a <strong>selector</strong> (what to style) and a <strong>declaration block</strong> (how to style it). Selectors can target tag names (<code>p</code>), classes (<code>.card</code>), or IDs (<code>#header</code>).</p><h3>Key Properties</h3><ul><li><code>color</code> — text color</li><li><code>background</code> / <code>background-color</code> — element background</li><li><code>font-size</code> — size of text</li><li><code>padding</code> — space inside an element (between content and border)</li><li><code>margin</code> — space outside an element</li><li><code>border</code> — line around an element</li><li><code>border-radius</code> — rounded corners</li><li><code>box-shadow</code> — drop shadow effect</li><li><code>display: flex</code> — flexbox layout for arranging items in a row or column</li></ul><p>CSS can be written inline (in a <code>style</code> attribute), in a <code>&lt;style&gt;</code> tag in the head, or in a separate <code>.css</code> file. External files are the best practice for real projects.</p></div>","page":1,"sort_order":0},{"id":"ex2b001","type":"exercise","exercise_id":"e4e4e4e4-1111-4111-8111-111111111111","page":1,"sort_order":1},{"id":"ex2b002","type":"exercise","exercise_id":"e5e5e5e5-1111-4111-8111-111111111111","page":1,"sort_order":2}]}$$::jsonb,
    NOW(), NOW()
);

-- ── 4. Exercises ─────────────────────────────────────────────

-- Exercise 1 — Personal Introduction Page (Lesson 1)
INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, sort_order, max_attempts, config, created_at, updated_at)
VALUES (
    'e1e1e1e1-1111-4111-8111-111111111111',
    'd1d1d1d1-1111-4111-8111-111111111111',
    '193f3b5c-0b2e-4115-af45-da4b66a52455',
    'system-W002',
    'web_editor',
    'Personal Introduction Page',
    0,
    NULL,
    $${"description":"Create a personal introduction page using basic HTML tags. Include a heading with your name, a paragraph about yourself, and a list of your hobbies.","starter_html":"<h1>Hello, my name is ___</h1>\n<p>I am learning web development!</p>\n\n<!-- Add a list of your hobbies below -->","starter_css":"body {\n  font-family: Georgia, serif;\n  max-width: 600px;\n  margin: 40px auto;\n  color: #333;\n}","starter_js":"","requirements":["Use an <h1> tag for your name","Write at least one <p> paragraph","Create an unordered list <ul> with 3+ hobbies"]}$$::jsonb,
    NOW(), NOW()
);

-- Exercise 2 — Styled Profile Card (Lesson 1)
INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, sort_order, max_attempts, config, created_at, updated_at)
VALUES (
    'e2e2e2e2-1111-4111-8111-111111111111',
    'd1d1d1d1-1111-4111-8111-111111111111',
    '193f3b5c-0b2e-4115-af45-da4b66a52455',
    'system-W003',
    'web_editor',
    'Styled Profile Card',
    1,
    NULL,
    $${"description":"Build a profile card with a name, title, and bio. Use CSS to make it look like a real card with rounded corners, shadow, and centered text.","starter_html":"<div class=\"card\">\n  <h2>Jane Doe</h2>\n  <p class=\"title\">Web Developer</p>\n  <p class=\"bio\">I love building beautiful websites.</p>\n</div>","starter_css":".card {\n  max-width: 320px;\n  padding: 24px;\n  /* Add: border-radius, box-shadow, text-align */\n}\n\n.title {\n  color: #666;\n  font-size: 14px;\n}\n\n.bio {\n  margin-top: 12px;\n}","starter_js":"","requirements":["Card has border-radius of at least 8px","Card has a box-shadow","Text is centered inside the card","Card has a maximum width"]}$$::jsonb,
    NOW(), NOW()
);

-- Exercise 3 — Interactive Click Counter (Lesson 1)
INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, sort_order, max_attempts, config, created_at, updated_at)
VALUES (
    'e3e3e3e3-1111-4111-8111-111111111111',
    'd1d1d1d1-1111-4111-8111-111111111111',
    '193f3b5c-0b2e-4115-af45-da4b66a52455',
    'system-W004',
    'web_editor',
    'Interactive Click Counter',
    2,
    NULL,
    $${"description":"Create a button that counts clicks. Display the current count on the page and update it every time the button is clicked using JavaScript.","starter_html":"<h2>Click Counter</h2>\n<p>Count: <span id=\"count\">0</span></p>\n<button id=\"btn\">Click me!</button>","starter_css":"body {\n  font-family: system-ui, sans-serif;\n  text-align: center;\n  padding: 40px;\n}\n\n#count {\n  font-size: 48px;\n  font-weight: bold;\n  color: #22c55e;\n}\n\n#btn {\n  padding: 12px 24px;\n  font-size: 16px;\n  background: #22c55e;\n  color: white;\n  border: none;\n  border-radius: 8px;\n  cursor: pointer;\n  margin-top: 16px;\n}\n\n#btn:hover {\n  background: #16a34a;\n}","starter_js":"// Get references to the elements\nconst btn = document.getElementById(\"btn\");\nconst countDisplay = document.getElementById(\"count\");\n\nlet count = 0;\n\nbtn.addEventListener(\"click\", function() {\n  // TODO: increment count and update the display\n});","requirements":["Button increments the counter on each click","Counter value is displayed on the page","Button has a hover effect"]}$$::jsonb,
    NOW(), NOW()
);

-- Exercise 4 — Colorful Button Set (Lesson 2)
INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, sort_order, max_attempts, config, created_at, updated_at)
VALUES (
    'e4e4e4e4-1111-4111-8111-111111111111',
    'd2d2d2d2-1111-4111-8111-111111111111',
    '193f3b5c-0b2e-4115-af45-da4b66a52455',
    'system-W005',
    'web_editor',
    'Colorful Button Set',
    0,
    NULL,
    $${"description":"Create a row of three styled buttons (Primary, Secondary, Danger) using CSS. Each button should have a different color scheme and a hover effect.","starter_html":"<div class=\"button-row\">\n  <button class=\"btn primary\">Primary</button>\n  <button class=\"btn secondary\">Secondary</button>\n  <button class=\"btn danger\">Danger</button>\n</div>","starter_css":".button-row {\n  display: flex;\n  gap: 12px;\n  padding: 40px;\n  justify-content: center;\n}\n\n.btn {\n  padding: 12px 24px;\n  font-size: 16px;\n  border: none;\n  border-radius: 8px;\n  cursor: pointer;\n  color: white;\n  font-weight: 600;\n}\n\n.primary {\n  background: #3b82f6;\n}\n\n.primary:hover {\n  background: #2563eb;\n}\n\n.secondary {\n  /* Add your styles */\n}\n\n.danger {\n  /* Add your styles */\n}","starter_js":"","requirements":["Three buttons with different background colors","All buttons have rounded corners","Hover effect on all buttons","Buttons are displayed in a row using flexbox"]}$$::jsonb,
    NOW(), NOW()
);

-- Exercise 5 — Card Grid Layout (Lesson 2)
INSERT INTO exercises (id, lesson_id, org_id, display_id, exercise_type, title, sort_order, max_attempts, config, created_at, updated_at)
VALUES (
    'e5e5e5e5-1111-4111-8111-111111111111',
    'd2d2d2d2-1111-4111-8111-111111111111',
    '193f3b5c-0b2e-4115-af45-da4b66a52455',
    'system-W006',
    'web_editor',
    'Card Grid Layout',
    1,
    NULL,
    $${"description":"Build a grid of three feature cards using CSS Flexbox. Each card should have an emoji icon, a title, and a short description.","starter_html":"<div class=\"card-grid\">\n  <div class=\"card\">\n    <div class=\"icon\">🚀</div>\n    <h3>Fast</h3>\n    <p>Lightning-quick load times for the best experience.</p>\n  </div>\n  <div class=\"card\">\n    <div class=\"icon\">🔒</div>\n    <h3>Secure</h3>\n    <p>Your data is protected with enterprise-grade security.</p>\n  </div>\n  <div class=\"card\">\n    <div class=\"icon\">💡</div>\n    <h3>Smart</h3>\n    <p>Intelligent features that adapt to your needs.</p>\n  </div>\n</div>","starter_css":".card-grid {\n  display: flex;\n  gap: 20px;\n  padding: 40px;\n  justify-content: center;\n}\n\n.card {\n  background: white;\n  border-radius: 12px;\n  padding: 24px;\n  text-align: center;\n  max-width: 240px;\n  box-shadow: 0 2px 8px rgba(0,0,0,0.1);\n}\n\n.icon {\n  font-size: 36px;\n  margin-bottom: 12px;\n}\n\n.card h3 {\n  margin: 0 0 8px;\n  color: #1e293b;\n}\n\n.card p {\n  margin: 0;\n  color: #64748b;\n  font-size: 14px;\n  line-height: 1.5;\n}","starter_js":"","requirements":["Three cards displayed side by side","Each card has an icon, title, and description","Cards have visual separation (border or shadow)","Equal spacing between cards"]}$$::jsonb,
    NOW(), NOW()
);

-- ── 5. Remove test exercise from Python lesson ───────────────

-- Remove the exercise block from the lesson content JSON
UPDATE lessons
SET content = jsonb_set(
    content,
    '{blocks}',
    (
        SELECT COALESCE(jsonb_agg(block), '[]'::jsonb)
        FROM jsonb_array_elements(content->'blocks') AS block
        WHERE block->>'exercise_id' IS DISTINCT FROM '300a3db1-25fe-40ab-9bad-7d8288de1fad'
    )
),
updated_at = NOW()
WHERE id = 'a86de6da-bca3-48ce-8386-ee59e90b69cb';

-- Delete the exercise row
DELETE FROM exercises WHERE id = '300a3db1-25fe-40ab-9bad-7d8288de1fad';

COMMIT;
