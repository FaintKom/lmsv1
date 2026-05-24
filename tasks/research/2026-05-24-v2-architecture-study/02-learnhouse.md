# LearnHouse — block-based lesson editor

Source: https://github.com/learnhouse/learnhouse (MIT, Next.js + Python backend)
Docs: https://docs.learnhouse.app/

## Core idea
Notion-style block editor for lesson content. Each lesson page = stack of
typed blocks (text, image, video, code, quiz, embed, …). Author drags
blocks in, fills props inline. Same data model renders both edit and
view modes.

## Block model (inferred from docs + Notion-style references)

```ts
type Block =
  | { type: "paragraph"; text: RichText[] }
  | { type: "heading"; level: 1 | 2 | 3; text: RichText[] }
  | { type: "image"; url: string; caption?: string }
  | { type: "video"; src: string; provider: "youtube" | "vimeo" | "upload" }
  | { type: "code"; language: string; content: string; runnable?: boolean }
  | { type: "quiz"; questions: QuizQuestion[] }
  | { type: "callout"; emoji?: string; tone: "info" | "warn"; children: Block[] }
  | { type: "embed"; service: string; url: string };

type Lesson = {
  id: string;
  title: string;
  blocks: Block[];
};
```

Notion's actual data model: every block has `{ id, type, properties,
content (array of child block IDs), parent }`. Tree-shaped, not list —
nesting is first-class. LearnHouse is simpler (flat list within a page)
but inherits the type discriminator pattern.

## Editor UX patterns
- **Slash command** ( `/` ) opens a block-type picker (matches Notion/Obsidian)
- **Drag handle** on each block hover for reorder
- **Inline format menu** appears on text selection (bold/italic/link/code)
- **Plus button** between blocks to insert new
- **Cmd+/** to convert block type (paragraph → heading-2)

## Real-time + AI features (from repo description)
- Real-time collaborative whiteboards (not core editor, separate widget)
- AI-generated interactive elements
- Auto-grading code execution in 30+ languages

## What's worth adopting for our LMS

### Already have (TipTap)
Our admin lesson editor uses TipTap 3. TipTap has built-in
slash-commands, drag handles, inline format menu — same UX as
LearnHouse. We're not behind here.

### Gaps vs LearnHouse
1. **Typed exercise blocks inside the editor**
   LearnHouse can drop a `quiz` block inline with text. We currently
   separate exercises from lesson content (different routes, different
   editors). Closing that gap = methodist edits prose + exercises in
   one timeline.

2. **AI-generated block insertion**
   "Suggest a quiz about this paragraph" button → LLM proposes 3 quiz
   options inline. We have AI tutor; extending to authoring is small
   wiring on top of existing Voyage/Anthropic infra.

3. **Block-level versioning**
   If methodist edits one block, only that block diffs. LearnHouse
   stores blocks individually. Ours stores whole TipTap doc per save.
   Less critical but cleaner audit log.

## Recommended next step (out of scope this session)
Audit our TipTap node schema. Add a `v2-exercise` custom node that
wraps any of our 43+ V2 exercise types (`type: "quiz" | "whiteboard"
| ...`) — then methodist can drop a `WhiteboardV2` inline next to
prose. This matches LearnHouse's UX with zero new editor framework.
