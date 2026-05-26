"""Spanish A1: First Words.

Beginner Spanish at CEFR A1 — greetings, numbers, days, ordering at a
café. Designed for English speakers with zero prior Spanish.
"""

COURSE = {
    "slug": "spanish-a1-first-words",
    "title": "Spanish A1: First Words",
    "description": (
        "Your very first Spanish course. Greet people, count to twenty, "
        "name the days and order a coffee — all in under two hours. "
        "Built for total beginners; no prior Spanish needed."
    ),
    "category": "Languages",
    "modules": [
        {
            "slug": "m1-greetings-numbers",
            "title": "Saludos y números",
            "lessons": [
                {
                    "slug": "l1-hola",
                    "title": "Hola, ¿cómo estás?",
                    "duration": 10,
                    "text_md": (
                        "## Greetings\n\n"
                        "Spanish greetings change with the time of day and with how well you know the person.\n\n"
                        "### By time of day\n\n"
                        "| Spanish | English | When |\n"
                        "|---|---|---|\n"
                        "| Buenos días | Good morning | until ~13:00 |\n"
                        "| Buenas tardes | Good afternoon | ~13:00–20:00 |\n"
                        "| Buenas noches | Good evening / night | after 20:00 |\n\n"
                        "### Asking how someone is\n\n"
                        "- **¿Cómo estás?** — *How are you?* (informal)\n"
                        "- **¿Cómo está?** — *How are you?* (formal, to a stranger)\n"
                        "- **Muy bien, gracias.** — *Very well, thank you.*\n"
                        "- **¿Y tú?** — *And you?*\n\n"
                        "> **Pronunciation tip:** the `¿` and `¡` are upside-down marks used at the "
                        "**start** of a question or exclamation. They don't change pronunciation — they "
                        "just tell you what's coming."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-greetings-match",
                            "type": "matching",
                            "title": "Match the Spanish greeting to its English meaning",
                            "config": {
                                "pairs": [
                                    {"left": "Hola", "right": "Hello"},
                                    {"left": "Buenos días", "right": "Good morning"},
                                    {"left": "Buenas noches", "right": "Good evening"},
                                    {"left": "Gracias", "right": "Thank you"},
                                    {"left": "Adiós", "right": "Goodbye"},
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
                                    "text": "Someone says \"¿Cómo estás?\". A polite reply is…",
                                    "options": [
                                        {"text": "Muy bien, gracias. ¿Y tú?", "is_correct": True},
                                        {"text": "Adiós.", "is_correct": False},
                                        {"text": "Buenos días.", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "It's 9 a.m. — which greeting fits?",
                                    "options": [
                                        {"text": "Buenas noches", "is_correct": False},
                                        {"text": "Buenos días", "is_correct": True},
                                        {"text": "Buenas tardes", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l2-numeros",
                    "title": "Números 1 a 20",
                    "duration": 12,
                    "text_md": (
                        "## Counting in Spanish\n\n"
                        "Numbers 1–15 each have their own name. From 16 onwards, you build them.\n\n"
                        "### 1 to 10\n\n"
                        "| # | Spanish |\n"
                        "|---|---|\n"
                        "| 1 | uno |\n"
                        "| 2 | dos |\n"
                        "| 3 | tres |\n"
                        "| 4 | cuatro |\n"
                        "| 5 | cinco |\n"
                        "| 6 | seis |\n"
                        "| 7 | siete |\n"
                        "| 8 | ocho |\n"
                        "| 9 | nueve |\n"
                        "| 10 | diez |\n\n"
                        "### 11 to 20\n\n"
                        "- 11 once · 12 doce · 13 trece · 14 catorce · 15 quince\n"
                        "- 16 dieciséis · 17 diecisiete · 18 dieciocho · 19 diecinueve · 20 veinte\n\n"
                        "> Spot the pattern in **dieci-** + a number 6-9: that's *ten and six*, *ten and seven*…"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-numbers-srs",
                            "type": "srs_flashcard",
                            "title": "Numbers 1-10 flashcards",
                            "config": {
                                "instructions": "Tap to flip. Mark whether you knew it.",
                                "cards": [
                                    {"front": "uno", "back": "1"},
                                    {"front": "tres", "back": "3"},
                                    {"front": "cinco", "back": "5"},
                                    {"front": "siete", "back": "7"},
                                    {"front": "nueve", "back": "9"},
                                    {"front": "diez", "back": "10"},
                                ],
                            },
                        },
                        {
                            "slug": "ex-numbers-fill",
                            "type": "fill_blanks",
                            "title": "Complete the sequence",
                            "config": {
                                "text": "uno, dos, {{blank}}, cuatro, {{blank}}, seis",
                                "blanks": ["tres", "cinco"],
                                "word_bank": ["tres", "cinco", "siete", "ocho"],
                            },
                        },
                    ],
                },
                {
                    "slug": "l3-dias",
                    "title": "Días y meses",
                    "duration": 10,
                    "text_md": (
                        "## Days of the week\n\n"
                        "Spanish days are **not capitalised** (unlike English) and the week starts on Monday.\n\n"
                        "| Spanish | English |\n"
                        "|---|---|\n"
                        "| lunes | Monday |\n"
                        "| martes | Tuesday |\n"
                        "| miércoles | Wednesday |\n"
                        "| jueves | Thursday |\n"
                        "| viernes | Friday |\n"
                        "| sábado | Saturday |\n"
                        "| domingo | Sunday |\n\n"
                        "## Months\n\n"
                        "Months are also lowercase. Many look like English: *enero, febrero, marzo, "
                        "abril, mayo, junio, julio, agosto, septiembre, octubre, noviembre, diciembre*."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-dias-match",
                            "type": "matching",
                            "title": "Match the day",
                            "config": {
                                "pairs": [
                                    {"left": "lunes", "right": "Monday"},
                                    {"left": "miércoles", "right": "Wednesday"},
                                    {"left": "viernes", "right": "Friday"},
                                    {"left": "domingo", "right": "Sunday"},
                                ],
                                "shuffle": True,
                            },
                        },
                        {
                            "slug": "ex-dias-tf",
                            "type": "true_false",
                            "title": "Quick check",
                            "config": {
                                "statement": "In Spanish, the names of the days are capitalised (e.g. Lunes).",
                                "correct_answer": False,
                            },
                        },
                    ],
                },
            ],
        },
        {
            "slug": "m2-cafe",
            "title": "En la cafetería",
            "lessons": [
                {
                    "slug": "l4-pedir-cafe",
                    "title": "Pedir un café",
                    "duration": 12,
                    "text_md": (
                        "## Ordering coffee\n\n"
                        "A short, polite Spanish order has three parts:\n\n"
                        "> **Hola, un café con leche, por favor.**\n"
                        "> *Hi, a coffee with milk, please.*\n\n"
                        "### Useful phrases\n\n"
                        "- **un café** — a coffee (black, short)\n"
                        "- **un café con leche** — coffee with milk\n"
                        "- **un cortado** — espresso with a dash of milk\n"
                        "- **un té** — a tea\n"
                        "- **un agua** — a water\n"
                        "- **por favor** — please\n"
                        "- **gracias** — thank you\n"
                        "- **la cuenta, por favor** — the bill, please"
                    ),
                    "exercises": [
                        {
                            "slug": "ex-cafe-dialogue",
                            "type": "dialogue",
                            "title": "Order in Spanish",
                            "config": {
                                "context": "You walk into a small Madrid café. The waiter smiles.",
                                "messages": [
                                    {"speaker": "Camarero", "text": "Hola, ¿qué desea?"},
                                    {
                                        "speaker": "You",
                                        "text": "",
                                        "options": [
                                            {"id": "a", "text": "Un café con leche, por favor.", "is_correct": True},
                                            {"id": "b", "text": "Quiero café ahora.", "is_correct": False},
                                            {"id": "c", "text": "Coffee.", "is_correct": False},
                                        ],
                                    },
                                    {"speaker": "Camarero", "text": "Muy bien. ¿Algo más?"},
                                    {
                                        "speaker": "You",
                                        "text": "",
                                        "options": [
                                            {"id": "a", "text": "Nada más, gracias.", "is_correct": True},
                                            {"id": "b", "text": "No.", "is_correct": False},
                                            {"id": "c", "text": "More food please.", "is_correct": False},
                                        ],
                                    },
                                    {"speaker": "Camarero", "text": "Perfecto. Son 2,50 €."},
                                ],
                            },
                        },
                    ],
                },
                {
                    "slug": "l5-la-cuenta",
                    "title": "La cuenta — paying",
                    "duration": 10,
                    "text_md": (
                        "## Paying\n\n"
                        "In Spain you usually call the waiter and ask for the bill — it almost "
                        "never comes automatically.\n\n"
                        "### Key phrases\n\n"
                        "- **La cuenta, por favor.** — *The bill, please.*\n"
                        "- **¿Cuánto es?** — *How much is it?*\n"
                        "- **¿Puedo pagar con tarjeta?** — *Can I pay by card?*\n"
                        "- **Aquí tiene.** — *Here you go.*\n"
                        "- **Quédese con el cambio.** — *Keep the change.*\n\n"
                        "### Saying prices\n\n"
                        "Spanish writes a decimal **comma**, not a dot: `2,50 €` = two euros fifty. "
                        "You say *\"dos euros cincuenta\"*."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-cuenta-quiz",
                            "type": "quiz",
                            "title": "Pick the right phrase",
                            "config": {"passing_score": 70},
                            "questions": [
                                {
                                    "text": "How do you ask for the bill in Spanish?",
                                    "options": [
                                        {"text": "La cuenta, por favor.", "is_correct": True},
                                        {"text": "Buenos días.", "is_correct": False},
                                        {"text": "Adiós.", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "What does \"¿Cuánto es?\" mean?",
                                    "options": [
                                        {"text": "How much is it?", "is_correct": True},
                                        {"text": "Where is it?", "is_correct": False},
                                        {"text": "What is it?", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                                {
                                    "text": "How do you write the price two euros fifty in Spanish?",
                                    "options": [
                                        {"text": "2.50 €", "is_correct": False},
                                        {"text": "2,50 €", "is_correct": True},
                                        {"text": "€2.50", "is_correct": False},
                                    ],
                                    "points": 1,
                                },
                            ],
                        },
                    ],
                },
                {
                    "slug": "l6-gracias-adios",
                    "title": "Gracias y adiós",
                    "duration": 10,
                    "text_md": (
                        "## Wrapping up\n\n"
                        "Closing a conversation in Spanish is a chain of polite phrases. You don't have "
                        "to use every one — just pick a couple.\n\n"
                        "### Saying thanks\n\n"
                        "- **Gracias.** — Thanks.\n"
                        "- **Muchas gracias.** — Thanks a lot.\n"
                        "- **De nada.** — You're welcome.\n\n"
                        "### Saying goodbye\n\n"
                        "- **Adiós.** — Goodbye.\n"
                        "- **Hasta luego.** — See you later.\n"
                        "- **Hasta mañana.** — See you tomorrow.\n"
                        "- **Buen día.** — Have a good day.\n\n"
                        "> Try the sentence-builder below to put a whole farewell together."
                    ),
                    "exercises": [
                        {
                            "slug": "ex-adios-builder",
                            "type": "sentence_builder",
                            "title": "Build a polite goodbye",
                            "config": {
                                "instructions": "Arrange the words: \"Many thanks, see you tomorrow.\"",
                                "words": ["Muchas", "gracias", "hasta", "mañana"],
                                "correct_order": ["Muchas", "gracias", "hasta", "mañana"],
                                "distractors": ["por", "favor", "buenos"],
                            },
                        },
                        {
                            "slug": "ex-adios-match",
                            "type": "matching",
                            "title": "Match the farewell to its meaning",
                            "config": {
                                "pairs": [
                                    {"left": "Adiós", "right": "Goodbye"},
                                    {"left": "Hasta luego", "right": "See you later"},
                                    {"left": "Hasta mañana", "right": "See you tomorrow"},
                                    {"left": "De nada", "right": "You're welcome"},
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
