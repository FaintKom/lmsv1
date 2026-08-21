"""Библиотека заданий: задание принадлежит школе, а не уроку (specs/030).

Сегодня `exercises.lesson_id` обязателен, поэтому задания без урока не
существует, а раздел «Content Library» показывает список без кнопки создания:
нажать её было бы некуда.

Эти тесты падают на нынешнем коде — так и задумано. Что именно ломается,
записано в теле каждого: схема требует урок, `org_id` вычисляется из урока, а
список не отличает поставленное задание от лежащего в библиотеке.
"""

import uuid

import pytest

from tests.conftest import auth_header, make_course, make_lesson, make_module


@pytest.mark.asyncio
async def test_exercise_is_created_without_a_lesson(client, db, org, teacher):
    """Задание заводится в библиотеке и попадает в список своей школы."""
    response = await client.post(
        "/api/v1/exercises",
        json={
            "exercise_type": "true_false",
            "title": "Про библиотеку",
            "config": {"statement": "Задание живёт без урока", "correct_answer": True},
        },
        headers=auth_header(teacher),
    )

    assert response.status_code == 200, response.text
    created = response.json()
    assert created["lesson_id"] is None

    listing = await client.get("/api/v1/exercises/", headers=auth_header(teacher))
    assert listing.status_code == 200
    assert created["id"] in [item["id"] for item in listing.json()["items"]]


@pytest.mark.asyncio
async def test_school_comes_from_the_caller_not_the_request(client, db, org, org2, teacher, admin2):
    """Школа берётся у того, кто создаёт.

    Без урока другого источника нет, и это ровно граница арендатора: задание,
    заведённое учителем одной школы, не должно оказаться видимым в другой.
    """
    mine = await client.post(
        "/api/v1/exercises",
        json={"exercise_type": "true_false", "title": "Моё", "config": {}},
        headers=auth_header(teacher),
    )
    assert mine.status_code == 200, mine.text

    theirs = await client.get("/api/v1/exercises/", headers=auth_header(admin2))
    assert theirs.status_code == 200
    assert mine.json()["id"] not in [item["id"] for item in theirs.json()["items"]]


@pytest.mark.asyncio
async def test_a_lesson_from_another_school_is_refused(client, db, org, org2, teacher, admin2):
    """Урок можно указать при создании — но только свой."""
    course = await make_course(db, org2, admin2)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    response = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": "true_false",
            "title": "Чужой урок",
            "config": {},
        },
        headers=auth_header(teacher),
    )

    assert response.status_code in (403, 404), response.text


@pytest.mark.asyncio
async def test_listing_tells_placed_from_unplaced(client, db, org, teacher):
    """Список отличает задание, стоящее в уроке, от лежащего в библиотеке.

    Без этого признака библиотека не отвечает на свой главный вопрос — «что
    у меня есть и что из этого никуда не поставлено».
    """
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    placed = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": "true_false",
            "title": "Стоит в уроке",
            "config": {},
        },
        headers=auth_header(teacher),
    )
    assert placed.status_code == 200, placed.text

    spare = await client.post(
        "/api/v1/exercises",
        json={"exercise_type": "true_false", "title": "Лежит в библиотеке", "config": {}},
        headers=auth_header(teacher),
    )
    assert spare.status_code == 200, spare.text

    listing = await client.get("/api/v1/exercises/", headers=auth_header(teacher))
    by_id = {item["id"]: item for item in listing.json()["items"]}

    assert by_id[placed.json()["id"]]["is_placed"] is True
    assert by_id[spare.json()["id"]]["is_placed"] is False


@pytest.mark.asyncio
async def test_unknown_lesson_is_refused(client, teacher):
    """Несуществующий урок — не то же самое, что его отсутствие."""
    response = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(uuid.uuid4()),
            "exercise_type": "true_false",
            "title": "Урока нет",
            "config": {},
        },
        headers=auth_header(teacher),
    )

    assert response.status_code == 404, response.text
