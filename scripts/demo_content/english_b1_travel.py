"""English B1: Travel & Conversation.

Functional English at CEFR B1 for travellers. Mix of vocabulary
flashcards, sentence-building, dialogues and reading comprehension.
"""

COURSE = {
    "slug": "english-b1-travel",
    "title": "English B1: Travel & Conversation",
    "description": (
        "Functional English for travellers at the intermediate (B1) level. "
        "Vocabulary, set phrases, dialogues and listening tasks for "
        "airports, hotels and restaurants — everything you need to feel "
        "confident on your next trip."
    ),
    "category": "Languages",
    "modules": [
        {
            "slug": "m1-airport",
            "title": "At the Airport",
            "lessons": [
                {
                    "slug": "l1-airport-vocab",
                    "title": "Airport vocabulary",
                    "duration": 10,
                    "text_md": (
                        "## Key airport words\n\n"
                        "Before you fly, get comfortable with the words you'll see on every "
                        "screen and hear in every announcement.\n\n"
                        "### Documents & check-in\n\n"
                        "- **Passport** — your identity document for international travel\n"
                        "- **Boarding pass** — the ticket that lets you board the plane\n"
                        "- **Check-in** — the desk (or app) where you confirm your seat and drop your bag\n"
                        "- **Baggage drop** — counter for putting checked luggage on the belt\n\n"
                        "### Inside the terminal\n\n"
                        "- **Security** — where you scan your bag and walk through the metal detector\n"
                        "- **Gate** — the door you walk through to reach the aircraft\n"
                        "- **Departure / Arrival** — leaving / coming in\n"
                        "- **Layover** — a stop between two flights\n"
                        "- **Delayed / Cancelled** — late / not happening\n\n"
                        "> **Tip:** *gate* and *terminal* are different. A terminal is the building; "
                        "a gate is one of many doors inside it."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-airport-srs",
                            "type": "srs_flashcard",
                            "title": "Airport flashcards",
                            "config": {
                                "instructions": "Tap each card to flip. Mark whether you knew it.",
                                "cards": [
                                    {"front": "Boarding pass", "back": "The ticket that lets you board the plane"},
                                    {"front": "Check-in", "back": "The desk where you confirm your seat and drop your luggage"},
                                    {"front": "Gate", "back": "The door you walk through to reach the aircraft"},
                                    {"front": "Layover", "back": "A stop between two flights"},
                                    {"front": "Delayed", "back": "Late — the flight will leave later than planned"},
                                    {"front": "Baggage claim", "back": "Where you pick up your luggage after landing"},
                                ],
                            },
                        },
                        {
                            "slug": "ex-airport-match",
                            "type": "matching",
                            "title": "Match the word to the definition",
                            "config": {
                                "pairs": [
                                    {"left": "Gate", "right": "Door to the aircraft"},
                                    {"left": "Layover", "right": "Stop between flights"},
                                    {"left": "Delayed", "right": "Leaving later than planned"},
                                    {"left": "Baggage claim", "right": "Where you collect luggage"},
                                ],
                                "shuffle": True,
                            },
                        },
                    ],
                },
                {
                    "slug": "l2-airport-phrases",
                    "title": "Polite requests at the airport",
                    "duration": 12,
                    "text_md": (
                        "## Phrases that get you through security\n\n"
                        "English airport staff are used to non-native speakers, but a polite "
                        "phrase still helps things move fast.\n\n"
                        "### Requesting\n\n"
                        "- \"I'd like a window seat, please.\"\n"
                        "- \"Could I have an aisle seat?\"\n"
                        "- \"Is this the gate for flight BA 217?\"\n\n"
                        "### Asking\n\n"
                        "- \"Do I need to remove my laptop from the bag?\"\n"
                        "- \"Where is the bathroom?\"\n"
                        "- \"How long is the layover?\"\n\n"
                        "### Saying something is wrong\n\n"
                        "- \"My flight has been delayed.\"\n"
                        "- \"I missed my connection.\"\n"
                        "- \"My bag didn't arrive.\"\n\n"
                        "> Notice the modal **could** / **would** — these turn a command "
                        "(*Give me a window seat*) into a polite request."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-airport-sentence",
                            "type": "sentence_builder",
                            "title": "Build a polite request",
                            "config": {
                                "instructions": "Arrange the words into a polite request for a window seat.",
                                "words": ["I", "would", "like", "a", "window", "seat", "please"],
                                "correct_order": ["I", "would", "like", "a", "window", "seat", "please"],
                                "distractors": ["the", "want", "give"],
                            },
                        },
                        {
                            "slug": "ex-airport-fill",
                            "type": "fill_blanks",
                            "title": "Fill in the missing word",
                            "config": {
                                "text": "Excuse me, {{blank}} I have an aisle seat, please?",
                                "blanks": ["could"],
                                "word_bank": ["could", "is", "the", "have"],
                            },
                        },
                    ],
                },
                {
                    "slug": "l3-listening",
                    "title": "Listening: a delayed flight",
                    "duration": 15,
                    "text_md": (
                        "## Read the announcement, then answer\n\n"
                        "Airport announcements use a predictable script: greeting, flight number, "
                        "what's happening, the reason, what to do next. Once you spot the pattern, "
                        "the words you don't know matter less.\n\n"
                        "### Spotting the structure\n\n"
                        "| Part | Example |\n"
                        "|---|---|\n"
                        "| Greeting | \"Attention passengers…\" |\n"
                        "| Flight | \"…on flight BA 217 to London\" |\n"
                        "| Status | \"…your flight has been delayed\" |\n"
                        "| Reason | \"…due to weather conditions\" |\n"
                        "| Action | \"…new boarding time is 15:30\" |\n"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-airport-reading",
                            "type": "reading",
                            "title": "Announcement comprehension",
                            "config": {
                                "passage": (
                                    "Attention passengers on flight BA 217 to London. Your flight has "
                                    "been delayed by approximately one hour due to weather conditions "
                                    "in London. New boarding time is 15:30 from gate B14. We apologise "
                                    "for the inconvenience. Passengers with connecting flights, please "
                                    "speak to a member of staff at the customer service desk."
                                ),
                                "questions": [
                                    {
                                        "question": "Why is the flight delayed?",
                                        "type": "multiple_choice",
                                        "options": ["Weather conditions", "Technical issue", "Crew shortage"],
                                        "correct_answer": "Weather conditions",
                                    },
                                    {
                                        "question": "What is the new boarding time?",
                                        "type": "multiple_choice",
                                        "options": ["14:30", "15:30", "16:30"],
                                        "correct_answer": "15:30",
                                    },
                                    {
                                        "question": "From which gate will the flight board?",
                                        "type": "multiple_choice",
                                        "options": ["A14", "B14", "C14"],
                                        "correct_answer": "B14",
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        },
        {
            "slug": "m2-hotel-restaurant",
            "title": "Hotel & Restaurant",
            "lessons": [
                {
                    "slug": "l4-ordering-food",
                    "title": "Ordering food",
                    "duration": 12,
                    "text_md": (
                        "## At a café or restaurant\n\n"
                        "Polite ways to order — pick whichever feels natural:\n\n"
                        "- \"Could I have the …, please?\"\n"
                        "- \"I'll have the …\"\n"
                        "- \"For me, the …\"\n"
                        "- \"What would you recommend?\"\n\n"
                        "### Things to remember\n\n"
                        "- Say **\"please\"** when ordering, **\"thank you\"** when food arrives.\n"
                        "- In the UK, you usually pay at the table; in the US, you ask for the **check** "
                        "(or **bill** in the UK).\n"
                        "- Tipping varies: ~15% in the US, ~10% in the UK, often included on the bill in Europe.\n\n"
                        "> Try the dialogue below — a barista will ask what you want."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-food-dialogue",
                            "type": "dialogue",
                            "title": "Ordering coffee — choose the polite line",
                            "config": {
                                "context": "You walk into a café. The barista smiles and asks for your order.",
                                "messages": [
                                    {"speaker": "Barista", "text": "Hi! What can I get you today?"},
                                    {
                                        "speaker": "You",
                                        "text": "",
                                        "options": [
                                            {"id": "a", "text": "A flat white, please.", "is_correct": True},
                                            {"id": "b", "text": "Coffee.", "is_correct": False},
                                            {"id": "c", "text": "Give me coffee now.", "is_correct": False},
                                        ],
                                    },
                                    {"speaker": "Barista", "text": "Sure! Anything else?"},
                                    {
                                        "speaker": "You",
                                        "text": "",
                                        "options": [
                                            {"id": "a", "text": "Could I also get a croissant?", "is_correct": True},
                                            {"id": "b", "text": "I want bread.", "is_correct": False},
                                            {"id": "c", "text": "More.", "is_correct": False},
                                        ],
                                    },
                                    {"speaker": "Barista", "text": "Of course. That'll be £5.20."},
                                ],
                            },
                        },
                    ],
                },
                {
                    "slug": "l5-hotel",
                    "title": "Hotel check-in",
                    "duration": 10,
                    "text_md": (
                        "## At the front desk\n\n"
                        "A hotel check-in follows a script — reservation → ID → key → information.\n\n"
                        "### Useful phrases\n\n"
                        "- \"I have a reservation under the name **Thompson**.\"\n"
                        "- \"Could I have a room with a view?\"\n"
                        "- \"What time is breakfast?\"\n"
                        "- \"Where can I leave my luggage?\"\n"
                        "- \"Is there Wi-Fi?\" (almost always yes — ask for the password)\n\n"
                        "### What they will ask\n\n"
                        "- Your passport or ID\n"
                        "- A credit card for incidentals\n"
                        "- Whether you want breakfast included"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-hotel-truefalse",
                            "type": "true_false",
                            "title": "Quick check",
                            "config": {
                                "statement": "At hotel check-in, you usually need to show a passport or ID.",
                                "correct_answer": True,
                            },
                        },
                        {
                            "slug": "ex-hotel-builder",
                            "type": "sentence_builder",
                            "title": "Tell them your name",
                            "config": {
                                "instructions": "Arrange the words to say you have a reservation.",
                                "words": ["I", "have", "a", "reservation", "under", "Thompson"],
                                "correct_order": ["I", "have", "a", "reservation", "under", "Thompson"],
                                "distractors": ["the", "name", "for"],
                            },
                        },
                    ],
                },
                {
                    "slug": "l6-menu",
                    "title": "Reading menus",
                    "duration": 12,
                    "text_md": (
                        "## Reading a menu\n\n"
                        "Menus love abbreviations: **(v)** vegetarian, **(vg)** vegan, **(gf)** gluten-free, "
                        "**\"market price\"** (you'll have to ask).\n\n"
                        "### Common menu sections\n\n"
                        "| Section | What it means |\n"
                        "|---|---|\n"
                        "| Starters | Small plates before the main course |\n"
                        "| Mains | The main dish |\n"
                        "| Sides | Extras (chips, salad) |\n"
                        "| Desserts | Sweet course at the end |\n"
                        "| Specials | Today's chef's pick — often best-value |\n"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-menu-reading",
                            "type": "reading",
                            "title": "Menu comprehension",
                            "config": {
                                "passage": (
                                    "STARTERS — Tomato soup (v) £6 · Smoked salmon £9 · Bruschetta (v) £7. "
                                    "MAINS — Grilled chicken £14 · Mushroom risotto (v) £12 · "
                                    "Beef burger £15 · Sea bass (gf) £17. "
                                    "DESSERTS — Apple pie £6 · Sorbet (vg) £5 · Chocolate brownie £6."
                                ),
                                "questions": [
                                    {
                                        "question": "Which main course is vegetarian?",
                                        "type": "multiple_choice",
                                        "options": ["Grilled chicken", "Mushroom risotto", "Beef burger", "Sea bass"],
                                        "correct_answer": "Mushroom risotto",
                                    },
                                    {
                                        "question": "Which dessert is suitable for a vegan?",
                                        "type": "multiple_choice",
                                        "options": ["Apple pie", "Sorbet", "Chocolate brownie"],
                                        "correct_answer": "Sorbet",
                                    },
                                    {
                                        "question": "How much is the most expensive starter?",
                                        "type": "multiple_choice",
                                        "options": ["£6", "£7", "£9"],
                                        "correct_answer": "£9",
                                    },
                                ],
                            },
                        },
                    ],
                },
            ],
        },
    ],
}
