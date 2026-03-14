import requests

API = "https://lms-backend-0b8v.onrender.com/api/v1"

# Login
r = requests.post(f"{API}/auth/login", json={"email": "test4@test.com", "password": "test1234"})
TOKEN = r.json()["access_token"]
headers = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

CID = "ce31bae1-5ca0-4bf9-b465-96a1ab91b9be"
MOD1 = "b3147f92-fec6-4658-8f88-f785ff86690e"
MOD2 = "5035f692-23ed-4a28-a3c5-32c966573734"
MOD3 = "04b70fb5-e3fa-40fd-855a-71d1081b64fb"

lessons = [
    # Module 1: Intro
    (MOD1, {
        "title": "Что такое Python?",
        "content_type": "text",
        "content": {
            "body": "# Что такое Python?\n\nPython \u2014 высокоуровневый язык программирования.\n\n## Почему Python?\n\n- **Простой синтаксис**\n- **Универсальный** \u2014 веб, данные, AI\n- **Огромное сообщество**\n\n## Пример\n\n```python\nprint(\"Hello World!\")\nname = input(\"Name? \")\nprint(f\"Hi, {name}!\")\n```"
        },
        "duration_minutes": 10
    }),
    (MOD1, {
        "title": "Видео: Установка Python",
        "content_type": "video",
        "content": {
            "video_url": "https://www.youtube.com/embed/kqtD5dpn9C8",
            "description": "Установка Python и VS Code, первая программа.",
            "body": "## Ключевые моменты\n\n1. Скачайте Python с python.org\n2. Отметьте **Add to PATH**\n3. Установите VS Code\n\n```python\nprint(\"Hello, World!\")\n```"
        },
        "duration_minutes": 15
    }),
    (MOD1, {
        "title": "Тест: Основы Python",
        "content_type": "quiz",
        "content": {"body": "Проверьте свои знания об основах Python."},
        "duration_minutes": 10
    }),
    # Module 2: Data types
    (MOD2, {
        "title": "Числа и строки",
        "content_type": "text",
        "content": {
            "body": "# Типы данных\n\n## Числа\n\n```python\nage = 25        # int\nprice = 19.99   # float\nprint(10 + 3)   # 13\nprint(10 / 3)   # 3.333...\nprint(2 ** 10)  # 1024\n```\n\n## Строки\n\n```python\nname = \"Python\"\nprint(name.upper())   # PYTHON\nprint(len(name))      # 6\nprint(name[0])        # P\n```"
        },
        "duration_minutes": 15
    }),
    (MOD2, {
        "title": "Задача: Калькулятор",
        "content_type": "code_challenge",
        "content": {
            "body": "Напишите программу: a=10, b=3, выведите сумму, разность, произведение и частное."
        },
        "duration_minutes": 20
    }),
    (MOD2, {
        "title": "Интерактив: Типы данных",
        "content_type": "interactive",
        "content": {
            "body": "Определите тип каждого значения.",
            "exercises": [
                {
                    "type": "matching",
                    "question": "Сопоставьте значение с типом:",
                    "pairs": [
                        {"left": "42", "right": "int"},
                        {"left": "3.14", "right": "float"},
                        {"left": "\"hello\"", "right": "str"},
                        {"left": "True", "right": "bool"},
                        {"left": "[1,2,3]", "right": "list"}
                    ]
                },
                {
                    "type": "fill_blanks",
                    "question": "Заполните пропуски:",
                    "text": "Функция {___} преобразует строку в целое число, а {___} в дробное.",
                    "answers": ["int()", "float()"]
                },
                {
                    "type": "true_false",
                    "question": "Строки в Python можно изменять после создания",
                    "answer": False,
                    "explanation": "Строки неизменяемы (immutable)."
                },
                {
                    "type": "ordering",
                    "question": "Расположите по размеру в памяти:",
                    "items": ["bool", "int", "float", "str", "list"]
                },
                {
                    "type": "categorize",
                    "question": "Распределите по категориям:",
                    "categories": {
                        "Числовые": ["42", "3.14", "-7"],
                        "Текстовые": ["\"hello\"", "\"123\""],
                        "Логические": ["True", "False"]
                    }
                }
            ]
        },
        "duration_minutes": 15
    }),
    # Module 3: Control flow
    (MOD3, {
        "title": "Условия if/elif/else",
        "content_type": "text",
        "content": {
            "body": "# Условные конструкции\n\n```python\nage = int(input(\"Возраст: \"))\n\nif age < 18:\n    print(\"Несовершеннолетний\")\nelif age < 65:\n    print(\"Взрослый\")\nelse:\n    print(\"Пенсионер\")\n```\n\n## Операторы сравнения\n\n`==`, `!=`, `>`, `<`, `>=`, `<=`\n\n## Логические операторы\n\n```python\nif x > 10 and x < 20:\n    print(\"между 10 и 20\")\n```"
        },
        "duration_minutes": 15
    }),
    (MOD3, {
        "title": "Задача: FizzBuzz",
        "content_type": "code_challenge",
        "content": {
            "body": "Для чисел 1-20: делится на 3 = Fizz, на 5 = Buzz, на оба = FizzBuzz, иначе число."
        },
        "duration_minutes": 20
    }),
    (MOD3, {
        "title": "Проект: Угадай число",
        "content_type": "file_upload",
        "content": {
            "body": "## Задание\n\nСоздайте игру:\n1. Программа загадывает число 1-100\n2. Пользователь угадывает\n3. Подсказки \"больше\"/\"меньше\"\n4. Подсчёт попыток\n\nЗагрузите файл `guess_game.py`.",
            "allowed_extensions": [".py"],
            "max_file_size_mb": 1
        },
        "duration_minutes": 30
    }),
]

# Create lessons
for i, (mod_id, lesson) in enumerate(lessons):
    r = requests.post(f"{API}/courses/{CID}/modules/{mod_id}/lessons", json=lesson, headers=headers)
    if r.status_code == 200:
        print(f"OK Lesson {i+1}: {lesson['title']} ({lesson['content_type']})")
    else:
        print(f"FAIL Lesson {i+1}: {r.status_code} - {r.text[:150]}")

# Get course to find lesson IDs
r = requests.get(f"{API}/courses/{CID}", headers=headers)
course = r.json()
quiz_lesson_id = None
calc_lesson_id = None
fizz_lesson_id = None

for mod in course.get("modules", []):
    for les in mod.get("lessons", []):
        if les["content_type"] == "quiz":
            quiz_lesson_id = les["id"]
        if "калькулятор" in les["title"].lower():
            calc_lesson_id = les["id"]
        if "fizzbuzz" in les["title"].lower():
            fizz_lesson_id = les["id"]

# Create quiz
if quiz_lesson_id:
    quiz_data = {
        "lesson_id": quiz_lesson_id,
        "title": "Тест: Основы Python",
        "questions": [
            {"text": "Кто создал Python?", "options": ["Гослинг", "Ван Россум", "Ритчи", "Страуструп"], "correct": 1},
            {"text": "Функция вывода текста?", "options": ["echo()", "console.log()", "print()", "puts()"], "correct": 2},
            {"text": "Как создать переменную?", "options": ["var x=5", "int x=5", "x = 5", "let x=5"], "correct": 2},
            {"text": "Тип значения 3.14?", "options": ["int", "str", "float", "double"], "correct": 2},
            {"text": "Что выведет type(True)?", "options": ["int", "bool", "str", "boolean"], "correct": 1},
        ]
    }
    r = requests.post(f"{API}/assessments/quizzes", json=quiz_data, headers=headers)
    print(f"Quiz: {r.status_code} - {r.text[:100]}")

# Create code challenges
for lid, title, desc, starter, solution in [
    (calc_lesson_id, "Калькулятор", "Напишите калькулятор",
     "a = 10\nb = 3\n# Ваш код:\n",
     'a = 10\nb = 3\nprint(f"{a} + {b} = {a+b}")\nprint(f"{a} - {b} = {a-b}")\nprint(f"{a} * {b} = {a*b}")\nprint(f"{a} / {b} = {a/b}")'),
    (fizz_lesson_id, "FizzBuzz", "Реализуйте FizzBuzz",
     "# FizzBuzz для чисел 1-20\n",
     'for i in range(1, 21):\n    if i % 15 == 0:\n        print("FizzBuzz")\n    elif i % 3 == 0:\n        print("Fizz")\n    elif i % 5 == 0:\n        print("Buzz")\n    else:\n        print(i)'),
]:
    if lid:
        r = requests.post(f"{API}/sandbox/challenges", json={
            "lesson_id": lid,
            "title": title,
            "description": desc,
            "language": "python",
            "starter_code": starter,
            "solution_code": solution
        }, headers=headers)
        if r.status_code == 200:
            cid = r.json()["id"]
            print(f"OK Challenge: {title} ({cid})")
            # Add test case
            r2 = requests.post(f"{API}/sandbox/challenges/{cid}/test-cases", json={
                "input": "",
                "expected_output": "13\n7\n30\n3.3333333333333335",
                "is_hidden": False
            }, headers=headers)
            print(f"  Test case: {r2.status_code}")
        else:
            print(f"FAIL Challenge {title}: {r.status_code} - {r.text[:150]}")

# Publish course
r = requests.post(f"{API}/courses/{CID}/publish", headers=headers)
print(f"\nPublish: {r.status_code} - {r.text[:100]}")
print("\nDone!")
