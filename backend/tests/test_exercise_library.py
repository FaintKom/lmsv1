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

    Поставленным задание делает **блок урока**, а не поле `lesson_id`: поле
    говорит, где задание завели, блок — где его показывают, и после specs/030
    это разные вещи.
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

    lesson.content = {
        "version": 3,
        "pages": [
            {
                "id": "page_1",
                "blocks": [
                    {
                        "id": "block_1",
                        "type": "exercise",
                        "sort_order": 0,
                        "page": 1,
                        "exercise_id": placed.json()["id"],
                    }
                ],
            }
        ],
    }
    await db.flush()

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


def _block(exercise_id: str) -> dict:
    """Содержимое урока с одним блоком-заданием."""
    return {
        "version": 3,
        "pages": [
            {
                "id": "page_1",
                "blocks": [
                    {
                        "id": "block_1",
                        "type": "exercise",
                        "sort_order": 0,
                        "page": 1,
                        "exercise_id": exercise_id,
                    }
                ],
            }
        ],
    }


@pytest.mark.asyncio
async def test_lesson_shows_the_exercise_its_block_names(client, db, org, teacher):
    """Урок отдаёт то, на что ссылается блок, — даже если задание не его.

    Смысл библиотеки в этом и есть: задание, заведённое в одном месте,
    показывается в другом. Пока загрузка смотрит на `lesson_id`, заимствовать
    нечего.
    """
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    home = await make_lesson(db, module.id, title="Где завели")
    borrower = await make_lesson(db, module.id, title="Где показывают")

    created = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(home.id),
            "exercise_type": "true_false",
            "title": "Заимствованное",
            "config": {"statement": "Небо голубое", "correct_answer": True},
        },
        headers=auth_header(teacher),
    )
    assert created.status_code == 200, created.text

    borrower.content = _block(created.json()["id"])
    await db.flush()

    response = await client.get(
        f"/api/v1/exercises/by-lesson/{borrower.id}", headers=auth_header(teacher)
    )
    assert response.status_code == 200, response.text
    assert [item["id"] for item in response.json()] == [created.json()["id"]]


@pytest.mark.asyncio
async def test_the_student_still_gets_no_answers_through_this_load(
    client, db, org, teacher, student
):
    """Новая загрузка идёт через тот же срез ответов, что и старая."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    created = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": "true_false",
            "title": "С ключом",
            "config": {"statement": "Небо голубое", "correct_answer": True},
        },
        headers=auth_header(teacher),
    )
    lesson.content = _block(created.json()["id"])
    await db.flush()

    response = await client.get(
        f"/api/v1/exercises/by-lesson/{lesson.id}", headers=auth_header(student)
    )
    assert response.status_code == 200, response.text
    assert "correct_answer" not in response.json()[0]["config"]


@pytest.mark.asyncio
async def test_a_block_naming_another_schools_exercise_is_refused(
    client, db, org, org2, teacher, admin2
):
    """Постановка — единственное место, где номер задания приходит из запроса.

    Чужое задание всё равно не отрисуется: чтение фильтруется по организации
    читателя. Но это защита в другом слое, а проверять номер надо там, где он
    приходит.
    """
    theirs = await client.post(
        "/api/v1/exercises",
        json={"exercise_type": "true_false", "title": "Чужое", "config": {}},
        headers=auth_header(admin2),
    )
    assert theirs.status_code == 200, theirs.text

    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    response = await client.put(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons/{lesson.id}/",
        json={"content": _block(theirs.json()["id"])},
        headers=auth_header(teacher),
    )
    assert response.status_code in (403, 404), response.text


@pytest.mark.asyncio
async def test_a_block_naming_a_missing_exercise_is_refused_even_for_super_admin(
    client, db, org, super_admin
):
    """Супер-админ вне границы школ, но не вне здравого смысла.

    Найдено на стенде: блок с номером, которого нет, сохранялся с 200 и
    заменял содержимое урока. Чужая школа для супер-админа — допустимо,
    несуществующее задание — нет: это тихая потеря блока.
    """
    course = await make_course(db, org, super_admin)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    response = await client.put(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons/{lesson.id}/",
        json={"content": _block(str(uuid.uuid4()))},
        headers=auth_header(super_admin),
    )
    assert response.status_code == 404, response.text


@pytest.mark.asyncio
async def test_a_block_naming_my_own_exercise_is_saved(client, db, org, teacher):
    """Контроль к предыдущему: запрет на всё сразу тоже был бы зелёным."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(db, module.id)

    mine = await client.post(
        "/api/v1/exercises",
        json={"exercise_type": "true_false", "title": "Моё", "config": {}},
        headers=auth_header(teacher),
    )

    response = await client.put(
        f"/api/v1/courses/{course.id}/modules/{module.id}/lessons/{lesson.id}/",
        json={"content": _block(mine.json()["id"])},
        headers=auth_header(teacher),
    )
    assert response.status_code == 200, response.text


@pytest.mark.asyncio
async def test_creating_with_a_lesson_places_a_block_at_once(client, db, org, teacher, student):
    """Создание с уроком ставит блок сразу — старый путь работает по новой модели.

    Все, кто заводит задание через API с `lesson_id` — QA-сид, E2E, любой
    внешний вызов, — ждут, что ученик его увидит. Раньше это обеспечивала
    хвостовая секция плеера; теперь урок читает только блоки. Без этого шага
    E2E падали на обоих роботах: кнопки «Python» на странице не было.

    Заодно закрывается окно между выкатом и миграцией: хвостовое задание не
    может появиться, потому что создание само ставит блок.
    """
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(
        db, module.id, content={"version": 3, "pages": [{"id": "page_1", "blocks": []}]}
    )

    created = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": "true_false",
            "title": "Заведено с уроком",
            "config": {"statement": "Небо голубое", "correct_answer": True},
        },
        headers=auth_header(teacher),
    )
    assert created.status_code == 200, created.text

    shown = await client.get(
        f"/api/v1/exercises/by-lesson/{lesson.id}", headers=auth_header(student)
    )
    assert [item["id"] for item in shown.json()] == [created.json()["id"]]

    listing = await client.get("/api/v1/exercises/", headers=auth_header(teacher))
    assert {i["id"]: i for i in listing.json()["items"]}[created.json()["id"]]["is_placed"] is True


@pytest.mark.asyncio
async def test_creating_with_a_lesson_keeps_existing_blocks(client, db, org, teacher):
    """Блок дописывается в конец, остальное содержимое урока не трогается."""
    course = await make_course(db, org, teacher)
    module = await make_module(db, course.id)
    lesson = await make_lesson(
        db,
        module.id,
        content={
            "version": 3,
            "pages": [
                {
                    "id": "page_1",
                    "blocks": [
                        {
                            "id": "t1",
                            "type": "text",
                            "sort_order": 0,
                            "page": 1,
                            "body": "<p>Вступление</p>",
                        }
                    ],
                },
                {"id": "page_2", "blocks": []},
            ],
        },
    )

    created = await client.post(
        "/api/v1/exercises",
        json={
            "lesson_id": str(lesson.id),
            "exercise_type": "true_false",
            "title": "Второе",
            "config": {},
        },
        headers=auth_header(teacher),
    )
    assert created.status_code == 200, created.text

    await db.refresh(lesson)
    pages = lesson.content["pages"]
    assert [b["id"] for b in pages[0]["blocks"]] == ["t1"]
    assert [b.get("exercise_id") for b in pages[1]["blocks"]] == [created.json()["id"]]


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
