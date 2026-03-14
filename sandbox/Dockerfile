FROM python:3.12-slim

# Install language runtimes
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ \
    default-jdk \
    nodejs npm \
    && rm -rf /var/lib/apt/lists/*

# Install Go
RUN apt-get update && apt-get install -y --no-install-recommends wget \
    && wget -q https://go.dev/dl/go1.22.5.linux-amd64.tar.gz \
    && tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz \
    && rm go1.22.5.linux-amd64.tar.gz \
    && apt-get purge -y wget \
    && rm -rf /var/lib/apt/lists/*

ENV PATH="/usr/local/go/bin:${PATH}"

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn

COPY . .

# Create unprivileged user for code execution
RUN useradd -m -s /bin/bash runner

EXPOSE 8001

CMD ["uvicorn", "runner.main:app", "--host", "0.0.0.0", "--port", "8001"]
