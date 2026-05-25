# Production server specs & local LLM feasibility (2026-05-23)

## Hetzner CX22 — actual real-time specs

Source: live SSH read-only inspection at `root@204.168.165.41`.

| Parameter | Value |
|---|---|
| CPU | 2 vCPU AMD EPYC-Rome @ 2.0 GHz (KVM virtual) |
| RAM | 3.7 GB total / **~2 GB free** (1.7 GB used by 14 containers) |
| Swap | 2 GB (804 MB already used — warning sign) |
| Disk | 38 GB total / **8 GB free** (78 % full) |
| GPU | **None** |
| OS | Ubuntu, kernel 6.8 |
| Cost | ~4 EUR/month |

### Containers currently running on this box

- prod lms: `lms-db-1`, `lms-backend-1`, `lms-frontend-1`, `lms-nginx-1`, `lms-sandbox-1`, `lms-redis-1`, `lms-cloudflared-1`
- staging lms: `lms-staging-backend-1`, `lms-staging-frontend-1`, `lms-staging-db-1`, `lms-staging-redis-1`, `lms-staging-sandbox-1`
- external lesson generator: `external-backend`
- other: `topdown-rpg`

Total 14 containers. Resource budget for any new service is **very tight**.

---

## Local LLM feasibility — verdict: NO

This server cannot meaningfully host a local LLM for lesson generation. Math (CPU-only, no GPU):

| Model | RAM | Speed on 2 vCPU @ 2 GHz | Disk |
|---|---|---|---|
| TinyLlama 1.1B Q4 | ~700 MB | 5-8 tok/s | 700 MB |
| Qwen 2.5 1.5B Q4 | ~1.2 GB | 3-5 tok/s | 1 GB |
| Qwen 2.5 3B Q4 | ~2.2 GB | **1-3 tok/s** | 2 GB |
| Llama 3.1 8B Q4 | ~5 GB | **won't fit** | 4.5 GB |
| Mistral 7B Q4 | ~4.5 GB | **won't fit** | 4.2 GB |

For external lesson generator-style lesson generation (~5-10 k tokens output) on Qwen 3B at 2 tok/s: **40-80 minutes per lesson**. Plus the 3 B model fails reliably on JSON-valid output for the 15-rule validator.

The current Ollama `qwen2.5:3b` in `lms-sandbox` is wired for **student chat helper** (short replies), not lesson generation. It's the right tool for that job, wrong for this one.

---

## What external lesson generator already does

`[external generator repo]` does **not** use local LLM:
- Pipeline: Fixture → Prompt → **OpenRouter (cloud)** → Validate → Render
- Client-side validator (15 rules) on 1600×900 canvas
- Prompts in 5 languages (en/ru/id/es/az)
- 24 layouts × 12 widgets as contract for LLM output
- Manual paste-back through `prompt.html` → `validate.html`

The team already chose cloud LLM for generation. This is the right call for current hardware.

---

## Four options going forward

### Option A — Cloud LLM, no local (RECOMMENDED)
- **OpenRouter** or **Anthropic API direct**
- Claude 3.5 Sonnet: ~$3 input / $15 output per 1 M tokens
- One external lesson generator-style lesson = ~15-30 k tokens = **$0.10-0.30 / lesson**
- 1000 lessons/month = $100-300/month
- Speed: 30-60 s per lesson
- Quality: production-grade
- Architecture: external lesson generator already wired this way

### Option B — upgrade to Hetzner CPX31
- 8 vCPU AMD, 16 GB RAM, ~15 EUR/month (+11 over current)
- Fits Llama 3.1 8B Q4 or Mistral 7B Q4
- Speed: 4-7 tok/s = 5-10 minutes per lesson
- Quality below Claude 3.5
- Disk still needs growing

### Option C — dedicated GPU (Hetzner GEX44)
- RTX 4000 SFF Ada 20 GB: ~210 EUR/month
- Runs Qwen 32B / Llama 70B Q4
- Speed: 20-40 tok/s = 30-60 s per lesson
- Quality close to Claude
- **Too expensive for current traffic.**

### Option D — hybrid (best long-term)
- On CPX31 (16 GB) keep **Qwen 1.5B** for inline tasks: classification, tags, summarisation
- Lesson generation = **cloud Claude/GPT**
- Cloud cost reduced 3-5×

---

## Recommendation

1. **Do not put a local LLM on this server.** External lesson generator is correct.
2. Reproduce external lesson generator pipeline in lms: `Fixture (lesson spec) → Prompt template → cloud LLM → Pydantic validator → Store`. Pydantic exercise schemas already exist in `app/exercises/`.
3. **Generate in chunks** — parallelise theory + N exercises + summary via `asyncio.gather`. Cuts a 60 s sequential generation to 15-20 s.
4. **Reuse SSE streaming** in `app/ai/router.py` for progress UI.
5. **OpenRouter gateway** — model becomes a single env var. Copy external lesson generator's pattern.
6. **Add a worker container** (Arq, ~50 MB RAM) for the generation queue. Redis already running.
7. When traffic grows past ~5000 lessons/month, revisit Option B / D.

Current server can stay as-is, only add: Redis (already present) + Arq worker container.
