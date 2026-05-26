"""Web HTML & CSS.

Hands-on intro to building web pages. Live preview in the browser
sandbox via the ``web_editor`` exercise type. No Python here — that's a
separate course.
"""

COURSE = {
    "slug": "web-html-css",
    "title": "Web Development: HTML & CSS",
    "description": (
        "Build your first web page from scratch. HTML for structure, "
        "CSS for style — everything renders live in the browser editor "
        "as you type. No installs, no setup."
    ),
    "category": "Programming",
    "modules": [
        {
            "slug": "m1-html",
            "title": "HTML — Structure",
            "lessons": [
                {
                    "slug": "l1-html-elements",
                    "title": "HTML elements",
                    "duration": 12,
                    "text_md": (
                        "## What is HTML?\n\n"
                        "**HTML** (HyperText Markup Language) is the skeleton of every web page. "
                        "Pages are built from *elements* written between angle brackets.\n\n"
                        "```html\n"
                        "<h1>Hello, world!</h1>\n"
                        "<p>This is a paragraph.</p>\n"
                        "<a href=\"/about\">About us</a>\n"
                        "```\n\n"
                        "### Common elements\n\n"
                        "| Element | What it does |\n"
                        "|---|---|\n"
                        "| `<h1>` – `<h6>` | headings, biggest to smallest |\n"
                        "| `<p>` | paragraph |\n"
                        "| `<a>` | hyperlink (needs `href`) |\n"
                        "| `<img>` | image (needs `src` and `alt`) |\n"
                        "| `<ul>` / `<li>` | unordered list / list item |\n"
                        "| `<div>` / `<span>` | generic containers |\n\n"
                        "### Anatomy of a tag\n\n"
                        "```html\n"
                        "<a href=\"https://example.com\">click me</a>\n"
                        "```\n\n"
                        "- `<a>` — opening tag\n"
                        "- `href=\"…\"` — attribute\n"
                        "- `click me` — content (what you see on screen)\n"
                        "- `</a>` — closing tag"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-html-quiz",
                            "type": "quiz",
                            "title": "HTML basics",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "Which element creates a **top-level heading**?",
                                    "options": [
                                        {"text": "<h1>", "is_correct": True},
                                        {"text": "<p>", "is_correct": False},
                                        {"text": "<head>", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which attribute makes `<a>` point somewhere?",
                                    "options": [
                                        {"text": "src", "is_correct": False},
                                        {"text": "href", "is_correct": True},
                                        {"text": "link", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which attribute does `<img>` need to display an image?",
                                    "options": [
                                        {"text": "href", "is_correct": False},
                                        {"text": "src", "is_correct": True},
                                        {"text": "url", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                        {
                            "slug": "ex-html-card",
                            "type": "web_editor",
                            "title": "Build a tiny page",
                            "config": {
                                "description": "Add a heading and a paragraph inside the body.",
                                "starter_html": "<body>\n  <!-- add an <h1> and a <p> below -->\n</body>",
                                "starter_css": "body { font-family: sans-serif; padding: 1rem; }",
                                "starter_js": "",
                                "requirements": [
                                    "Page must contain an <h1>",
                                    "Page must contain a <p>",
                                ],
                            },
                        },
                    ],
                },
                {
                    "slug": "l2-links-images",
                    "title": "Links & images",
                    "duration": 14,
                    "text_md": (
                        "## Linking pages together\n\n"
                        "`<a>` (anchor) makes any text or image a clickable link.\n\n"
                        "```html\n"
                        "<a href=\"https://example.com\">visit example</a>\n"
                        "<a href=\"/about\">internal link</a>\n"
                        "<a href=\"mailto:hi@example.com\">email me</a>\n"
                        "```\n\n"
                        "### Images\n\n"
                        "```html\n"
                        "<img src=\"cat.jpg\" alt=\"A sleeping cat\" width=\"300\">\n"
                        "```\n\n"
                        "- `src` — where the image lives\n"
                        "- `alt` — text used by screen readers and shown if the image fails to load\n"
                        "- `width` / `height` — optional sizing\n\n"
                        "### Linked images\n\n"
                        "Wrap the `<img>` in an `<a>` to turn it into a clickable banner:\n\n"
                        "```html\n"
                        "<a href=\"/portfolio\">\n"
                        "  <img src=\"banner.jpg\" alt=\"See my work\">\n"
                        "</a>\n"
                        "```"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-link-image",
                            "type": "web_editor",
                            "title": "Add a link and an image",
                            "config": {
                                "description": "Add a link to example.com and an image with alt text.",
                                "starter_html": (
                                    "<body>\n"
                                    "  <h1>My page</h1>\n"
                                    "  <!-- add a link and an image -->\n"
                                    "</body>"
                                ),
                                "starter_css": "body { font-family: sans-serif; padding: 1rem; }",
                                "starter_js": "",
                                "requirements": [
                                    "Page contains an <a> with href=\"https://example.com\"",
                                    "Page contains an <img> with an alt attribute",
                                ],
                            },
                        },
                    ],
                },
                {
                    "slug": "l3-forms",
                    "title": "Forms",
                    "duration": 14,
                    "text_md": (
                        "## Inputs and labels\n\n"
                        "Forms collect data from users.\n\n"
                        "```html\n"
                        "<form>\n"
                        "  <label for=\"name\">Name</label>\n"
                        "  <input id=\"name\" name=\"name\" type=\"text\">\n"
                        "\n"
                        "  <label for=\"email\">Email</label>\n"
                        "  <input id=\"email\" name=\"email\" type=\"email\">\n"
                        "\n"
                        "  <button type=\"submit\">Send</button>\n"
                        "</form>\n"
                        "```\n\n"
                        "### Input types worth knowing\n\n"
                        "| Type | What you get |\n"
                        "|---|---|\n"
                        "| `text` | one-line text box |\n"
                        "| `email` | text + email validation |\n"
                        "| `password` | text but masked |\n"
                        "| `number` | numeric only |\n"
                        "| `checkbox` | tick box |\n"
                        "| `radio` | one of several |\n\n"
                        "> **Accessibility:** always pair `<input>` with a `<label for=\"id\">`. Screen "
                        "readers (and your future self) will thank you."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-form-builder",
                            "type": "web_editor",
                            "title": "Build a contact form",
                            "config": {
                                "description": "Create a form with a name input and a submit button.",
                                "starter_html": (
                                    "<body>\n"
                                    "  <h1>Contact us</h1>\n"
                                    "  <form>\n"
                                    "    <!-- add a labelled name input and a submit button -->\n"
                                    "  </form>\n"
                                    "</body>"
                                ),
                                "starter_css": (
                                    "body { font-family: sans-serif; padding: 1rem; }\n"
                                    "label, input, button { display: block; margin: .5rem 0; }"
                                ),
                                "starter_js": "",
                                "requirements": [
                                    "Form contains an <input>",
                                    "Form contains a <button>",
                                ],
                            },
                        },
                    ],
                },
            ],
        },
        {
            "slug": "m2-css",
            "title": "CSS — Style",
            "lessons": [
                {
                    "slug": "l4-colors-fonts",
                    "title": "Colours & fonts",
                    "duration": 12,
                    "text_md": (
                        "## CSS in two lines\n\n"
                        "**CSS** describes how elements look. The simplest rule has a selector "
                        "and one or more properties.\n\n"
                        "```css\n"
                        "p {\n"
                        "  color: red;\n"
                        "  font-size: 18px;\n"
                        "}\n"
                        "```\n\n"
                        "### Common properties\n\n"
                        "| Property | What it controls |\n"
                        "|---|---|\n"
                        "| `color` | text colour |\n"
                        "| `background` | background colour or image |\n"
                        "| `font-size` | text size |\n"
                        "| `font-family` | font name(s) |\n"
                        "| `padding` | space inside an element |\n"
                        "| `margin` | space outside an element |\n\n"
                        "### Selectors\n\n"
                        "- `p { … }` — every `<p>` on the page\n"
                        "- `.note { … }` — every element with `class=\"note\"`\n"
                        "- `#main { … }` — the element with `id=\"main\"`\n\n"
                        "> Try the live editor below — change the paragraph colour and watch the preview update."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-css-red",
                            "type": "web_editor",
                            "title": "Make the paragraph red",
                            "config": {
                                "description": "Style the <p> element so its text is red.",
                                "starter_html": "<p>Hello, world!</p>",
                                "starter_css": "p {\n  /* your code here */\n}",
                                "starter_js": "",
                                "requirements": [
                                    "The <p> element must have color: red",
                                ],
                            },
                        },
                        {
                            "slug": "ex-css-quiz",
                            "type": "quiz",
                            "title": "Selectors quick check",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "Which selector targets the element with `id=\"main\"`?",
                                    "options": [
                                        {"text": ".main", "is_correct": False},
                                        {"text": "#main", "is_correct": True},
                                        {"text": "*main", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which property sets the **text** colour?",
                                    "options": [
                                        {"text": "color", "is_correct": True},
                                        {"text": "background", "is_correct": False},
                                        {"text": "text-color", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l5-flexbox",
                    "title": "Layout with flexbox",
                    "duration": 18,
                    "text_md": (
                        "## Flexbox in one screen\n\n"
                        "Flexbox arranges children along a single axis. Set the parent to "
                        "`display: flex`:\n\n"
                        "```css\n"
                        ".row {\n"
                        "  display: flex;\n"
                        "  gap: 1rem;\n"
                        "  justify-content: space-between;\n"
                        "}\n"
                        "```\n\n"
                        "Children become flex items, sitting side-by-side.\n\n"
                        "### The two key properties\n\n"
                        "| Property | Default | Common values |\n"
                        "|---|---|---|\n"
                        "| `justify-content` | `flex-start` | `center`, `space-between`, `space-around` |\n"
                        "| `align-items` | `stretch` | `center`, `flex-start`, `flex-end` |\n\n"
                        "### `flex-direction`\n\n"
                        "Switch the main axis. `row` (default) → horizontal; `column` → vertical."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-flex-row",
                            "type": "web_editor",
                            "title": "Three boxes in a row",
                            "config": {
                                "description": "Make the three boxes sit side-by-side using flexbox.",
                                "starter_html": (
                                    "<div class=\"row\">\n"
                                    "  <div class=\"box\">A</div>\n"
                                    "  <div class=\"box\">B</div>\n"
                                    "  <div class=\"box\">C</div>\n"
                                    "</div>"
                                ),
                                "starter_css": (
                                    ".row {\n"
                                    "  /* your code here */\n"
                                    "}\n"
                                    ".box {\n"
                                    "  padding: 1rem;\n"
                                    "  background: #6ee7b7;\n"
                                    "  text-align: center;\n"
                                    "}"
                                ),
                                "starter_js": "",
                                "requirements": [
                                    ".row must use display: flex",
                                ],
                            },
                        },
                    ],
                },
                {
                    "slug": "l6-responsive",
                    "title": "Responsive basics",
                    "duration": 14,
                    "text_md": (
                        "## Phones, tablets, desktops\n\n"
                        "A **responsive** page looks good on any screen size. Two tools do most of "
                        "the work: relative units and **media queries**.\n\n"
                        "### Use relative units\n\n"
                        "- `rem` — relative to the root font size (1 rem ≈ 16 px by default)\n"
                        "- `%` — relative to the parent\n"
                        "- `vw` / `vh` — viewport width / height\n\n"
                        "```css\n"
                        ".card { width: 100%; max-width: 32rem; padding: 1rem; }\n"
                        "```\n\n"
                        "### Media queries\n\n"
                        "Apply different rules under different conditions:\n\n"
                        "```css\n"
                        "@media (min-width: 768px) {\n"
                        "  .grid { grid-template-columns: 1fr 1fr; }\n"
                        "}\n"
                        "```\n\n"
                        "Above 768 px, the grid switches to two columns.\n\n"
                        "### Don't forget the viewport meta\n\n"
                        "Add this once, in `<head>`:\n\n"
                        "```html\n"
                        "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n"
                        "```"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-responsive-quiz",
                            "type": "quiz",
                            "title": "Responsive quick check",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "Which CSS unit is relative to the root font size?",
                                    "options": [
                                        {"text": "px", "is_correct": False},
                                        {"text": "rem", "is_correct": True},
                                        {"text": "pt", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which keyword starts a media query?",
                                    "options": [
                                        {"text": "@media", "is_correct": True},
                                        {"text": "@responsive", "is_correct": False},
                                        {"text": "@screen", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "Which `<meta>` tag scales the page on phones?",
                                    "options": [
                                        {"text": "viewport", "is_correct": True},
                                        {"text": "scale", "is_correct": False},
                                        {"text": "mobile", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                        {
                            "slug": "ex-responsive-card",
                            "type": "web_editor",
                            "title": "Style a responsive card",
                            "config": {
                                "description": "Style the card so it is centred and has a max-width.",
                                "starter_html": (
                                    "<div class=\"card\">\n"
                                    "  <h2>Welcome</h2>\n"
                                    "  <p>Thanks for visiting.</p>\n"
                                    "</div>"
                                ),
                                "starter_css": (
                                    "body { font-family: sans-serif; padding: 2rem; background: #f8fafc; }\n"
                                    ".card {\n"
                                    "  /* center horizontally, max-width 32rem */\n"
                                    "  padding: 1.5rem;\n"
                                    "  background: white;\n"
                                    "  border-radius: 12px;\n"
                                    "  box-shadow: 0 2px 6px rgba(0,0,0,.08);\n"
                                    "}"
                                ),
                                "starter_js": "",
                                "requirements": [
                                    ".card must have max-width set",
                                ],
                            },
                        },
                    ],
                },
            ],
        },
    ],
}
