"""Thin HTTPX wrapper around the GrassLMS REST API."""

from __future__ import annotations

import os
from typing import Any

import httpx


class LmsApiError(RuntimeError):
    def __init__(self, status: int, body: Any):
        self.status = status
        self.body = body
        super().__init__(f"LMS API {status}: {body}")


class LmsClient:
    def __init__(self, base_url: str | None = None, token: str | None = None):
        self.base_url = (base_url or os.environ.get("LMS_BASE_URL", "")).rstrip("/")
        self.token = token or os.environ.get("LMS_TOKEN", "")
        if not self.base_url:
            raise RuntimeError("LMS_BASE_URL env var is required")
        if not self.token:
            raise RuntimeError("LMS_TOKEN env var is required (JWT)")
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=30.0,
            headers={"Authorization": f"Bearer {self.token}"},
        )

    async def aclose(self) -> None:
        await self._client.aclose()

    async def _request(self, method: str, path: str, **kw) -> Any:
        r = await self._client.request(method, path, **kw)
        if r.status_code >= 400:
            try:
                body = r.json()
            except Exception:
                body = r.text
            raise LmsApiError(r.status_code, body)
        if r.status_code == 204 or not r.content:
            return None
        return r.json()

    async def get(self, path: str, **kw) -> Any:
        return await self._request("GET", path, **kw)

    async def post(self, path: str, json: Any = None, **kw) -> Any:
        return await self._request("POST", path, json=json, **kw)

    async def put(self, path: str, json: Any = None, **kw) -> Any:
        return await self._request("PUT", path, json=json, **kw)

    async def delete(self, path: str, **kw) -> Any:
        return await self._request("DELETE", path, **kw)

    # Domain helpers
    async def me(self) -> dict:
        return await self.get("/api/v1/auth/me")

    async def list_courses(self) -> dict:
        return await self.get("/api/v1/courses/")

    async def create_course(self, data: dict) -> dict:
        return await self.post("/api/v1/admin/courses", json=data)

    async def get_course(self, course_id: str) -> dict:
        return await self.get(f"/api/v1/courses/{course_id}")

    async def add_module(self, course_id: str, data: dict) -> dict:
        return await self.post(f"/api/v1/admin/courses/{course_id}/modules", json=data)

    async def add_lesson(self, module_id: str, data: dict) -> dict:
        return await self.post(f"/api/v1/admin/modules/{module_id}/lessons", json=data)

    async def create_exercise(self, data: dict) -> dict:
        return await self.post("/api/v1/exercises", json=data)

    async def list_exercises_for_lesson(self, lesson_id: str) -> list[dict]:
        return await self.get(f"/api/v1/exercises/by-lesson/{lesson_id}")

    async def config_schemas(self) -> dict:
        return await self.get("/api/v1/exercises/config-schemas")
