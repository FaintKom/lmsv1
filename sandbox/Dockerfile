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

# The filesystem is read-only at runtime, so anything a toolchain wants to write
# has to point at a tmpfs. Go's build cache defaults to $HOME/.cache and failed
# with "mkdir /root/.cache: read-only file system" — a second reason Go never
# ran, independent of both the memory limit and noexec.
ENV HOME=/tmp
ENV GOCACHE=/tmp/.gocache

# Mount point for the one directory that permits execution. Created here so it
# exists whether or not a compose file mounts over it; see executor.EXEC_DIR.
RUN mkdir -p /sandbox-exec

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn

COPY . .

# Create unprivileged user for code execution
RUN useradd -m -s /bin/bash runner

# Everything below this line runs as `runner`, including uvicorn itself. No step
# needs root: the port is 8001, above the privileged range, and every writable
# path is a tmpfs the compose files mount world-writable.
#
# This was the last of the audit's findings and the one it called a one-line
# change. It is one line — but only because Phase 3 moved the writable areas
# somewhere an unprivileged user can reach. Before that, running as `runner`
# would have failed on a directory rather than on a permission.
USER runner

EXPOSE 8001

CMD ["uvicorn", "runner.main:app", "--host", "0.0.0.0", "--port", "8001"]
