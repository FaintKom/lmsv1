"""specs/041: проверка судит тем же правилом, что и сдача.

Два типа не хранят ответа — сервер вычисляет его сам в момент разметки:
система уравнений решается, тело стереометрии считается. Это правило было
написано только для пути сдачи, и проверочный путь отвечал «неверно» на что
угодно, включая верный ответ.

Видно это было в превью учителя, где кнопка «Check» ходит именно на проверку:
верно заполненное задание выглядело сломанным. Отсюда и тесты — не про
эндпоинт, а про то, что два пути к одному ответу приходят вместе.
"""

import pytest

from tests.conftest import auth_header, make_course, make_lesson, make_module

SYSTEM = {
    "problem": "Solve the system.",
    "equations": ["x + y = 5", "x - y = 1"],
    "variables": ["x", "y"],
}
SYSTEM_RIGHT = {"kind": "unique", "values": {"x": "3", "y": "2"}}
SYSTEM_WRONG = {"kind": "unique", "values": {"x": "2", "y": "3"}}

# Две параллельные прямые: решений нет, и это сам предмет задачи.
PARALLEL = {
    "problem": "How many solutions?",
    "equations": ["x + y = 4", "x + y = 7"],
    "variables": ["x", "y"],
}
PARALLEL_RIGHT = {"kind": "none"}

BOX = {"solid": "box", "dimensions": {"a": 2, "b": 3, "c": 4}, "quantity": "volume"}
BOX_RIGHT = {"value": 24}
BOX_WRONG = {"value": 26}


async def _make(client, db, teacher, org, exercise_type: str, config: dict) -> str:
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)
    resp = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": exercise_type,
            "title": "specs/041",
            "config": config,
        },
        headers=auth_header(teacher),
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["id"]


async def test_check_marks_a_correct_system_of_equations(client, db, org, teacher):
    """Красный до правки: проверка отдаёт passed=false на верное решение."""
    exercise_id = await _make(client, db, teacher, org, "math_system", SYSTEM)

    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/check",
        json={"interactive_answers": SYSTEM_RIGHT},
        headers=auth_header(teacher),
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is True


async def test_check_marks_a_system_without_solutions(client, db, org, teacher):
    """«Решений нет» — такой же верный ответ, как пара чисел."""
    exercise_id = await _make(client, db, teacher, org, "math_system", PARALLEL)

    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/check",
        json={"interactive_answers": PARALLEL_RIGHT},
        headers=auth_header(teacher),
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is True


async def test_check_marks_a_correct_solid(client, db, org, teacher):
    """Красный до правки: коробка 2×3×4 объёмом 24 считается неверной."""
    exercise_id = await _make(client, db, teacher, org, "stereometry", BOX)

    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/check",
        json={"interactive_answers": BOX_RIGHT},
        headers=auth_header(teacher),
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is True


async def test_check_still_marks_a_wrong_answer_wrong(client, db, org, teacher):
    """Контроль: без него зелёный получился бы и от «всегда верно»."""
    exercise_id = await _make(client, db, teacher, org, "math_system", SYSTEM)

    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/check",
        json={"interactive_answers": SYSTEM_WRONG},
        headers=auth_header(teacher),
    )

    assert resp.status_code == 200, resp.text
    assert resp.json()["passed"] is False


@pytest.mark.parametrize(
    "exercise_type,config,answer",
    [
        ("math_system", SYSTEM, SYSTEM_RIGHT),
        ("math_system", SYSTEM, SYSTEM_WRONG),
        ("math_system", PARALLEL, PARALLEL_RIGHT),
        ("stereometry", BOX, BOX_RIGHT),
        ("stereometry", BOX, BOX_WRONG),
    ],
)
async def test_check_and_submit_agree(
    client, db, org, teacher, student, exercise_type, config, answer
):
    """Один ответ — один вердикт, с какой бы стороны его ни спросили.

    Это и есть требование FR-003: правило разметки одно. Тест падает и когда
    проверка не умеет типа, и когда правило разъедется потом.
    """
    exercise_id = await _make(client, db, teacher, org, exercise_type, config)

    checked = await client.post(
        f"/api/v1/exercises/{exercise_id}/check",
        json={"interactive_answers": answer},
        headers=auth_header(teacher),
    )
    submitted = await client.post(
        f"/api/v1/exercises/{exercise_id}/submit",
        json={"interactive_answers": answer},
        headers=auth_header(student),
    )

    assert checked.status_code == 200, checked.text
    assert submitted.status_code == 200, submitted.text
    assert checked.json()["passed"] is submitted.json()["passed"]


async def test_check_refuses_a_misconfigured_system(client, db, org, teacher):
    """Сломано задание, а не ответ.

    Отрицательный вердикт тут — ложь: он говорит учителю, что ответ неверен,
    хотя решать нечего. Путь сдачи это давно различает; проверка должна так же.
    """
    broken = {"equations": ["x * y = 5", "x - y = 1"], "variables": ["x", "y"]}
    exercise_id = await _make(client, db, teacher, org, "math_system", broken)

    resp = await client.post(
        f"/api/v1/exercises/{exercise_id}/check",
        json={"interactive_answers": SYSTEM_RIGHT},
        headers=auth_header(teacher),
    )

    assert resp.status_code == 400, resp.text
    assert "misconfigured" in resp.text
