# Quickstart: validating Unified Answer System

Prerequisites: dev stack, qa-teacher (+ the specs/018 test-mode panel for
verdict checks without a student account).

## Automated

```bash
cd backend && pytest tests/test_answer_system.py -v && pytest tests/ -q
```

```bash
cd frontend && npx tsc --noEmit && npm test && npm run build
```

## By hand

1. **Adaptive choice**: quiz question, mark ONE option correct → student
   control is radio; mark TWO correct → checkboxes; in the test-mode panel
   the exact set passes, a subset fails.
2. **Text rules**: text question with accepted ["colour","color"], case off
   → both pass in any case; flip case sensitivity → wrong case fails. The
   rules are readable on the editor screen.
3. **Reading**: a multi-correct question behaves as in the quiz; insert an
   image into the passage → student sees it.
4. **Translation**: editor shows accepted list, case toggle, «допускать
   близкие ответы»; toggle off → near-miss fails.
5. **Instructions**: fill the optional field → note appears above the task;
   clear it → nothing renders.
6. **Grandfathering**: an old quiz (single answers, no rules) grades exactly
   as before — pinned by tests, spot-check one in the panel.
