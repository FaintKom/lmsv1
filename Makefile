.PHONY: up down build migrate test lint

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

# Frontend commands
fe-dev:
	cd frontend && npm run dev

fe-build:
	cd frontend && npm run build

fe-lint:
	cd frontend && npm run lint
