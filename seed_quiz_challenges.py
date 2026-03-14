import requests

API = "https://lms-backend-0b8v.onrender.com/api/v1"
r = requests.post(f"{API}/auth/login", json={"email": "test4@test.com", "password": "test1234"})
TOKEN = r.json()["access_token"]
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

# Create quiz
quiz_data = {
    "lesson_id": "14f0409c-e21d-4f79-9704-d9292fa57e00",
    "title": "Основы Python",
    "questions": [
        {"text": "Кто создал Python?", "options": ["Джеймс Гослинг", "Гвидо ван Россум", "Деннис Ритчи", "Бьярне Страуструп"], "correct": 1},
        {"text": "Какая функция выводит текст?", "options": ["echo()", "console.log()", "print()", "puts()"], "correct": 2},
        {"text": "Как создать переменную?", "options": ["var x = 5", "int x = 5", "x = 5", "let x = 5"], "correct": 2},
        {"text": "Тип значения 3.14?", "options": ["int", "str", "float", "double"], "correct": 2},
        {"text": "Что выведет type(True)?", "options": ["<class 'int'>", "<class 'bool'>", "<class 'str'>", "<class 'boolean'>"], "correct": 1},
    ]
}
r = requests.post(f"{API}/assessments/quizzes", json=quiz_data, headers=H)
print(f"Quiz: {r.status_code} - {r.text[:120]}")

# Challenge 1: Calculator
r = requests.post(f"{API}/sandbox/challenges", json={
    "lesson_id": "818e751c-4397-4291-bd58-e7d39a9ddd68",
    "title": "Калькулятор",
    "description": "Напишите программу-калькулятор для a=10, b=3",
    "language": "python",
    "starter_code": "a = 10\nb = 3\n\n# Напишите вычисления:\n",
    "solution_code": "a=10\nb=3\nprint(f'{a}+{b}={a+b}')"
}, headers=H)
print(f"Challenge 1: {r.status_code} - {r.text[:120]}")
if r.status_code == 200:
    cid = r.json()["id"]
    r2 = requests.post(f"{API}/sandbox/challenges/{cid}/test-cases", json={
        "input": "",
        "expected_output": "10 + 3 = 13\n10 - 3 = 7\n10 * 3 = 30\n10 / 3 = 3.3333333333333335",
        "is_hidden": False
    }, headers=H)
    print(f"  Test case 1: {r2.status_code}")

# Challenge 2: FizzBuzz
r = requests.post(f"{API}/sandbox/challenges", json={
    "lesson_id": "defb44d5-8ac0-4c21-9199-cab2f0a26acb",
    "title": "FizzBuzz",
    "description": "Реализуйте алгоритм FizzBuzz для чисел 1-20",
    "language": "python",
    "starter_code": "# FizzBuzz: числа 1-20\n# Делится на 3 -> Fizz, на 5 -> Buzz, на оба -> FizzBuzz\n\n",
    "solution_code": "for i in range(1,21):\n    if i%15==0: print('FizzBuzz')\n    elif i%3==0: print('Fizz')\n    elif i%5==0: print('Buzz')\n    else: print(i)"
}, headers=H)
print(f"Challenge 2: {r.status_code} - {r.text[:120]}")
if r.status_code == 200:
    cid = r.json()["id"]
    expected = "\n".join(["1","2","Fizz","4","Buzz","Fizz","7","8","Fizz","Buzz","11","Fizz","13","14","FizzBuzz","16","17","Fizz","19","Buzz"])
    r2 = requests.post(f"{API}/sandbox/challenges/{cid}/test-cases", json={
        "input": "",
        "expected_output": expected,
        "is_hidden": False
    }, headers=H)
    print(f"  Test case 2: {r2.status_code}")

print("\nDone!")
