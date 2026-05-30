FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir uv

COPY pyproject.toml .
RUN uv pip install --system "."

COPY . .

EXPOSE 8000

# --proxy-headers + --forwarded-allow-ips: trust X-Forwarded-For from the nginx
# reverse proxy so request.client.host (and thus the slowapi rate-limit key) is
# the REAL client IP, not the nginx container IP. Without this every request
# shares one rate-limit bucket (the proxy IP) — 5 logins/min for the whole
# platform. The backend is only reachable via nginx on the internal network,
# so trusting all forwarded IPs ("*") is safe here.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--proxy-headers", "--forwarded-allow-ips", "*"]
