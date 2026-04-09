"""Create TEMPLATE courses showcasing all platform features and exercise types."""
import urllib.request
import os
import json
import ssl
import sys

ctx = ssl.create_default_context()
BASE = "https://lms-backend-0b8v.onrender.com/api/v1"


def api(method, path, token=None, data=None):
    url = BASE + path
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(url, data=body, method=method)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        resp = urllib.request.urlopen(req, context=ctx)
        return json.loads(resp.read())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode()
        print(f"ERROR {e.code} on {method} {path}: {err_body[:300]}", file=sys.stderr)
        return None


# Login as super_admin (only admin/super_admin can create templates)
data = api("POST", "/auth/login", data={"email": os.environ.get("LMS_ADMIN_EMAIL",""), "password": os.environ.get("LMS_ADMIN_PASSWORD","")})
token = data["access_token"]
print("Logged in as super_admin")


# ═══════════════════════════════════════════════════════
# COURSE 1: Higher Mathematics (Template)
# ═══════════════════════════════════════════════════════
c1 = api("POST", "/courses", token=token, data={
    "title": "Высшая математика",
    "description": "Университетский курс: математический анализ, линейная алгебра, теория вероятностей. Интерактивные задания с формулами LaTeX.",
    "category": "Mathematics",
    "is_template": True
})
c1_id = c1["id"]
print(f"Course 1 (Math template): {c1_id}")

# Module 1.1: Calculus
m1 = api("POST", f"/courses/{c1_id}/modules", token=token, data={"title": "Дифференциальное исчисление"})
m1_id = m1["id"]

# Lesson 1.1.1: Limits
l1 = api("POST", f"/courses/{c1_id}/modules/{m1_id}/lessons", token=token, data={
    "title": "Пределы и непрерывность",
    "content_type": "text",
    "content": {
        "format": "tiptap",
        "body": {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Пределы и непрерывность"}]},
                {"type": "paragraph", "content": [
                    {"type": "text", "text": "Предел описывает значение, к которому стремится функция при приближении аргумента к некоторому значению. Формальное определение:"}
                ]},
                {"type": "mathBlock", "attrs": {"latex": "\\lim_{x \\to a} f(x) = L"}},
                {"type": "paragraph", "content": [
                    {"type": "text", "text": "Это означает, что для любого ε > 0 существует δ > 0 такое, что если 0 < |x - a| < δ, то |f(x) - L| < ε."}
                ]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Основные свойства пределов"}]},
                {"type": "bulletList", "content": [
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Сумма: "}, {"type": "text", "text": "lim(f + g) = lim f + lim g"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Произведение: "}, {"type": "text", "text": "lim(fg) = lim f · lim g"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Частное: "}, {"type": "text", "text": "lim(f/g) = lim f / lim g (если lim g ≠ 0)"}]}]},
                ]},
                {"type": "callout", "attrs": {"variant": "info"}, "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Запомните: функция непрерывна в точке a, если lim f(x) при x→a равен f(a)."}]}
                ]},
            ]
        }
    },
    "duration_minutes": 15
})
l1_id = l1["id"]
print(f"  Lesson: Limits ({l1_id})")

# EXERCISE 1: Quiz on Limits
ex1 = api("POST", "/exercises", token=token, data={
    "lesson_id": l1_id,
    "exercise_type": "quiz",
    "title": "Тест: Пределы",
    "config": {"passing_score": 60, "time_limit_minutes": 10}
})
ex1_id = ex1["id"]
api("POST", f"/exercises/{ex1_id}/questions", token=token, data={
    "question_text": "Чему равен lim(x→2) (x² - 4)/(x - 2)?",
    "question_type": "multiple_choice",
    "options": [
        {"text": "0", "is_correct": False},
        {"text": "2", "is_correct": False},
        {"text": "4", "is_correct": True},
        {"text": "Не существует", "is_correct": False}
    ],
    "correct_answer": "4",
    "points": 1
})
api("POST", f"/exercises/{ex1_id}/questions", token=token, data={
    "question_text": "Функция f(x) непрерывна в точке x=a, если:",
    "question_type": "multiple_choice",
    "options": [
        {"text": "f(a) определено, lim f(x) существует, и lim f(x) = f(a)", "is_correct": True},
        {"text": "f(a) определено", "is_correct": False},
        {"text": "График не имеет разрывов", "is_correct": False},
        {"text": "f дифференцируема в a", "is_correct": False}
    ],
    "correct_answer": "f(a) определено, lim f(x) существует, и lim f(x) = f(a)",
    "points": 1
})
api("POST", f"/exercises/{ex1_id}/questions", token=token, data={
    "question_text": "Чему равен lim(x→∞) (3x² + 2x)/(x² + 1)?",
    "question_type": "multiple_choice",
    "options": [
        {"text": "0", "is_correct": False},
        {"text": "3", "is_correct": True},
        {"text": "∞", "is_correct": False},
        {"text": "2", "is_correct": False}
    ],
    "correct_answer": "3",
    "points": 1
})
print(f"  Exercise: Quiz ({ex1_id})")

# EXERCISE 2: True/False
ex_tf = api("POST", "/exercises", token=token, data={
    "lesson_id": l1_id,
    "exercise_type": "true_false",
    "title": "Верно/Неверно: Пределы",
    "config": {"statement": "Если lim(x→a) f(x) существует, то f(a) обязательно определено.", "correct_answer": False},
    "sort_order": 1
})
print(f"  Exercise: True/False ({ex_tf['id']})")

# Lesson 1.1.2: Derivatives
l2 = api("POST", f"/courses/{c1_id}/modules/{m1_id}/lessons", token=token, data={
    "title": "Производные и правила дифференцирования",
    "content_type": "text",
    "content": {
        "format": "tiptap",
        "body": {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Производные"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Производная функции f(x) в точке a определяется как:"}]},
                {"type": "mathBlock", "attrs": {"latex": "f'(a) = \\lim_{h \\to 0} \\frac{f(a+h) - f(a)}{h}"}},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Основные правила дифференцирования"}]},
                {"type": "orderedList", "content": [
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Степенная функция: "}, {"type": "text", "text": "d/dx(xⁿ) = nxⁿ⁻¹"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Цепное правило: "}, {"type": "text", "text": "d/dx[f(g(x))] = f'(g(x)) · g'(x)"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Произведение: "}, {"type": "text", "text": "(fg)' = f'g + fg'"}]}]},
                ]},
                {"type": "callout", "attrs": {"variant": "warning"}, "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Частая ошибка: d/dx(sin x) = cos x, НЕ -cos x. Минус появляется только у косинуса."}]}
                ]},
            ]
        }
    },
    "duration_minutes": 20
})
l2_id = l2["id"]
print(f"  Lesson: Derivatives ({l2_id})")

# EXERCISE 3: Matching
ex_match = api("POST", "/exercises", token=token, data={
    "lesson_id": l2_id,
    "exercise_type": "matching",
    "title": "Сопоставь функции и производные",
    "config": {
        "pairs": [
            {"left": "x³", "right": "3x²"},
            {"left": "sin(x)", "right": "cos(x)"},
            {"left": "eˣ", "right": "eˣ"},
            {"left": "ln(x)", "right": "1/x"},
            {"left": "cos(x)", "right": "-sin(x)"}
        ],
        "shuffle": True
    }
})
print(f"  Exercise: Matching ({ex_match['id']})")

# EXERCISE 4: Ordering
ex_ord = api("POST", "/exercises", token=token, data={
    "lesson_id": l2_id,
    "exercise_type": "ordering",
    "title": "Порядок шагов цепного правила",
    "config": {
        "items": [
            "Определить внешнюю функцию f и внутреннюю g",
            "Продифференцировать внешнюю функцию f'",
            "Подставить g(x) в f'",
            "Продифференцировать внутреннюю функцию g'(x)",
            "Перемножить: f'(g(x)) · g'(x)"
        ],
        "correct_order": [
            "Определить внешнюю функцию f и внутреннюю g",
            "Продифференцировать внешнюю функцию f'",
            "Подставить g(x) в f'",
            "Продифференцировать внутреннюю функцию g'(x)",
            "Перемножить: f'(g(x)) · g'(x)"
        ]
    },
    "sort_order": 1
})
print(f"  Exercise: Ordering ({ex_ord['id']})")

# Module 1.2: Linear Algebra
m2 = api("POST", f"/courses/{c1_id}/modules", token=token, data={"title": "Линейная алгебра"})
m2_id = m2["id"]

l3 = api("POST", f"/courses/{c1_id}/modules/{m2_id}/lessons", token=token, data={
    "title": "Матрицы и операции",
    "content_type": "text",
    "content": {
        "format": "tiptap",
        "body": {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Операции с матрицами"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Матрица — прямоугольная таблица чисел. Рассмотрим матрицу 2×2:"}]},
                {"type": "mathBlock", "attrs": {"latex": "A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}"}},
                {"type": "paragraph", "content": [{"type": "text", "text": "Определитель этой матрицы:"}]},
                {"type": "mathBlock", "attrs": {"latex": "\\det(A) = ad - bc"}},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Умножение матриц"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Для матриц A (m×n) и B (n×p) произведение C = AB — матрица m×p:"}]},
                {"type": "mathBlock", "attrs": {"latex": "C_{ij} = \\sum_{k=1}^{n} A_{ik} B_{kj}"}},
                {"type": "callout", "attrs": {"variant": "error"}, "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Умножение матриц НЕ коммутативно! AB ≠ BA в общем случае."}]}
                ]},
            ]
        }
    },
    "duration_minutes": 25
})
l3_id = l3["id"]
print(f"  Lesson: Matrices ({l3_id})")

# EXERCISE 5: Fill Blanks
ex_fill = api("POST", "/exercises", token=token, data={
    "lesson_id": l3_id,
    "exercise_type": "fill_blanks",
    "title": "Заполни пропуски: матрицы",
    "config": {
        "text": "{{blank}} матрицы 2×2 [a,b; c,d] равен ad минус bc. Матрица с равным числом строк и столбцов называется {{blank}}. Если определитель равен нулю, матрица {{blank}}. {{blank}} матрица имеет единицы на диагонали и нули в остальных местах.",
        "blanks": ["Определитель", "квадратной", "вырожденная", "Единичная"]
    }
})
print(f"  Exercise: Fill Blanks ({ex_fill['id']})")

# EXERCISE 6: Categorize
ex_cat = api("POST", "/exercises", token=token, data={
    "lesson_id": l3_id,
    "exercise_type": "categorize",
    "title": "Классификация свойств матриц",
    "config": {
        "categories": [
            {"name": "Свойства определителей", "items": ["det(AB) = det(A)·det(B)", "det(Aᵀ) = det(A)", "det(kA) = kⁿ·det(A)"]},
            {"name": "Свойства обратной матрицы", "items": ["(AB)⁻¹ = B⁻¹·A⁻¹", "(Aᵀ)⁻¹ = (A⁻¹)ᵀ", "A·A⁻¹ = I"]}
        ]
    },
    "sort_order": 1
})
print(f"  Exercise: Categorize ({ex_cat['id']})")

# EXERCISE 7: File Upload (homework)
ex_file_math = api("POST", "/exercises", token=token, data={
    "lesson_id": l3_id,
    "exercise_type": "file_upload",
    "title": "Загрузить домашнюю работу по матрицам",
    "config": {
        "allowed_types": [".pdf", ".jpg", ".png", ".docx"],
        "max_file_mb": 20
    },
    "sort_order": 2
})
print(f"  Exercise: File Upload ({ex_file_math['id']})")

# EXERCISE 8: Code Challenge (matrix multiplication)
ex_code_math = api("POST", "/exercises", token=token, data={
    "lesson_id": l3_id,
    "exercise_type": "code_challenge",
    "title": "Умножение матриц на Python",
    "config": {
        "language": "python",
        "starter_code": "# Даны две матрицы 2x2 как списки списков\n# Напишите функцию для их умножения\ndef multiply(A, B):\n    # Ваш код здесь\n    pass\n\n# Чтение входных данных\nimport json\nA = json.loads(input())\nB = json.loads(input())\nresult = multiply(A, B)\nprint(json.dumps(result))",
        "solution_code": "def multiply(A, B):\n    n = len(A)\n    result = [[0]*n for _ in range(n)]\n    for i in range(n):\n        for j in range(n):\n            for k in range(n):\n                result[i][j] += A[i][k] * B[k][j]\n    return result\n\nimport json\nA = json.loads(input())\nB = json.loads(input())\nresult = multiply(A, B)\nprint(json.dumps(result))",
        "time_limit_seconds": 10,
        "memory_limit_mb": 128
    },
    "sort_order": 3
})
ex_code_math_id = ex_code_math["id"]
api("POST", f"/exercises/{ex_code_math_id}/test-cases", token=token, data={
    "input": "[[1, 2], [3, 4]]\n[[5, 6], [7, 8]]",
    "expected_output": "[[19, 22], [43, 50]]",
    "is_hidden": False
})
api("POST", f"/exercises/{ex_code_math_id}/test-cases", token=token, data={
    "input": "[[1, 0], [0, 1]]\n[[9, 8], [7, 6]]",
    "expected_output": "[[9, 8], [7, 6]]",
    "is_hidden": True
})
print(f"  Exercise: Code Challenge ({ex_code_math_id})")

# Publish course 1
api("POST", f"/courses/{c1_id}/publish", token=token)
print(f"Course 1 (Math template) published!\n")


# ═══════════════════════════════════════════════════════
# COURSE 2: English Language (Template)
# ═══════════════════════════════════════════════════════
c2 = api("POST", "/courses", token=token, data={
    "title": "English Language",
    "description": "Comprehensive English course: grammar, vocabulary, reading and writing. Interactive exercises for all skill levels.",
    "category": "Languages",
    "is_template": True
})
c2_id = c2["id"]
print(f"Course 2 (English template): {c2_id}")

# Module 2.1: Grammar
m3 = api("POST", f"/courses/{c2_id}/modules", token=token, data={"title": "Grammar Fundamentals"})
m3_id = m3["id"]

l4 = api("POST", f"/courses/{c2_id}/modules/{m3_id}/lessons", token=token, data={
    "title": "English Tenses Overview",
    "content_type": "text",
    "content": {
        "format": "tiptap",
        "body": {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "English Tenses"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "English has 12 main tenses, organized by time (past, present, future) and aspect (simple, continuous, perfect, perfect continuous)."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Present Tenses"}]},
                {"type": "bulletList", "content": [
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Present Simple: "}, {"type": "text", "text": "I work every day. (habits, facts)"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Present Continuous: "}, {"type": "text", "text": "I am working now. (actions in progress)"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Present Perfect: "}, {"type": "text", "text": "I have worked here for 5 years. (experience, duration)"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Present Perfect Continuous: "}, {"type": "text", "text": "I have been working since morning. (ongoing with duration)"}]}]},
                ]},
                {"type": "callout", "attrs": {"variant": "success"}, "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Tip: Use Present Perfect when the exact time is not important. Use Past Simple when you mention a specific time."}]}
                ]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Past Tenses"}]},
                {"type": "bulletList", "content": [
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Past Simple: "}, {"type": "text", "text": "I worked yesterday."}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Past Continuous: "}, {"type": "text", "text": "I was working when he called."}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Past Perfect: "}, {"type": "text", "text": "I had worked there before I moved."}]}]},
                ]},
            ]
        }
    },
    "duration_minutes": 20
})
l4_id = l4["id"]
print(f"  Lesson: Tenses ({l4_id})")

# EXERCISE: Quiz on tenses
ex_q2 = api("POST", "/exercises", token=token, data={
    "lesson_id": l4_id,
    "exercise_type": "quiz",
    "title": "Tenses Quiz",
    "config": {"passing_score": 70, "time_limit_minutes": 10}
})
ex_q2_id = ex_q2["id"]
api("POST", f"/exercises/{ex_q2_id}/questions", token=token, data={
    "question_text": "Choose the correct sentence:",
    "question_type": "multiple_choice",
    "options": [
        {"text": "I have seen that movie yesterday.", "is_correct": False},
        {"text": "I saw that movie yesterday.", "is_correct": True},
        {"text": "I had seen that movie yesterday.", "is_correct": False},
        {"text": "I was seeing that movie yesterday.", "is_correct": False}
    ],
    "correct_answer": "I saw that movie yesterday.",
    "points": 1
})
api("POST", f"/exercises/{ex_q2_id}/questions", token=token, data={
    "question_text": "She ___ (live) in London for 10 years.",
    "question_type": "multiple_choice",
    "options": [
        {"text": "lives", "is_correct": False},
        {"text": "has lived", "is_correct": True},
        {"text": "lived", "is_correct": False},
        {"text": "is living", "is_correct": False}
    ],
    "correct_answer": "has lived",
    "points": 1
})
api("POST", f"/exercises/{ex_q2_id}/questions", token=token, data={
    "question_text": "While I ___ (cook), the phone rang.",
    "question_type": "multiple_choice",
    "options": [
        {"text": "cooked", "is_correct": False},
        {"text": "was cooking", "is_correct": True},
        {"text": "have cooked", "is_correct": False},
        {"text": "am cooking", "is_correct": False}
    ],
    "correct_answer": "was cooking",
    "points": 1
})
print(f"  Exercise: Quiz ({ex_q2_id})")

# EXERCISE: Fill blanks
ex_fill2 = api("POST", "/exercises", token=token, data={
    "lesson_id": l4_id,
    "exercise_type": "fill_blanks",
    "title": "Complete the Sentences",
    "config": {
        "text": "She {{blank}} to the gym every Monday. Right now, they {{blank}} a new project. I have never {{blank}} sushi before.",
        "blanks": ["goes", "are starting", "tried"]
    },
    "sort_order": 1
})
print(f"  Exercise: Fill Blanks ({ex_fill2['id']})")

# EXERCISE: Matching tenses
ex_match2 = api("POST", "/exercises", token=token, data={
    "lesson_id": l4_id,
    "exercise_type": "matching",
    "title": "Match Tenses to Examples",
    "config": {
        "pairs": [
            {"left": "Present Simple", "right": "She works every day"},
            {"left": "Present Continuous", "right": "He is reading now"},
            {"left": "Past Simple", "right": "They visited Paris last year"},
            {"left": "Present Perfect", "right": "I have finished my homework"},
            {"left": "Past Continuous", "right": "We were watching TV at 8pm"}
        ],
        "shuffle": True
    },
    "sort_order": 2
})
print(f"  Exercise: Matching ({ex_match2['id']})")

# EXERCISE: True/False
ex_tf2 = api("POST", "/exercises", token=token, data={
    "lesson_id": l4_id,
    "exercise_type": "true_false",
    "title": "Grammar True or False",
    "config": {
        "statement": "Present Perfect can be used with specific past time markers like 'yesterday' or 'last week'.",
        "correct_answer": False
    },
    "sort_order": 3
})
print(f"  Exercise: True/False ({ex_tf2['id']})")

# Module 2.2: Vocabulary
m4 = api("POST", f"/courses/{c2_id}/modules", token=token, data={"title": "Vocabulary Building"})
m4_id = m4["id"]

l5 = api("POST", f"/courses/{c2_id}/modules/{m4_id}/lessons", token=token, data={
    "title": "Academic English Vocabulary",
    "content_type": "text",
    "content": {
        "format": "tiptap",
        "body": {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Academic Vocabulary"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Academic vocabulary is essential for university studies, research papers, and professional communication."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Key Academic Words"}]},
                {"type": "bulletList", "content": [
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Analyze"}, {"type": "text", "text": " — to examine in detail"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Evaluate"}, {"type": "text", "text": " — to judge the quality or importance"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Hypothesis"}, {"type": "text", "text": " — a proposed explanation to be tested"}]}]},
                    {"type": "listItem", "content": [{"type": "paragraph", "content": [{"type": "text", "marks": [{"type": "bold"}], "text": "Significant"}, {"type": "text", "text": " — important, meaningful"}]}]},
                ]},
                {"type": "callout", "attrs": {"variant": "info"}, "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Learning academic vocabulary helps you score higher on IELTS, TOEFL, and other standardized tests."}]}
                ]},
            ]
        }
    },
    "duration_minutes": 15
})
l5_id = l5["id"]
print(f"  Lesson: Academic Vocabulary ({l5_id})")

# EXERCISE: Categorize vocabulary
ex_cat2 = api("POST", "/exercises", token=token, data={
    "lesson_id": l5_id,
    "exercise_type": "categorize",
    "title": "Sort Words by Category",
    "config": {
        "categories": [
            {"name": "Verbs", "items": ["analyze", "evaluate", "investigate", "demonstrate"]},
            {"name": "Nouns", "items": ["hypothesis", "methodology", "evidence", "conclusion"]},
            {"name": "Adjectives", "items": ["significant", "relevant", "comprehensive", "theoretical"]}
        ]
    }
})
print(f"  Exercise: Categorize ({ex_cat2['id']})")

# EXERCISE: Ordering essay structure
ex_ord2 = api("POST", "/exercises", token=token, data={
    "lesson_id": l5_id,
    "exercise_type": "ordering",
    "title": "Order the Essay Structure",
    "config": {
        "items": [
            "Introduction with thesis statement",
            "Background information and context",
            "First supporting argument with evidence",
            "Second supporting argument with evidence",
            "Counter-argument and rebuttal",
            "Conclusion summarizing key points"
        ],
        "correct_order": [
            "Introduction with thesis statement",
            "Background information and context",
            "First supporting argument with evidence",
            "Second supporting argument with evidence",
            "Counter-argument and rebuttal",
            "Conclusion summarizing key points"
        ]
    },
    "sort_order": 1
})
print(f"  Exercise: Ordering ({ex_ord2['id']})")

# Module 2.3: Writing
m5 = api("POST", f"/courses/{c2_id}/modules", token=token, data={"title": "Writing Skills"})
m5_id = m5["id"]

l6 = api("POST", f"/courses/{c2_id}/modules/{m5_id}/lessons", token=token, data={
    "title": "Essay Writing Essentials",
    "content_type": "text",
    "content": {
        "format": "tiptap",
        "body": {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Essay Writing Essentials"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "A well-structured essay consists of an introduction, body paragraphs, and a conclusion. Each part has a specific purpose."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "The Introduction"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Start with a hook, provide background context, and end with a clear thesis statement."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Body Paragraphs"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Each body paragraph should follow the PEEL structure: Point, Evidence, Explanation, Link back to thesis."}]},
                {"type": "callout", "attrs": {"variant": "success"}, "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Pro tip: Use transition words like 'Furthermore', 'However', 'In contrast' to connect your ideas smoothly."}]}
                ]},
            ]
        }
    },
    "duration_minutes": 15
})
l6_id = l6["id"]
print(f"  Lesson: Essay Writing ({l6_id})")

# EXERCISE: File upload for essay
ex_file = api("POST", "/exercises", token=token, data={
    "lesson_id": l6_id,
    "exercise_type": "file_upload",
    "title": "Submit Your Essay",
    "config": {
        "allowed_types": [".pdf", ".docx", ".doc", ".txt"],
        "max_file_mb": 10
    }
})
print(f"  Exercise: File Upload ({ex_file['id']})")

# EXERCISE: Code challenge for text processing
ex_code_eng = api("POST", "/exercises", token=token, data={
    "lesson_id": l6_id,
    "exercise_type": "code_challenge",
    "title": "Word Count Program",
    "config": {
        "language": "python",
        "starter_code": "# Read a text from input\n# Print the number of words\ntext = input()\n",
        "solution_code": "text = input()\nprint(len(text.split()))",
        "time_limit_seconds": 10,
        "memory_limit_mb": 128
    },
    "sort_order": 1
})
ex_code_eng_id = ex_code_eng["id"]
api("POST", f"/exercises/{ex_code_eng_id}/test-cases", token=token, data={
    "input": "Hello world this is a test",
    "expected_output": "6",
    "is_hidden": False
})
api("POST", f"/exercises/{ex_code_eng_id}/test-cases", token=token, data={
    "input": "One",
    "expected_output": "1",
    "is_hidden": True
})
print(f"  Exercise: Code Challenge ({ex_code_eng_id})")

# Publish course 2
api("POST", f"/courses/{c2_id}/publish", token=token)
print(f"Course 2 (English template) published!\n")


# ═══════════════════════════════════════════════════════
# COURSE 3: Programming Python (Template)
# ═══════════════════════════════════════════════════════
c3 = api("POST", "/courses", token=token, data={
    "title": "Программирование на Python",
    "description": "От основ до продвинутых тем. Практические задачи с автопроверкой кода, квизы и интерактивные упражнения.",
    "category": "Programming",
    "is_template": True
})
c3_id = c3["id"]
print(f"Course 3 (Python template): {c3_id}")

# Module 3.1: Basics
m6 = api("POST", f"/courses/{c3_id}/modules", token=token, data={"title": "Основы Python"})
m6_id = m6["id"]

l7 = api("POST", f"/courses/{c3_id}/modules/{m6_id}/lessons", token=token, data={
    "title": "Переменные и типы данных",
    "content_type": "text",
    "content": {
        "format": "tiptap",
        "body": {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Переменные и типы данных в Python"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Python — язык с динамической типизацией. Не нужно явно объявлять типы переменных."}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Основные типы данных"}]},
                {"type": "codeBlock", "attrs": {"language": "python"}, "content": [{"type": "text", "text": "# Целое число (int)\nage = 25\n\n# Дробное число (float)\npi = 3.14159\n\n# Строка (str)\nname = \"Alice\"\n\n# Логический тип (bool)\nis_student = True\n\n# Список (list)\nscores = [85, 90, 78, 92]\n\n# Словарь (dict)\nperson = {\"name\": \"Alice\", \"age\": 25}"}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Преобразование типов"}]},
                {"type": "codeBlock", "attrs": {"language": "python"}, "content": [{"type": "text", "text": "x = \"42\"\ny = int(x)     # Строка -> число\nz = float(x)   # Строка -> дробное\nw = str(42)    # Число -> строка"}]},
                {"type": "callout", "attrs": {"variant": "warning"}, "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Осторожно с преобразованием типов! int(\"hello\") вызовет ошибку ValueError."}]}
                ]},
            ]
        }
    },
    "duration_minutes": 15
})
l7_id = l7["id"]
print(f"  Lesson: Variables ({l7_id})")

# EXERCISE: Quiz
ex_q3 = api("POST", "/exercises", token=token, data={
    "lesson_id": l7_id,
    "exercise_type": "quiz",
    "title": "Тест: Основы Python",
    "config": {"passing_score": 70}
})
ex_q3_id = ex_q3["id"]
api("POST", f"/exercises/{ex_q3_id}/questions", token=token, data={
    "question_text": "Что выведет type(3.14)?",
    "question_type": "multiple_choice",
    "options": [
        {"text": "<class 'int'>", "is_correct": False},
        {"text": "<class 'float'>", "is_correct": True},
        {"text": "<class 'str'>", "is_correct": False},
        {"text": "<class 'number'>", "is_correct": False}
    ],
    "correct_answer": "<class 'float'>",
    "points": 1
})
api("POST", f"/exercises/{ex_q3_id}/questions", token=token, data={
    "question_text": "Какое из этих — допустимое имя переменной в Python?",
    "question_type": "multiple_choice",
    "options": [
        {"text": "2name", "is_correct": False},
        {"text": "my-var", "is_correct": False},
        {"text": "_count", "is_correct": True},
        {"text": "class", "is_correct": False}
    ],
    "correct_answer": "_count",
    "points": 1
})
api("POST", f"/exercises/{ex_q3_id}/questions", token=token, data={
    "question_text": "Что вернёт len([1, 2, 3])?",
    "question_type": "multiple_choice",
    "options": [
        {"text": "2", "is_correct": False},
        {"text": "3", "is_correct": True},
        {"text": "4", "is_correct": False},
        {"text": "Error", "is_correct": False}
    ],
    "correct_answer": "3",
    "points": 1
})
print(f"  Exercise: Quiz ({ex_q3_id})")

# EXERCISE: Matching data types
ex_match3 = api("POST", "/exercises", token=token, data={
    "lesson_id": l7_id,
    "exercise_type": "matching",
    "title": "Сопоставь типы данных и значения",
    "config": {
        "pairs": [
            {"left": "int", "right": "42"},
            {"left": "float", "right": "3.14"},
            {"left": "str", "right": "\"hello\""},
            {"left": "bool", "right": "True"},
            {"left": "list", "right": "[1, 2, 3]"}
        ],
        "shuffle": True
    },
    "sort_order": 1
})
print(f"  Exercise: Matching ({ex_match3['id']})")

# EXERCISE: True/False
ex_tf3 = api("POST", "/exercises", token=token, data={
    "lesson_id": l7_id,
    "exercise_type": "true_false",
    "title": "Верно/Неверно: Python",
    "config": {
        "statement": "В Python строки являются изменяемыми (mutable) объектами.",
        "correct_answer": False
    },
    "sort_order": 2
})
print(f"  Exercise: True/False ({ex_tf3['id']})")

# EXERCISE: Code Challenge - Hello World
ex_code1 = api("POST", "/exercises", token=token, data={
    "lesson_id": l7_id,
    "exercise_type": "code_challenge",
    "title": "Hello, World!",
    "config": {
        "language": "python",
        "starter_code": "# Напишите программу, которая выводит \"Hello, World!\"\n",
        "solution_code": "print(\"Hello, World!\")",
        "time_limit_seconds": 10,
        "memory_limit_mb": 128
    },
    "sort_order": 3
})
ex_code1_id = ex_code1["id"]
api("POST", f"/exercises/{ex_code1_id}/test-cases", token=token, data={
    "input": "",
    "expected_output": "Hello, World!",
    "is_hidden": False
})
print(f"  Exercise: Code Challenge ({ex_code1_id})")

# Lesson 3.1.2: Control Flow
l8 = api("POST", f"/courses/{c3_id}/modules/{m6_id}/lessons", token=token, data={
    "title": "Условия и циклы",
    "content_type": "text",
    "content": {
        "format": "tiptap",
        "body": {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Управляющие конструкции в Python"}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Условный оператор if"}]},
                {"type": "codeBlock", "attrs": {"language": "python"}, "content": [{"type": "text", "text": "age = 18\n\nif age >= 18:\n    print(\"Можно голосовать!\")\nelif age >= 16:\n    print(\"Почти!\")\nelse:\n    print(\"Слишком молод.\")"}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Цикл for"}]},
                {"type": "codeBlock", "attrs": {"language": "python"}, "content": [{"type": "text", "text": "# Перебор списка\nfruits = [\"яблоко\", \"банан\", \"вишня\"]\nfor fruit in fruits:\n    print(fruit)\n\n# Цикл с range\nfor i in range(5):\n    print(i)  # 0, 1, 2, 3, 4"}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Цикл while"}]},
                {"type": "codeBlock", "attrs": {"language": "python"}, "content": [{"type": "text", "text": "count = 0\nwhile count < 5:\n    print(count)\n    count += 1"}]},
                {"type": "callout", "attrs": {"variant": "error"}, "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Избегайте бесконечных циклов! Убедитесь, что условие while когда-нибудь станет False."}]}
                ]},
            ]
        }
    },
    "duration_minutes": 20
})
l8_id = l8["id"]
print(f"  Lesson: Control Flow ({l8_id})")

# EXERCISE: Fill blanks
ex_fill3 = api("POST", "/exercises", token=token, data={
    "lesson_id": l8_id,
    "exercise_type": "fill_blanks",
    "title": "Заполни пропуски: Python",
    "config": {
        "text": "Для проверки условия используется ключевое слово {{blank}}. Для повторения кода фиксированное количество раз используется цикл {{blank}}. Для повторения пока условие истинно — цикл {{blank}}. Для досрочного выхода из цикла — оператор {{blank}}.",
        "blanks": ["if", "for", "while", "break"]
    }
})
print(f"  Exercise: Fill Blanks ({ex_fill3['id']})")

# EXERCISE: Code Challenge - FizzBuzz
ex_code2 = api("POST", "/exercises", token=token, data={
    "lesson_id": l8_id,
    "exercise_type": "code_challenge",
    "title": "FizzBuzz",
    "config": {
        "language": "python",
        "starter_code": "# Прочитайте число n\n# Выведите числа от 1 до n\n# Кратные 3 — \"Fizz\", кратные 5 — \"Buzz\"\n# Кратные и 3 и 5 — \"FizzBuzz\"\nn = int(input())\n",
        "solution_code": "n = int(input())\nfor i in range(1, n + 1):\n    if i % 15 == 0:\n        print(\"FizzBuzz\")\n    elif i % 3 == 0:\n        print(\"Fizz\")\n    elif i % 5 == 0:\n        print(\"Buzz\")\n    else:\n        print(i)",
        "time_limit_seconds": 10,
        "memory_limit_mb": 128
    },
    "sort_order": 1
})
ex_code2_id = ex_code2["id"]
api("POST", f"/exercises/{ex_code2_id}/test-cases", token=token, data={
    "input": "15",
    "expected_output": "1\n2\nFizz\n4\nBuzz\nFizz\n7\n8\nFizz\nBuzz\n11\nFizz\n13\n14\nFizzBuzz",
    "is_hidden": False
})
api("POST", f"/exercises/{ex_code2_id}/test-cases", token=token, data={
    "input": "5",
    "expected_output": "1\n2\nFizz\n4\nBuzz",
    "is_hidden": True
})
print(f"  Exercise: Code Challenge FizzBuzz ({ex_code2_id})")

# EXERCISE: Ordering execution
ex_ord3 = api("POST", "/exercises", token=token, data={
    "lesson_id": l8_id,
    "exercise_type": "ordering",
    "title": "Порядок выполнения программы",
    "config": {
        "items": [
            "x = 10",
            "if x > 5:",
            "    print('Большое')",
            "else:",
            "    print('Маленькое')"
        ],
        "correct_order": [
            "x = 10",
            "if x > 5:",
            "    print('Большое')",
            "else:",
            "    print('Маленькое')"
        ]
    },
    "sort_order": 2
})
print(f"  Exercise: Ordering ({ex_ord3['id']})")

# Module 3.2: Functions
m7 = api("POST", f"/courses/{c3_id}/modules", token=token, data={"title": "Функции и модули"})
m7_id = m7["id"]

l9 = api("POST", f"/courses/{c3_id}/modules/{m7_id}/lessons", token=token, data={
    "title": "Определение и использование функций",
    "content_type": "text",
    "content": {
        "format": "tiptap",
        "body": {
            "type": "doc",
            "content": [
                {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Функции в Python"}]},
                {"type": "paragraph", "content": [{"type": "text", "text": "Функции — переиспользуемые блоки кода для выполнения конкретных задач."}]},
                {"type": "codeBlock", "attrs": {"language": "python"}, "content": [{"type": "text", "text": "def greet(name):\n    \"\"\"Возвращает приветствие.\"\"\"\n    return f\"Привет, {name}!\"\n\nmessage = greet(\"Алиса\")\nprint(message)  # Привет, Алиса!"}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Аргументы по умолчанию"}]},
                {"type": "codeBlock", "attrs": {"language": "python"}, "content": [{"type": "text", "text": "def power(base, exponent=2):\n    return base ** exponent\n\nprint(power(3))     # 9\nprint(power(3, 3))  # 27"}]},
                {"type": "heading", "attrs": {"level": 2}, "content": [{"type": "text", "text": "Lambda-функции"}]},
                {"type": "codeBlock", "attrs": {"language": "python"}, "content": [{"type": "text", "text": "square = lambda x: x ** 2\nnumbers = [1, 2, 3, 4, 5]\nsquared = list(map(square, numbers))\nprint(squared)  # [1, 4, 9, 16, 25]"}]},
            ]
        }
    },
    "duration_minutes": 20
})
l9_id = l9["id"]
print(f"  Lesson: Functions ({l9_id})")

# EXERCISE: Code Challenge - Sum
ex_code3 = api("POST", "/exercises", token=token, data={
    "lesson_id": l9_id,
    "exercise_type": "code_challenge",
    "title": "Сумма чисел",
    "config": {
        "language": "python",
        "starter_code": "# Прочитайте числа через пробел\n# Выведите их сумму\nnumbers = list(map(int, input().split()))\n\ndef sum_numbers(nums):\n    # Ваш код здесь\n    pass\n\nprint(sum_numbers(numbers))",
        "solution_code": "numbers = list(map(int, input().split()))\n\ndef sum_numbers(nums):\n    total = 0\n    for n in nums:\n        total += n\n    return total\n\nprint(sum_numbers(numbers))",
        "time_limit_seconds": 10,
        "memory_limit_mb": 128
    }
})
ex_code3_id = ex_code3["id"]
api("POST", f"/exercises/{ex_code3_id}/test-cases", token=token, data={
    "input": "1 2 3 4 5",
    "expected_output": "15",
    "is_hidden": False
})
api("POST", f"/exercises/{ex_code3_id}/test-cases", token=token, data={
    "input": "10 -5 3",
    "expected_output": "8",
    "is_hidden": True
})
print(f"  Exercise: Code Challenge Sum ({ex_code3_id})")

# EXERCISE: Categorize Python functions
ex_cat3 = api("POST", "/exercises", token=token, data={
    "lesson_id": l9_id,
    "exercise_type": "categorize",
    "title": "Классификация функций Python",
    "config": {
        "categories": [
            {"name": "Методы строк", "items": ["upper()", "split()", "strip()", "replace()"]},
            {"name": "Методы списков", "items": ["append()", "sort()", "pop()", "extend()"]},
            {"name": "Встроенные функции", "items": ["len()", "print()", "range()", "type()"]}
        ]
    },
    "sort_order": 1
})
print(f"  Exercise: Categorize ({ex_cat3['id']})")

# EXERCISE: File Upload for homework
ex_file3 = api("POST", "/exercises", token=token, data={
    "lesson_id": l9_id,
    "exercise_type": "file_upload",
    "title": "Загрузить решение задачи",
    "config": {
        "allowed_types": [".py", ".ipynb", ".pdf", ".zip"],
        "max_file_mb": 20
    },
    "sort_order": 2
})
print(f"  Exercise: File Upload ({ex_file3['id']})")

# Publish course 3
api("POST", f"/courses/{c3_id}/publish", token=token)
print(f"Course 3 (Python template) published!\n")


print("=" * 50)
print("ALL TEMPLATE COURSES CREATED SUCCESSFULLY")
print(f"Course 1 (Высшая математика): {c1_id}")
print(f"Course 2 (English Language): {c2_id}")
print(f"Course 3 (Python Programming): {c3_id}")
print("\nAll exercise types used across courses:")
print("  ✓ quiz (with multiple_choice questions)")
print("  ✓ true_false")
print("  ✓ matching")
print("  ✓ ordering")
print("  ✓ fill_blanks")
print("  ✓ categorize")
print("  ✓ code_challenge (with test cases)")
print("  ✓ file_upload")
print("\nTeachers can now copy these templates to their own courses!")
