"""Create 3 demo courses on the Render backend."""
import requests
import json
import sys

BASE = "https://lms-backend-0b8v.onrender.com/api/v1"

def login():
    r = requests.post(f"{BASE}/auth/login", json={"email": "admin@demo.com", "password": "password"})
    r.raise_for_status()
    return r.json()["access_token"]

def api(method, path, token, data=None):
    headers = {"Authorization": f"Bearer {token}"}
    if method == "POST":
        r = requests.post(f"{BASE}{path}", json=data, headers=headers)
    elif method == "GET":
        r = requests.get(f"{BASE}{path}", headers=headers)
    elif method == "DELETE":
        r = requests.delete(f"{BASE}{path}", headers=headers)
    else:
        r = requests.put(f"{BASE}{path}", json=data, headers=headers)
    if r.status_code >= 400:
        print(f"  ERROR {r.status_code}: {r.text[:200]}")
        return None
    try:
        return r.json()
    except:
        return {"status": "ok"}

def create_lesson(token, course_id, module_id, title, content_type, content, duration=10):
    data = {"title": title, "content_type": content_type, "content": content, "duration_minutes": duration}
    result = api("POST", f"/courses/{course_id}/modules/{module_id}/lessons/", token, data)
    if result and "id" in result:
        print(f"  Lesson: {title}")
        return result["id"]
    print(f"  FAIL lesson: {title} -> {result}")
    return None

def create_challenge(token, lesson_id, title, desc, lang, starter, solution, test_cases):
    ch = api("POST", "/sandbox/challenges", token, {
        "title": title, "description": desc, "language": lang,
        "starter_code": starter, "solution_code": solution, "lesson_id": lesson_id
    })
    if not ch or "id" not in ch:
        print(f"  FAIL challenge: {title}")
        return
    ch_id = ch["id"]
    for tc in test_cases:
        api("POST", f"/sandbox/challenges/{ch_id}/test-cases", token, tc)
    print(f"  Challenge: {title} ({len(test_cases)} tests)")

def create_quiz(token, lesson_id, title, questions, passing=60):
    q = api("POST", "/assessments/quizzes", token, {
        "title": title, "lesson_id": lesson_id, "passing_score": passing, "questions": questions
    })
    if q and "id" in q:
        print(f"  Quiz: {title} ({len(questions)} questions)")
    else:
        print(f"  FAIL quiz: {title}")

def main():
    print("Logging in...")
    token = login()
    print("OK\n")

    # Delete old courses
    print("=== Deleting old courses ===")
    courses = api("GET", "/admin/courses", token) or []
    for c in courses:
        api("DELETE", f"/courses/{c['id']}", token)
        print(f"  Deleted: {c['title']}")
    print()

    # ========================================
    # COURSE 1: PYTHON PROGRAMMING
    # ========================================
    print("=== Creating: Python Programming ===")
    c1 = api("POST", "/courses", token, {
        "title": "Python Programming",
        "description": "Learn Python from scratch. Write real code, solve challenges, and build projects.",
        "category": "programming"
    })
    c1_id = c1["id"]

    # Module 1: Basics
    m1 = api("POST", f"/courses/{c1_id}/modules", token, {"title": "Module 1: Python Basics"})
    m1_id = m1["id"]

    create_lesson(token, c1_id, m1_id, "What is Python?", "text", {
        "body": "# What is Python?\n\nPython is a high-level, interpreted programming language.\n\n## Why Learn Python?\n- **Easy to learn** — clean syntax\n- **Versatile** — web, data science, AI\n- **In-demand** — top skill in tech\n\n## Your First Code\n```python\nprint(\"Hello, World!\")\n```\n\n## Variables\n```python\nname = \"Alice\"\nage = 25\nis_student = True\n```",
        "format": "markdown"
    }, 10)

    lid = create_lesson(token, c1_id, m1_id, "Challenge: Hello World", "code_challenge", {}, 15)
    if lid:
        create_challenge(token, lid, "Hello World",
            "Write a program that prints exactly: Hello, World!",
            "python", "# Write your code here\n", 'print("Hello, World!")',
            [{"input": "", "expected_output": "Hello, World!\n", "is_hidden": False}])

    lid = create_lesson(token, c1_id, m1_id, "Quiz: Python Basics", "quiz", {}, 10)
    if lid:
        create_quiz(token, lid, "Python Basics Quiz", [
            {"text": "What function displays output in Python?", "options": ["echo()", "print()", "display()", "write()"], "correct": 1, "points": 10},
            {"text": "Which is a valid Python variable name?", "options": ["2name", "my-var", "my_name", "class"], "correct": 2, "points": 10},
            {"text": "What type is True in Python?", "options": ["string", "integer", "boolean", "float"], "correct": 2, "points": 10},
        ])

    # Module 2: Control Flow
    m2 = api("POST", f"/courses/{c1_id}/modules", token, {"title": "Module 2: Control Flow"})
    m2_id = m2["id"]

    create_lesson(token, c1_id, m2_id, "Conditionals: if, elif, else", "text", {
        "body": "# Conditionals\n\n## if Statement\n```python\nage = 18\nif age >= 18:\n    print(\"Adult\")\nelse:\n    print(\"Minor\")\n```\n\n## elif Chain\n```python\nscore = 85\nif score >= 90: grade = \"A\"\nelif score >= 80: grade = \"B\"\nelif score >= 70: grade = \"C\"\nelse: grade = \"F\"\nprint(f\"Grade: {grade}\")\n```",
        "format": "markdown"
    }, 15)

    lid = create_lesson(token, c1_id, m2_id, "Challenge: Even or Odd", "code_challenge", {}, 15)
    if lid:
        create_challenge(token, lid, "Even or Odd",
            'Read an integer from input. Print "Even" if even, "Odd" if odd.',
            "python", "n = int(input())\n# Your code here\n",
            'n = int(input())\nprint("Even" if n % 2 == 0 else "Odd")',
            [
                {"input": "4", "expected_output": "Even\n", "is_hidden": False},
                {"input": "7", "expected_output": "Odd\n", "is_hidden": False},
                {"input": "0", "expected_output": "Even\n", "is_hidden": True},
            ])

    create_lesson(token, c1_id, m2_id, "Loops: for and while", "text", {
        "body": "# Loops\n\n## for Loop\n```python\nfor i in range(5):\n    print(i)  # 0,1,2,3,4\n```\n\n## while Loop\n```python\ncount = 0\nwhile count < 5:\n    print(count)\n    count += 1\n```\n\n## break & continue\n```python\nfor i in range(10):\n    if i == 5: break\n    if i % 2 == 0: continue\n    print(i)  # 1, 3\n```",
        "format": "markdown"
    }, 15)

    lid = create_lesson(token, c1_id, m2_id, "Challenge: FizzBuzz", "code_challenge", {}, 20)
    if lid:
        create_challenge(token, lid, "FizzBuzz",
            "Read N. For 1 to N: print FizzBuzz if divisible by 15, Fizz if by 3, Buzz if by 5, else the number.",
            "python", "n = int(input())\n",
            "n = int(input())\nfor i in range(1, n+1):\n    if i % 15 == 0: print(\"FizzBuzz\")\n    elif i % 3 == 0: print(\"Fizz\")\n    elif i % 5 == 0: print(\"Buzz\")\n    else: print(i)",
            [
                {"input": "5", "expected_output": "1\n2\nFizz\n4\nBuzz\n", "is_hidden": False},
                {"input": "15", "expected_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz\n", "is_hidden": True},
            ])

    api("POST", f"/courses/{c1_id}/publish", token)
    print(f"PUBLISHED: Python Programming\n")

    # ========================================
    # COURSE 2: MATHEMATICS
    # ========================================
    print("=== Creating: Mathematics ===")
    c2 = api("POST", "/courses", token, {
        "title": "Mathematics Fundamentals",
        "description": "Master arithmetic, algebra, and geometry through interactive problem-solving.",
        "category": "mathematics"
    })
    c2_id = c2["id"]

    # Module 1: Arithmetic
    m1 = api("POST", f"/courses/{c2_id}/modules", token, {"title": "Module 1: Arithmetic"})
    m1_id = m1["id"]

    create_lesson(token, c2_id, m1_id, "Numbers and Operations", "text", {
        "body": "# Numbers and Operations\n\n## Natural Numbers\nNumbers we use for counting: 1, 2, 3, ...\n\n## Four Basic Operations\n| Operation | Symbol | Example |\n|-----------|--------|---------|\n| Addition | + | 3 + 5 = 8 |\n| Subtraction | - | 10 - 4 = 6 |\n| Multiplication | x | 4 x 7 = 28 |\n| Division | / | 20 / 5 = 4 |\n\n## Order of Operations (PEMDAS)\n1. **P**arentheses\n2. **E**xponents\n3. **M**ultiplication & **D**ivision (left to right)\n4. **A**ddition & **S**ubtraction (left to right)\n\n**Example:** 2 + 3 x 4 = 2 + 12 = **14** (not 20!)",
        "format": "markdown"
    }, 10)

    create_lesson(token, c2_id, m1_id, "Practice: Arithmetic Problems", "interactive", {
        "type": "math_practice",
        "instructions": "Solve these arithmetic problems. Use the math problem generator for more practice!",
        "difficulty": "easy"
    }, 20)

    lid = create_lesson(token, c2_id, m1_id, "Quiz: Arithmetic", "quiz", {}, 10)
    if lid:
        create_quiz(token, lid, "Arithmetic Quiz", [
            {"text": "What is 15 + 27?", "options": ["32", "42", "52", "43"], "correct": 1, "points": 5},
            {"text": "What is 8 x 7?", "options": ["54", "56", "63", "48"], "correct": 1, "points": 5},
            {"text": "What is 2 + 3 x 4?", "options": ["20", "14", "24", "11"], "correct": 1, "points": 10},
            {"text": "What is 100 / 4?", "options": ["20", "25", "40", "50"], "correct": 1, "points": 5},
        ])

    # Module 2: Algebra
    m2 = api("POST", f"/courses/{c2_id}/modules", token, {"title": "Module 2: Basic Algebra"})
    m2_id = m2["id"]

    create_lesson(token, c2_id, m2_id, "Variables and Equations", "text", {
        "body": "# Variables and Equations\n\n## What is a Variable?\nA variable is a letter that represents an unknown number.\n\n**Example:** In the equation `x + 3 = 7`, the variable `x` equals **4**.\n\n## Solving One-Step Equations\n\n### Addition/Subtraction\n```\nx + 5 = 12\nx = 12 - 5\nx = 7\n```\n\n### Multiplication/Division\n```\n3x = 15\nx = 15 / 3\nx = 5\n```\n\n## Two-Step Equations\n```\n2x + 3 = 11\n2x = 11 - 3\n2x = 8\nx = 4\n```\n\n## Check Your Answer\nAlways substitute back: 2(4) + 3 = 8 + 3 = 11 ✓",
        "format": "markdown"
    }, 15)

    create_lesson(token, c2_id, m2_id, "Practice: Algebra Problems", "interactive", {
        "type": "math_practice",
        "instructions": "Solve algebraic equations step by step.",
        "difficulty": "medium"
    }, 25)

    lid = create_lesson(token, c2_id, m2_id, "Quiz: Algebra", "quiz", {}, 15)
    if lid:
        create_quiz(token, lid, "Algebra Quiz", [
            {"text": "Solve: x + 7 = 15", "options": ["x = 7", "x = 8", "x = 22", "x = 9"], "correct": 1, "points": 10},
            {"text": "Solve: 3x = 24", "options": ["x = 6", "x = 8", "x = 21", "x = 72"], "correct": 1, "points": 10},
            {"text": "Solve: 2x - 5 = 11", "options": ["x = 3", "x = 6", "x = 8", "x = 16"], "correct": 2, "points": 10},
        ])

    # Module 3: Geometry
    m3 = api("POST", f"/courses/{c2_id}/modules", token, {"title": "Module 3: Geometry Basics"})
    m3_id = m3["id"]

    create_lesson(token, c2_id, m3_id, "Shapes and Perimeter", "text", {
        "body": "# Shapes and Perimeter\n\n## Common Shapes\n\n### Rectangle\n- **Perimeter** = 2(length + width)\n- **Area** = length x width\n\n### Triangle\n- **Perimeter** = a + b + c (sum of all sides)\n- **Area** = (base x height) / 2\n\n### Circle\n- **Circumference** = 2 x pi x r\n- **Area** = pi x r^2\n- pi is approximately 3.14159\n\n## Example\nA rectangle with length 8 and width 5:\n- Perimeter = 2(8 + 5) = 2(13) = **26**\n- Area = 8 x 5 = **40**",
        "format": "markdown"
    }, 15)

    lid = create_lesson(token, c2_id, m3_id, "Quiz: Geometry", "quiz", {}, 10)
    if lid:
        create_quiz(token, lid, "Geometry Quiz", [
            {"text": "What is the area of a rectangle 6 x 4?", "options": ["10", "20", "24", "12"], "correct": 2, "points": 10},
            {"text": "What is the perimeter of a square with side 5?", "options": ["10", "15", "20", "25"], "correct": 2, "points": 10},
            {"text": "Area of a triangle with base 10 and height 6?", "options": ["60", "30", "16", "36"], "correct": 1, "points": 10},
        ])

    api("POST", f"/courses/{c2_id}/publish", token)
    print(f"PUBLISHED: Mathematics Fundamentals\n")

    # ========================================
    # COURSE 3: ENGLISH LANGUAGE
    # ========================================
    print("=== Creating: English Language ===")
    c3 = api("POST", "/courses", token, {
        "title": "English Language",
        "description": "Improve your English skills through reading, video lessons, and practice exercises.",
        "category": "languages"
    })
    c3_id = c3["id"]

    # Module 1: Grammar Basics
    m1 = api("POST", f"/courses/{c3_id}/modules", token, {"title": "Module 1: Grammar Essentials"})
    m1_id = m1["id"]

    create_lesson(token, c3_id, m1_id, "Parts of Speech", "text", {
        "body": "# Parts of Speech\n\nEvery word in English belongs to a category called a **part of speech**.\n\n## 1. Nouns\nWords that name people, places, things, or ideas.\n- **Examples:** dog, London, happiness, teacher\n\n## 2. Verbs\nWords that show action or state of being.\n- **Examples:** run, think, is, become\n\n## 3. Adjectives\nWords that describe nouns.\n- **Examples:** big, beautiful, fast, clever\n\n## 4. Adverbs\nWords that modify verbs, adjectives, or other adverbs.\n- **Examples:** quickly, very, always, carefully\n\n## 5. Prepositions\nWords that show relationships.\n- **Examples:** in, on, at, between, under\n\n## Quick Test\n> The **tall** man **quickly** **ran** **across** the **street**.\n\n- tall = adjective\n- quickly = adverb\n- ran = verb\n- across = preposition\n- street = noun",
        "format": "markdown"
    }, 15)

    create_lesson(token, c3_id, m1_id, "Video: English Tenses Explained", "video", {
        "url": "https://www.youtube.com/watch?v=PmZFyVMIk0A"
    }, 20)

    lid = create_lesson(token, c3_id, m1_id, "Quiz: Parts of Speech", "quiz", {}, 10)
    if lid:
        create_quiz(token, lid, "Parts of Speech Quiz", [
            {"text": "What part of speech is 'quickly'?", "options": ["noun", "verb", "adjective", "adverb"], "correct": 3, "points": 10},
            {"text": "Which word is a noun?", "options": ["run", "beautiful", "happiness", "quickly"], "correct": 2, "points": 10},
            {"text": "In 'She sings beautifully', what is 'beautifully'?", "options": ["noun", "verb", "adjective", "adverb"], "correct": 3, "points": 10},
        ])

    # Module 2: Reading & Vocabulary
    m2 = api("POST", f"/courses/{c3_id}/modules", token, {"title": "Module 2: Reading & Vocabulary"})
    m2_id = m2["id"]

    create_lesson(token, c3_id, m2_id, "Reading: The Fox and the Grapes", "text", {
        "body": "# The Fox and the Grapes\n*Aesop's Fable*\n\nOne hot summer day, a Fox was walking through an orchard. He stopped before a bunch of grapes that hung from a high branch.\n\n\"Just the thing to quench my thirst,\" he said.\n\nDrawing back a few paces, he took a running leap and just missed the bunch. Turning round again with one, two, three, he jumped up, but with no greater success.\n\nAgain and again he tried, but in vain.\n\nAt last he turned away, hiding his disappointment. \"The grapes are sour anyway,\" he said. \"I am sure they are not ripe.\"\n\n---\n\n## Vocabulary\n- **orchard** - a garden of fruit trees\n- **quench** - to satisfy (thirst)\n- **in vain** - without success\n- **sour** - having an acid taste\n\n## Moral\nIt is easy to despise what you cannot get.\n\n## Discussion Questions\n1. Why did the Fox call the grapes sour?\n2. Have you ever pretended not to want something you could not get?\n3. What does this story teach us about honesty with ourselves?",
        "format": "markdown"
    }, 20)

    create_lesson(token, c3_id, m2_id, "Video: Build Your Vocabulary", "video", {
        "url": "https://www.youtube.com/watch?v=4m6MKxhGVqI"
    }, 15)

    lid = create_lesson(token, c3_id, m2_id, "Quiz: Reading Comprehension", "quiz", {}, 10)
    if lid:
        create_quiz(token, lid, "Reading Comprehension Quiz", [
            {"text": "Why did the Fox want the grapes?", "options": ["He was hungry", "He was thirsty", "He wanted to sell them", "His friend asked him"], "correct": 1, "points": 10},
            {"text": "What does 'in vain' mean?", "options": ["in pain", "without success", "very hard", "with anger"], "correct": 1, "points": 10},
            {"text": "What is the moral of the story?", "options": ["Never give up", "Grapes are sour", "We often reject what we cannot have", "Foxes are clever"], "correct": 2, "points": 10},
        ])

    # Module 3: Writing
    m3 = api("POST", f"/courses/{c3_id}/modules", token, {"title": "Module 3: Writing Skills"})
    m3_id = m3["id"]

    create_lesson(token, c3_id, m3_id, "How to Write a Paragraph", "text", {
        "body": "# How to Write a Paragraph\n\n## Structure\nEvery good paragraph has three parts:\n\n### 1. Topic Sentence\nThe main idea of the paragraph. It tells the reader what the paragraph is about.\n\n### 2. Supporting Sentences\nDetails, examples, and explanations that support the topic sentence.\n\n### 3. Concluding Sentence\nWraps up the paragraph and reinforces the main idea.\n\n## Example\n> **Dogs make wonderful pets.** They are loyal and loving companions who greet you at the door every day. They encourage you to exercise by needing daily walks. Studies show that dog owners have lower blood pressure and less stress. **For all these reasons, a dog is the perfect addition to any family.**\n\n## Tips\n- Keep paragraphs focused on ONE main idea\n- Use transition words: however, moreover, therefore, in addition\n- Vary your sentence length\n- Proofread for grammar and spelling",
        "format": "markdown"
    }, 15)

    create_lesson(token, c3_id, m3_id, "Assignment: Write a Paragraph", "file_upload", {
        "instructions": "Write a paragraph (5-7 sentences) about your favorite hobby. Include a topic sentence, supporting details, and a concluding sentence. Upload your work as a text file or PDF."
    }, 30)

    api("POST", f"/courses/{c3_id}/publish", token)
    print(f"PUBLISHED: English Language\n")

    # Create assignment for English
    print("=== Creating Assignments ===")
    api("POST", "/assignments", token, {
        "title": "Write a Short Essay",
        "description": "Write a 200-word essay about 'The Importance of Learning Languages'. Include an introduction, body paragraph, and conclusion.",
        "due_date": "2026-04-15T23:59:59Z",
        "max_score": 100,
        "course_id": c3_id
    })
    print("  Assignment: Write a Short Essay (English)")

    api("POST", "/assignments", token, {
        "title": "Python Mini-Project",
        "description": "Create a simple calculator program that can add, subtract, multiply, and divide two numbers. The program should ask the user for input.",
        "due_date": "2026-04-15T23:59:59Z",
        "max_score": 100,
        "course_id": c1_id
    })
    print("  Assignment: Python Mini-Project (Programming)")

    # Create skills
    print("\n=== Creating Skills ===")
    for name, cat in [("Python", "programming"), ("Problem Solving", "programming"), ("Algebra", "mathematics"), ("Geometry", "mathematics"), ("Grammar", "languages"), ("Vocabulary", "languages"), ("Reading", "languages")]:
        api("POST", "/skills", token, {"name": name, "category": cat})
        print(f"  Skill: {name} ({cat})")

    # Create calendar events
    print("\n=== Creating Calendar Events ===")
    api("POST", "/calendar/events", token, {
        "title": "Python Live Coding Session",
        "description": "Join us for a live coding session where we solve problems together!",
        "start_time": "2026-03-20T14:00:00Z",
        "end_time": "2026-03-20T15:30:00Z"
    })
    print("  Event: Python Live Coding Session")

    api("POST", "/calendar/events", token, {
        "title": "Math Problem Marathon",
        "description": "Compete to solve the most math problems in 1 hour!",
        "start_time": "2026-03-22T10:00:00Z",
        "end_time": "2026-03-22T11:00:00Z"
    })
    print("  Event: Math Problem Marathon")

    api("POST", "/calendar/events", token, {
        "title": "English Essay Deadline",
        "description": "Submit your short essay by this date.",
        "start_time": "2026-04-15T23:59:00Z",
        "end_time": "2026-04-15T23:59:59Z"
    })
    print("  Event: English Essay Deadline")

    print("\n=== ALL DONE ===")
    print(f"Python Programming: {c1_id}")
    print(f"Mathematics: {c2_id}")
    print(f"English Language: {c3_id}")

if __name__ == "__main__":
    main()
