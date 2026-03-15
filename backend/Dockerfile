FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml .
RUN uv pip install --system "."

COPY . .

EXPOSE 8000

# Run migrations then start server
CMD ["sh", "-c", "PYTHONPATH=/app alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2"]
