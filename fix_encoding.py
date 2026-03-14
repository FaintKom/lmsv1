"""Fix garbled Cyrillic data in course and module titles."""
import requests

API = "https://lms-backend-0b8v.onrender.com/api/v1"

# Login as admin
r = requests.post(f"{API}/auth/login", json={"email": "test4@test.com", "password": "test1234"})
TOKEN = r.json()["access_token"]
H = {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}

CID = "ce31bae1-5ca0-4bf9-b465-96a1ab91b9be"

# Update course title and description
r = requests.put(f"{API}/courses/{CID}", json={
    "title": "Основы программирования на Python",
    "description": "Полный курс для начинающих. Изучите Python с нуля: от переменных и типов данных до условий и циклов и функций. Включает теорию, видео, тесты, задачи на код и интерактивные упражнения.",
    "category": "Программирование",
}, headers=H)
print(f"Update course: {r.status_code}")

# Update module titles
modules = {
    "b3147f92-fec6-4658-8f88-f785ff86690e": "Модуль 1: Введение в Python",
    "5035f692-23ed-4a28-a3c5-32c966573734": "Модуль 2: Типы данных",
    "04b70fb5-e3fa-40fd-855a-71d1081b64fb": "Модуль 3: Управление потоком",
}

for mod_id, title in modules.items():
    r = requests.put(f"{API}/courses/{CID}/modules/{mod_id}", json={"title": title}, headers=H)
    print(f"Update module {title}: {r.status_code}")

# Verify
r = requests.get(f"{API}/courses/{CID}", headers=H)
if r.status_code == 200:
    import json
    data = r.json()
    print(f"\nCourse: {data['title']}")
    for m in data.get("modules", []):
        print(f"  Module: {m['title']}")
        for l in m.get("lessons", []):
            print(f"    Lesson: {l['title']}")

print("\nDone!")
