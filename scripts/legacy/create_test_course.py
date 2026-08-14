"""
Create a comprehensive test course with ALL lesson types and ALL interactive subtypes.
Run with: python scripts/create_test_course.py
"""
import requests
import json
import sys

BASE = "https://lms-backend-0b8v.onrender.com/api/v1"

# Login
r = requests.post(f"{BASE}/auth/login", json={
    "email": "teacher_test@lms.com",
    "password": "test1234"
})
if r.status_code != 200:
    print(f"Login failed: {r.status_code} {r.text}")
    sys.exit(1)

token = r.json()["access_token"]
h = {"Authorization": f"Bearer {token}"}
print("✅ Logged in")

# ─── Create Course ───
r = requests.post(f"{BASE}/courses", headers=h, json={
    "title": "Основы программирования на Python",
    "description": "Полный курс по Python для начинающих. Включает теорию, видеоуроки, тесты, задачи на программирование, загрузку файлов и интерактивные упражнения всех типов.",
    "category": "Программирование"
})
assert r.status_code == 200, f"Create course failed: {r.status_code} {r.text}"
course = r.json()
course_id = course["id"]
print(f"✅ Course created: {course['title']} ({course_id})")

# ═══════════════════════════════════════════════════════════════
# MODULE 1: Введение в Python (text + video + quiz)
# ═══════════════════════════════════════════════════════════════
r = requests.post(f"{BASE}/courses/{course_id}/modules", headers=h, json={
    "title": "Модуль 1: Введение в Python"
})
mod1 = r.json()
mod1_id = mod1["id"]
print(f"  📦 Module 1: {mod1['title']}")

# --- Lesson 1.1: Text ---
r = requests.post(f"{BASE}/courses/{course_id}/modules/{mod1_id}/lessons", headers=h, json={
    "title": "Что такое Python?",
    "content_type": "text",
    "content": {
        "body": """# Что такое Python?

Python — это высокоуровневый язык программирования общего назначения, созданный Гвидо ван Россумом в 1991 году.

## Почему Python?

- **Простой синтаксис** — код на Python читается почти как английский текст
- **Универсальность** — веб-разработка, анализ данных, машинное обучение, автоматизация
- **Большое сообщество** — тысячи библиотек и активная поддержка
- **Востребованность** — один из самых популярных языков в мире

## Пример кода

```python
# Привет, мир!
print("Привет, мир!")

# Переменные
имя = "Алиса"
возраст = 25
print(f"Меня зовут {имя}, мне {возраст} лет")
```

## Установка Python

1. Перейдите на [python.org](https://python.org)
2. Скачайте последнюю версию
3. Установите, отметив 'Add Python to PATH'
4. Проверьте: `python --version`
"""
    },
    "duration_minutes": 10
})
lesson_text = r.json()
print(f"    📝 Lesson 1.1 (text): {lesson_text['title']}")

# --- Lesson 1.2: Video ---
r = requests.post(f"{BASE}/courses/{course_id}/modules/{mod1_id}/lessons", headers=h, json={
    "title": "Видео: Первая программа на Python",
    "content_type": "video",
    "content": {
        "video_url": "https://www.youtube.com/watch?v=kqtD5dpn9C8",
        "description": "В этом видеоуроке мы напишем первую программу на Python. Вы узнаете про переменные, типы данных и функцию print()."
    },
    "duration_minutes": 15
})
lesson_video = r.json()
print(f"    🎬 Lesson 1.2 (video): {lesson_video['title']}")

# --- Lesson 1.3: Quiz ---
r = requests.post(f"{BASE}/courses/{course_id}/modules/{mod1_id}/lessons", headers=h, json={
    "title": "Тест: Основы Python",
    "content_type": "quiz",
    "content": {},
    "duration_minutes": 10
})
lesson_quiz = r.json()
lesson_quiz_id = lesson_quiz["id"]
print(f"    📋 Lesson 1.3 (quiz): {lesson_quiz['title']}")

# Create Quiz
r = requests.post(f"{BASE}/assessments/quizzes", headers=h, json={
    "lesson_id": lesson_quiz_id,
    "title": "Тест: Основы Python",
    "passing_score": 70,
    "time_limit_minutes": 10
})
assert r.status_code == 200, f"Create quiz failed: {r.status_code} {r.text}"
quiz = r.json()
quiz_id = quiz["id"]
print(f"      ✅ Quiz created: {quiz_id}")

# Quiz Questions
questions = [
    {
        "question_text": "Кто создал Python?",
        "question_type": "multiple_choice",
        "options": [
            {"id": "a", "text": "Гвидо ван Россум", "is_correct": True},
            {"id": "b", "text": "Линус Торвальдс", "is_correct": False},
            {"id": "c", "text": "Джеймс Гослинг", "is_correct": False},
            {"id": "d", "text": "Деннис Ритчи", "is_correct": False}
        ],
        "points": 1
    },
    {
        "question_text": "Какая функция выводит текст на экран в Python?",
        "question_type": "multiple_choice",
        "options": [
            {"id": "a", "text": "echo()", "is_correct": False},
            {"id": "b", "text": "print()", "is_correct": True},
            {"id": "c", "text": "console.log()", "is_correct": False},
            {"id": "d", "text": "write()", "is_correct": False}
        ],
        "points": 1
    },
    {
        "question_text": "В каком году был создан Python?",
        "question_type": "multiple_choice",
        "options": [
            {"id": "a", "text": "1985", "is_correct": False},
            {"id": "b", "text": "1991", "is_correct": True},
            {"id": "c", "text": "1995", "is_correct": False},
            {"id": "d", "text": "2000", "is_correct": False}
        ],
        "points": 1
    },
    {
        "question_text": "Как правильно объявить переменную в Python?",
        "question_type": "text_answer",
        "correct_answer": "x = 5",
        "points": 2
    }
]

for q in questions:
    r = requests.post(f"{BASE}/assessments/quizzes/{quiz_id}/questions", headers=h, json=q)
    assert r.status_code == 200, f"Add question failed: {r.status_code} {r.text}"
    print(f"      ❓ Question: {q['question_text'][:50]}...")


# ═══════════════════════════════════════════════════════════════
# MODULE 2: Практика (code_challenge + file_upload)
# ═══════════════════════════════════════════════════════════════
r = requests.post(f"{BASE}/courses/{course_id}/modules", headers=h, json={
    "title": "Модуль 2: Практика программирования"
})
mod2 = r.json()
mod2_id = mod2["id"]
print(f"  📦 Module 2: {mod2['title']}")

# --- Lesson 2.1: Code Challenge ---
r = requests.post(f"{BASE}/courses/{course_id}/modules/{mod2_id}/lessons", headers=h, json={
    "title": "Задача: Сумма чисел",
    "content_type": "code_challenge",
    "content": {},
    "duration_minutes": 20
})
lesson_code = r.json()
lesson_code_id = lesson_code["id"]
print(f"    💻 Lesson 2.1 (code_challenge): {lesson_code['title']}")

# Create Challenge
r = requests.post(f"{BASE}/sandbox/challenges", headers=h, json={
    "lesson_id": lesson_code_id,
    "title": "Сумма чисел",
    "description": "Напишите программу, которая читает два числа из стандартного ввода и выводит их сумму.\n\n**Формат входных данных:**\nДва целых числа, каждое на новой строке.\n\n**Формат выходных данных:**\nОдно число — сумма введённых чисел.",
    "language": "python",
    "starter_code": "# Прочитайте два числа и выведите их сумму\na = int(input())\nb = int(input())\n# Ваш код здесь\n",
    "solution_code": "a = int(input())\nb = int(input())\nprint(a + b)\n",
    "time_limit_seconds": 5,
    "memory_limit_mb": 128
})
assert r.status_code == 200, f"Create challenge failed: {r.status_code} {r.text}"
challenge = r.json()
challenge_id = challenge["id"]
print(f"      ✅ Challenge created: {challenge_id}")

# Test Cases
test_cases = [
    {"input": "3\n5", "expected_output": "8", "is_hidden": False},
    {"input": "0\n0", "expected_output": "0", "is_hidden": False},
    {"input": "-10\n10", "expected_output": "0", "is_hidden": False},
    {"input": "1000000\n999999", "expected_output": "1999999", "is_hidden": True},
    {"input": "-5\n-3", "expected_output": "-8", "is_hidden": True},
]

for tc in test_cases:
    r = requests.post(f"{BASE}/sandbox/challenges/{challenge_id}/test-cases", headers=h, json=tc)
    assert r.status_code == 200, f"Add test case failed: {r.status_code} {r.text}"
    hidden = " (скрытый)" if tc["is_hidden"] else ""
    print(f"      🧪 Test: {tc['input'].replace(chr(10), ', ')} → {tc['expected_output']}{hidden}")

# --- Lesson 2.2: File Upload ---
r = requests.post(f"{BASE}/courses/{course_id}/modules/{mod2_id}/lessons", headers=h, json={
    "title": "Домашнее задание: Отчёт о проекте",
    "content_type": "file_upload",
    "content": {
        "instructions": "Подготовьте отчёт о вашем первом проекте на Python.\n\n**Требования:**\n1. Опишите идею проекта\n2. Покажите основной код с комментариями\n3. Приложите скриншоты работы программы\n4. Укажите, что вы узнали нового\n\n**Допустимые форматы:** PDF, DOCX, ZIP\n**Максимальный размер:** 10 МБ",
        "allowed_extensions": ["pdf", "docx", "zip"],
        "max_file_size_mb": 10
    },
    "duration_minutes": 60
})
lesson_upload = r.json()
print(f"    📎 Lesson 2.2 (file_upload): {lesson_upload['title']}")


# ═══════════════════════════════════════════════════════════════
# MODULE 3: Интерактивные упражнения (ALL 5 types)
# ═══════════════════════════════════════════════════════════════
r = requests.post(f"{BASE}/courses/{course_id}/modules", headers=h, json={
    "title": "Модуль 3: Интерактивные упражнения"
})
mod3 = r.json()
mod3_id = mod3["id"]
print(f"  📦 Module 3: {mod3['title']}")

# --- Lesson 3.1: Interactive - Matching ---
r = requests.post(f"{BASE}/courses/{course_id}/modules/{mod3_id}/lessons", headers=h, json={
    "title": "Сопоставление: Типы данных Python",
    "content_type": "interactive",
    "content": {
        "exercise_type": "matching",
        "pairs": [
            {"left": "int", "right": "Целое число (42, -7)"},
            {"left": "float", "right": "Число с плавающей точкой (3.14)"},
            {"left": "str", "right": "Строка текста ('Привет')"},
            {"left": "bool", "right": "Логическое значение (True/False)"},
            {"left": "list", "right": "Упорядоченная коллекция ([1, 2, 3])"},
            {"left": "dict", "right": "Словарь пар ключ-значение ({'a': 1})"}
        ]
    },
    "duration_minutes": 5
})
lesson_matching = r.json()
print(f"    🔗 Lesson 3.1 (matching): {lesson_matching['title']}")

# --- Lesson 3.2: Interactive - Ordering ---
r = requests.post(f"{BASE}/courses/{course_id}/modules/{mod3_id}/lessons", headers=h, json={
    "title": "Порядок: Этапы создания программы",
    "content_type": "interactive",
    "content": {
        "exercise_type": "ordering",
        "items": [
            "Определить задачу",
            "Продумать алгоритм",
            "Написать код",
            "Протестировать программу",
            "Исправить ошибки",
            "Оптимизировать решение"
        ],
        "correct_order": [
            "Определить задачу",
            "Продумать алгоритм",
            "Написать код",
            "Протестировать программу",
            "Исправить ошибки",
            "Оптимизировать решение"
        ]
    },
    "duration_minutes": 5
})
lesson_ordering = r.json()
print(f"    📊 Lesson 3.2 (ordering): {lesson_ordering['title']}")

# --- Lesson 3.3: Interactive - Fill in the Blanks ---
r = requests.post(f"{BASE}/courses/{course_id}/modules/{mod3_id}/lessons", headers=h, json={
    "title": "Заполни пропуски: Синтаксис Python",
    "content_type": "interactive",
    "content": {
        "exercise_type": "fill_blanks",
        "text_template": "Чтобы вывести текст на экран, используется функция {{blank}}. Для создания цикла используется ключевое слово {{blank}}. Условная конструкция начинается с {{blank}}. Чтобы определить функцию, используется ключевое слово {{blank}}.",
        "blanks": ["print", "for", "if", "def"]
    },
    "duration_minutes": 5
})
lesson_blanks = r.json()
print(f"    ✏️ Lesson 3.3 (fill_blanks): {lesson_blanks['title']}")

# --- Lesson 3.4: Interactive - True/False ---
r = requests.post(f"{BASE}/courses/{course_id}/modules/{mod3_id}/lessons", headers=h, json={
    "title": "Верно/Неверно: Факты о Python",
    "content_type": "interactive",
    "content": {
        "exercise_type": "true_false",
        "statement": "Python — это компилируемый язык программирования.",
        "correct_answer": False
    },
    "duration_minutes": 3
})
lesson_tf = r.json()
print(f"    ✅ Lesson 3.4 (true_false): {lesson_tf['title']}")

# --- Lesson 3.5: Interactive - Categorize ---
r = requests.post(f"{BASE}/courses/{course_id}/modules/{mod3_id}/lessons", headers=h, json={
    "title": "Категоризация: Типы операторов Python",
    "content_type": "interactive",
    "content": {
        "exercise_type": "categorize",
        "categories": [
            {
                "name": "Арифметические операторы",
                "items": ["+", "-", "*", "/", "//", "%", "**"]
            },
            {
                "name": "Операторы сравнения",
                "items": ["==", "!=", ">", "<", ">=", "<="]
            },
            {
                "name": "Логические операторы",
                "items": ["and", "or", "not"]
            }
        ],
        "all_items": ["+", "-", "*", "/", "//", "%", "**", "==", "!=", ">", "<", ">=", "<=", "and", "or", "not"]
    },
    "duration_minutes": 5
})
lesson_categorize = r.json()
print(f"    📂 Lesson 3.5 (categorize): {lesson_categorize['title']}")

# ═══════════════════════════════════════════════════════════════
# Publish the course
# ═══════════════════════════════════════════════════════════════
r = requests.post(f"{BASE}/courses/{course_id}/publish", headers=h)
if r.status_code == 200:
    print(f"\n🚀 Course published!")
else:
    print(f"\n⚠️ Publish returned {r.status_code}: {r.text}")

# ═══════════════════════════════════════════════════════════════
# Verify everything
# ═══════════════════════════════════════════════════════════════
print("\n" + "="*60)
print("VERIFICATION")
print("="*60)

r = requests.get(f"{BASE}/courses/{course_id}", headers=h)
course_data = r.json()
print(f"\nКурс: {course_data['title']}")
print(f"Статус: {course_data['status']}")
print(f"Описание: {course_data['description'][:80]}...")

for m in course_data.get("modules", []):
    print(f"\n  📦 {m['title']}")
    for l in m.get("lessons", []):
        content_preview = ""
        c = l.get("content", {})
        if l["content_type"] == "text":
            body = c.get("body", "")
            content_preview = f"({len(body)} chars)"
        elif l["content_type"] == "video":
            content_preview = f"(url: {c.get('video_url', 'n/a')})"
        elif l["content_type"] == "quiz":
            content_preview = "(quiz attached)"
        elif l["content_type"] == "code_challenge":
            content_preview = "(challenge attached)"
        elif l["content_type"] == "file_upload":
            exts = c.get("allowed_extensions", [])
            content_preview = f"(formats: {', '.join(exts)})"
        elif l["content_type"] == "interactive":
            etype = c.get("exercise_type", "?")
            content_preview = f"(type: {etype})"

        # Check for encoding issues
        has_encoding_issue = "??????" in l["title"] or "??????" in json.dumps(c, ensure_ascii=False)
        flag = " ⚠️ ENCODING ISSUE!" if has_encoding_issue else ""

        print(f"    {'📝' if l['content_type'] == 'text' else '🎬' if l['content_type'] == 'video' else '📋' if l['content_type'] == 'quiz' else '💻' if l['content_type'] == 'code_challenge' else '📎' if l['content_type'] == 'file_upload' else '🎮'} {l['title']} [{l['content_type']}] {content_preview}{flag}")

print(f"\n✅ Total modules: {len(course_data.get('modules', []))}")
total_lessons = sum(len(m.get("lessons", [])) for m in course_data.get("modules", []))
print(f"✅ Total lessons: {total_lessons}")
print(f"\nCourse ID: {course_id}")
print("Done!")
