.PHONY: up down build migrate test lint hooks

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

logs:
	docker compose logs -f

# Backend commands (run locally)
migrate:
	cd backend && alembic upgrade head

migrate-new:
	cd backend && alembic revision --autogenerate -m "$(msg)"

test:
	cd backend && python -m pytest -v

lint:
	cd backend && ruff check . && ruff format --check .

format:
	cd backend && ruff check --fix . && ruff format .

# One-time setup: install pre-commit hooks (pip install pre-commit)
hooks:
	python -m pre_commit install

# Frontend commands
fe-dev:
	cd frontend && npm run dev

fe-build:
	cd frontend && npm run build

fe-lint:
	cd frontend && npm run lint
