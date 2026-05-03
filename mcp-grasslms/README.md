# mcp-grasslms

MCP server that lets an LLM agent (Claude Desktop, Claude Code, any MCP
client) create GrassLMS courses, lessons, and exercises through typed
tools. Each exercise type has its own `create_*` tool so the agent
can't ship invalid `config` dicts.

## Install

```bash
cd mcp-grasslms
pip install -e .
```

## Configure

Get a JWT for the org you want to seed:

```bash
curl -X POST https://staging.grasslms.online/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teacher@grasslms.online","password":"Teacher2026!"}' \
  | jq -r .access_token
```

Export:

```bash
export LMS_BASE_URL=https://staging.grasslms.online
export LMS_TOKEN=eyJhbGciOi...
```

## Wire into Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
(macOS) or platform equivalent:

```json
{
  "mcpServers": {
    "grasslms": {
      "command": "python",
      "args": ["-m", "mcp_grasslms.server"],
      "env": {
        "LMS_BASE_URL": "https://staging.grasslms.online",
        "LMS_TOKEN": "<your jwt>"
      }
    }
  }
}
```

Restart. Tools `create_course`, `add_module`, `add_lesson`,
`create_matching`, `create_fill_blanks`, … become available.

## Tools

### Discovery

- `whoami()` — sanity-check JWT.
- `get_exercise_config_schemas()` — JSON Schemas for every type.

### Scaffolding

- `list_courses()`, `get_course(id)`, `create_course(title, …)`
- `add_module(course_id, title)`
- `add_lesson(module_id, title, content_html, content_type, …)`

### One typed creator per exercise type (15 total)

`create_true_false`, `create_matching`, `create_ordering`,
`create_fill_blanks`, `create_categorize`, `create_translation`,
`create_sentence_builder`, `create_dialogue`, `create_conjugation`,
`create_reading`, `create_code_challenge`, `create_quiz`,
`create_file_upload`, `create_math_interactive`, `create_web_editor`.

Every config is server-validated against
`app.exercises.schemas.CONFIG_SCHEMAS`; bad values → HTTP 400 with the
offending field, surfaced in the MCP tool result.

## Sample agent prompt

> Create a course "Intro to Python" with one module "Variables", one
> text lesson explaining `print`, and a true_false exercise checking
> that `print("hi")` outputs `hi` followed by a newline.

The agent calls in order:
1. `create_course(title="Intro to Python")` → course id
2. `add_module(course_id=…, title="Variables")` → module id
3. `add_lesson(module_id=…, title="Hello, world", content_html="<p>…</p>")`
4. `create_true_false(lesson_id=…, title="Newline?", statement="…", correct_answer=True)`

No invalid configs possible — every typed tool maps to a Pydantic
schema on the server.
