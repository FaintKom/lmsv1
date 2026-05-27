"""German A1: First Words.

Beginner German at CEFR A1 — greetings, numbers, days, ordering at a
café. Designed for English speakers with zero prior German. Mirrors
the structure of ``spanish_a1_first_words`` so the demo org has a
matched pair of beginner-language courses.
"""

COURSE = {
    "slug": "german-a1-first-words",
    "title": "German A1: First Words",
    "description": (
        "Your very first German course. Greet people, count to twenty, "
        "name the days and order a coffee — all in under two hours. "
        "Built for total beginners; no prior German needed."
    ),
    "category": "Languages",
    "modules": [
        {
            "slug": "m1-begruessung-zahlen",
            "title": "Begrüßung und Zahlen",
            "lessons": [
                {
                    "slug": "l1-hallo",
                    "title": "Hallo, wie geht's?",
                    "duration": 10,
                    "text_md": (
                        "## Greetings\n\n"
                        "German greetings change with the time of day and with how well you know the person.\n\n"
                        "### By time of day\n\n"
                        "| German | English | When |\n"
                        "|---|---|---|\n"
                        "| Guten Morgen | Good morning | until ~11:00 |\n"
                        "| Guten Tag | Good day / hello | ~11:00–18:00 |\n"
                        "| Guten Abend | Good evening | after 18:00 |\n"
                        "| Gute Nacht | Good night | only at bedtime |\n\n"
                        "### Asking how someone is\n\n"
                        "- **Wie geht's?** — *How are you?* (informal, with friends)\n"
                        "- **Wie geht es Ihnen?** — *How are you?* (formal, to a stranger)\n"
                        "- **Mir geht es gut, danke.** — *I'm well, thanks.*\n"
                        "- **Und dir?** — *And you?* (informal) / **Und Ihnen?** (formal)\n\n"
                        ":::tip Du vs Sie\n"
                        "German has two ways of saying *you*: **du** for friends, family, "
                        "children and people your own age; **Sie** (always capitalised) for "
                        "everyone else. When in doubt, use **Sie** — it's polite and safe.\n"
                        ":::"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-greetings-match",
                            "type": "matching",
                            "title": "Match the German greeting to its English meaning",
                            "config": {
                                "pairs": [
                                    {"left": "Hallo", "right": "Hello"},
                                    {"left": "Guten Morgen", "right": "Good morning"},
                                    {"left": "Guten Abend", "right": "Good evening"},
                                    {"left": "Danke", "right": "Thank you"},
                                    {"left": "Auf Wiedersehen", "right": "Goodbye"},
                                ],
                                "shuffle": True,
                            },
                        },
                        {
                            "slug": "ex-greetings-quiz",
                            "type": "quiz",
                            "title": "Pick the polite reply",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "Someone says \"Wie geht's?\". A polite reply is…",
                                    "options": [
                                        {"text": "Mir geht es gut, danke. Und dir?", "is_correct": True},
                                        {"text": "Auf Wiedersehen.", "is_correct": False},
                                        {"text": "Guten Morgen.", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "It's 9 a.m. — which greeting fits?",
                                    "options": [
                                        {"text": "Guten Abend", "is_correct": False},
                                        {"text": "Guten Morgen", "is_correct": True},
                                        {"text": "Gute Nacht", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "You meet your new boss on her first day. Which form do you use?",
                                    "options": [
                                        {"text": "du", "is_correct": False},
                                        {"text": "Sie", "is_correct": True},
                                        {"text": "either is fine", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l2-zahlen",
                    "title": "Zahlen 1 bis 20",
                    "duration": 12,
                    "text_md": (
                        "## Counting in German\n\n"
                        "Numbers 1–12 each have their own name. From 13 onwards, you build them by "
                        "adding **-zehn** (ten).\n\n"
                        "### 1 to 10\n\n"
                        "| # | German |\n"
                        "|---|---|\n"
                        "| 1 | eins |\n"
                        "| 2 | zwei |\n"
                        "| 3 | drei |\n"
                        "| 4 | vier |\n"
                        "| 5 | fünf |\n"
                        "| 6 | sechs |\n"
                        "| 7 | sieben |\n"
                        "| 8 | acht |\n"
                        "| 9 | neun |\n"
                        "| 10 | zehn |\n\n"
                        "### 11 to 20\n\n"
                        "- 11 elf · 12 zwölf · 13 dreizehn · 14 vierzehn · 15 fünfzehn\n"
                        "- 16 sechzehn · 17 siebzehn · 18 achtzehn · 19 neunzehn · 20 zwanzig\n\n"
                        ":::tip Spot the pattern\n"
                        "From 13 to 19 German just adds **-zehn**: *dreizehn* = *three + ten*, "
                        "*vierzehn* = *four + ten*. Two small spelling tricks: **sechzehn** drops "
                        "the *-s* of sechs, and **siebzehn** drops the *-en* of sieben.\n"
                        ":::"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-numbers-srs",
                            "type": "srs_flashcard",
                            "title": "Numbers 1-10 flashcards",
                            "config": {
                                "instructions": "Tap to flip. Mark whether you knew it.",
                                "cards": [
                                    {"front": "eins", "back": "1"},
                                    {"front": "drei", "back": "3"},
                                    {"front": "fünf", "back": "5"},
                                    {"front": "sieben", "back": "7"},
                                    {"front": "neun", "back": "9"},
                                    {"front": "zehn", "back": "10"},
                                ],
                            },
                        },
                        {
                            "slug": "ex-numbers-fill",
                            "type": "fill_blanks",
                            "title": "Complete the sequence",
                            "config": {
                                "text": "eins, zwei, {{blank}}, vier, {{blank}}, sechs",
                                "blanks": ["drei", "fünf"],
                                "word_bank": ["drei", "fünf", "sieben", "acht"],
                            },
                        },
                    ],
                },
                {
                    "slug": "l3-tage",
                    "title": "Tage und Monate",
                    "duration": 10,
                    "text_md": (
                        "## Days of the week\n\n"
                        "German days **are capitalised** (every noun in German is) and the week "
                        "starts on Monday.\n\n"
                        "| German | English |\n"
                        "|---|---|\n"
                        "| Montag | Monday |\n"
                        "| Dienstag | Tuesday |\n"
                        "| Mittwoch | Wednesday |\n"
                        "| Donnerstag | Thursday |\n"
                        "| Freitag | Friday |\n"
                        "| Samstag | Saturday |\n"
                        "| Sonntag | Sunday |\n\n"
                        ":::tip Samstag vs Sonnabend\n"
                        "In southern Germany people say **Samstag**; in northern Germany you'll also "
                        "hear **Sonnabend** for the same day. Both are correct.\n"
                        ":::\n\n"
                        "## Months\n\n"
                        "Months are also capitalised. Many look like English: *Januar, Februar, März, "
                        "April, Mai, Juni, Juli, August, September, Oktober, November, Dezember*."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-tage-match",
                            "type": "matching",
                            "title": "Match the day",
                            "config": {
                                "pairs": [
                                    {"left": "Montag", "right": "Monday"},
                                    {"left": "Mittwoch", "right": "Wednesday"},
                                    {"left": "Freitag", "right": "Friday"},
                                    {"left": "Sonntag", "right": "Sunday"},
                                ],
                                "shuffle": True,
                            },
                        },
                        {
                            "slug": "ex-tage-tf",
                            "type": "true_false",
                            "title": "Quick check",
                            "config": {
                                "statement": "In German, the names of the days are written in lowercase (e.g. montag).",
                                "correct_answer": False,
                            },
                        },
                    ],
                },
            ],
        },
        {
            "slug": "m2-cafe",
            "title": "Im Café",
            "lessons": [
                {
                    "slug": "l4-kaffee-bestellen",
                    "title": "Einen Kaffee bestellen",
                    "duration": 12,
                    "text_md": (
                        "## Ordering coffee\n\n"
                        "A short, polite German order has three parts:\n\n"
                        "> **Hallo, einen Kaffee mit Milch, bitte.**\n"
                        "> *Hi, a coffee with milk, please.*\n\n"
                        "### Useful phrases\n\n"
                        "- **einen Kaffee** — a coffee (black)\n"
                        "- **einen Kaffee mit Milch** — coffee with milk\n"
                        "- **einen Espresso** — an espresso\n"
                        "- **einen Tee** — a tea\n"
                        "- **ein Wasser** — a water\n"
                        "- **bitte** — please\n"
                        "- **danke** — thank you\n"
                        "- **die Rechnung, bitte** — the bill, please\n\n"
                        ":::tip Article gymnastics\n"
                        "*Kaffee* and *Tee* are masculine (*der Kaffee*, *der Tee*) — that's why "
                        "you order *einen* Kaffee (the masculine form changes in the accusative). "
                        "*Wasser* is neuter (*das Wasser*) — so you order *ein* Wasser, unchanged.\n"
                        ":::"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-cafe-dialogue",
                            "type": "dialogue",
                            "title": "Order in German",
                            "config": {
                                "context": "You walk into a small Berlin café. The waiter smiles.",
                                "messages": [
                                    {"speaker": "Kellner", "text": "Hallo, was darf es sein?"},
                                    {
                                        "speaker": "You",
                                        "text": "",
                                        "options": [
                                            {"id": "a", "text": "Einen Kaffee mit Milch, bitte.", "is_correct": True},
                                            {"id": "b", "text": "Kaffee will ich jetzt.", "is_correct": False},
                                            {"id": "c", "text": "Coffee.", "is_correct": False},
                                        ],
                                    },
                                    {"speaker": "Kellner", "text": "Sehr gerne. Sonst noch etwas?"},
                                    {
                                        "speaker": "You",
                                        "text": "",
                                        "options": [
                                            {"id": "a", "text": "Nein danke, das ist alles.", "is_correct": True},
                                            {"id": "b", "text": "Nein.", "is_correct": False},
                                            {"id": "c", "text": "More food please.", "is_correct": False},
                                        ],
                                    },
                                    {"speaker": "Kellner", "text": "Perfekt. Das macht 2,80 €."},
                                ],
                            },
                        },
                    ],
                },
                {
                    "slug": "l5-die-rechnung",
                    "title": "Die Rechnung — paying",
                    "duration": 10,
                    "text_md": (
                        "## Paying\n\n"
                        "In Germany you usually call the waiter and ask for the bill — it almost "
                        "never comes automatically.\n\n"
                        "### Key phrases\n\n"
                        "- **Die Rechnung, bitte.** — *The bill, please.*\n"
                        "- **Wie viel kostet das?** — *How much does it cost?*\n"
                        "- **Kann ich mit Karte zahlen?** — *Can I pay by card?*\n"
                        "- **Bitte sehr.** — *Here you go.*\n"
                        "- **Stimmt so.** — *Keep the change.*\n\n"
                        "### Saying prices\n\n"
                        "German writes a decimal **comma**, not a dot: `2,80 €` = two euros eighty. "
                        "You say *\"zwei Euro achtzig\"*."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-rechnung-quiz",
                            "type": "quiz",
                            "title": "Pick the right phrase",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "How do you ask for the bill in German?",
                                    "options": [
                                        {"text": "Die Rechnung, bitte.", "is_correct": True},
                                        {"text": "Guten Morgen.", "is_correct": False},
                                        {"text": "Auf Wiedersehen.", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "What does \"Wie viel kostet das?\" mean?",
                                    "options": [
                                        {"text": "How much does it cost?", "is_correct": True},
                                        {"text": "Where is it?", "is_correct": False},
                                        {"text": "What is it?", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "How do you write the price two euros eighty in German?",
                                    "options": [
                                        {"text": "2.80 €", "is_correct": False},
                                        {"text": "2,80 €", "is_correct": True},
                                        {"text": "€2.80", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l6-danke-tschuess",
                    "title": "Danke und Tschüss",
                    "duration": 10,
                    "text_md": (
                        "## Wrapping up\n\n"
                        "Closing a conversation in German is a chain of polite phrases. You don't have "
                        "to use every one — just pick a couple.\n\n"
                        "### Saying thanks\n\n"
                        "- **Danke.** — Thanks.\n"
                        "- **Vielen Dank.** — Thanks a lot.\n"
                        "- **Bitte.** / **Gern geschehen.** — You're welcome.\n\n"
                        "### Saying goodbye\n\n"
                        "- **Auf Wiedersehen.** — Goodbye. (formal)\n"
                        "- **Tschüss.** — Bye. (informal, very common)\n"
                        "- **Bis später.** — See you later.\n"
                        "- **Bis morgen.** — See you tomorrow.\n"
                        "- **Schönen Tag noch!** — Have a nice day.\n\n"
                        "> Try the sentence-builder below to put a whole farewell together."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-tschuess-builder",
                            "type": "sentence_builder",
                            "title": "Build a polite goodbye",
                            "config": {
                                "instructions": "Arrange the words: \"Many thanks, see you tomorrow.\"",
                                "words": ["Vielen", "Dank", "bis", "morgen"],
                                "correct_order": ["Vielen", "Dank", "bis", "morgen"],
                                "distractors": ["bitte", "guten", "wieder"],
                            },
                        },
                        {
                            "slug": "ex-tschuess-match",
                            "type": "matching",
                            "title": "Match the farewell to its meaning",
                            "config": {
                                "pairs": [
                                    {"left": "Auf Wiedersehen", "right": "Goodbye"},
                                    {"left": "Bis später", "right": "See you later"},
                                    {"left": "Bis morgen", "right": "See you tomorrow"},
                                    {"left": "Gern geschehen", "right": "You're welcome"},
                                ],
                                "shuffle": True,
                            },
                        },
                    ],
                },
            ],
        },
    ],
}
