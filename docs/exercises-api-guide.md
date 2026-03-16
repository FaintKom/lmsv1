# Exercise System API Guide

## Overview

Unified exercise system. All types created via `POST /api/v1/exercises` with type-specific `config`. Quiz questions and code test cases added separately after exercise creation.

**Roles:** `admin` or `teacher` to create/edit. Any authenticated user to submit.

---

## 1. Create Exercise

`POST /api/v1/exercises`

```json
{
  "lesson_id": "uuid",
  "exercise_type": "quiz|code_challenge|matching|ordering|fill_blanks|true_false|categorize|file_upload",
  "title": "string",
  "config": { ... },
  "sort_order": 0
}
```

---

## 2. Exercise Types & Config

### 2.1 Quiz

```json
{
  "exercise_type": "quiz",
  "config": {
    "passing_score": 70,
    "time_limit_minutes": null
  }
}
```

**Then add questions:**

`POST /api/v1/exercises/{id}/questions`

```json
{
  "question_text": "What is 2+2?",
  "question_type": "multiple_choice",
  "options": [
    { "text": "3", "is_correct": false },
    { "text": "4", "is_correct": true },
    { "text": "5", "is_correct": false }
  ],
  "correct_answer": "4",
  "points": 10
}
```

For text_answer questions:
```json
{
  "question_text": "Capital of France?",
  "question_type": "text_answer",
  "options": null,
  "correct_answer": "Paris",
  "points": 5
}
```

### 2.2 Code Challenge

```json
{
  "exercise_type": "code_challenge",
  "config": {
    "language": "python",
    "starter_code": "def square(n):\n    ",
    "solution_code": "def square(n):\n    return n * n",
    "time_limit_seconds": 10,
    "memory_limit_mb": 256
  }
}
```

**Then add test cases:**

`POST /api/v1/exercises/{id}/test-cases`

```json
{
  "input": "5",
  "expected_output": "25",
  "is_hidden": false
}
```

### 2.3 Matching

```json
{
  "exercise_type": "matching",
  "config": {
    "pairs": [
      { "left": "hello", "right": "привет" },
      { "left": "goodbye", "right": "до свидания" }
    ],
    "shuffle": true
  }
}
```

### 2.4 Ordering

```json
{
  "exercise_type": "ordering",
  "config": {
    "items": ["First step", "Second step", "Third step"],
    "correct_order": ["First step", "Second step", "Third step"]
  }
}
```

### 2.5 Fill Blanks

```json
{
  "exercise_type": "fill_blanks",
  "config": {
    "text": "Python is a ___ language",
    "blanks": ["programming"]
  }
}
```

### 2.6 True/False

```json
{
  "exercise_type": "true_false",
  "config": {
    "statement": "Python is dynamically typed",
    "correct_answer": true
  }
}
```

### 2.7 Categorize

```json
{
  "exercise_type": "categorize",
  "config": {
    "categories": [
      { "name": "Fruits", "items": ["apple", "banana"] },
      { "name": "Vegetables", "items": ["carrot", "broccoli"] }
    ]
  }
}
```

### 2.8 File Upload

```json
{
  "exercise_type": "file_upload",
  "config": {
    "allowed_types": [".pdf", ".docx"],
    "max_file_mb": 50
  }
}
```

---

## 3. Submissions

`POST /api/v1/exercises/{id}/submit`

### Quiz
```json
{
  "answers": [
    { "question_id": "uuid", "selected_option": "option text" }
  ]
}
```

### Code Challenge
```json
{
  "source_code": "def square(n):\n    return n*n",
  "language": "python"
}
```

### Matching
```json
{
  "interactive_answers": {
    "pairs": [
      { "left": "hello", "right": "привет" }
    ]
  }
}
```

### Ordering
```json
{
  "interactive_answers": {
    "order": ["First step", "Second step", "Third step"]
  }
}
```

### Fill Blanks
```json
{
  "interactive_answers": {
    "blanks": ["programming"]
  }
}
```

### True/False
```json
{
  "interactive_answers": {
    "answer": true
  }
}
```

### Categorize
```json
{
  "interactive_answers": {
    "categories": {
      "Fruits": ["apple", "banana"],
      "Vegetables": ["carrot", "broccoli"]
    }
  }
}
```

### File Upload
`POST /api/v1/exercises/{id}/upload` (multipart/form-data, field: `file`)

---

## 4. Other Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/exercises/{id}` | Get exercise (answers stripped for students) |
| PUT | `/exercises/{id}` | Update exercise title/config/sort_order |
| DELETE | `/exercises/{id}` | Delete exercise + questions + test cases |
| GET | `/exercises?exercise_type=&lesson_id=&search=&page=&per_page=` | List/search |
| GET | `/exercises/by-lesson/{lesson_id}` | All exercises for a lesson |
| PUT | `/exercises/{id}/questions/{qid}` | Update question |
| DELETE | `/exercises/{id}/questions/{qid}` | Delete question |
| DELETE | `/exercises/{id}/test-cases/{tcid}` | Delete test case |
| GET | `/exercises/{id}/submissions?page=&per_page=` | List submissions |
| GET | `/exercises/submissions/{sid}/download` | Download file submission |

## 5. Grading

- **Quiz**: earned_points / total_points * 100. Pass = score >= passing_score (default 70)
- **Code**: total_passed / total_tests * 100. Pass = all tests pass
- **Interactive**: type-specific scoring. Pass = score >= 0.7
  - Matching: correct_pairs / total_pairs
  - Ordering: items in correct position / total
  - Fill blanks: correct blanks / total (case-insensitive)
  - True/false: binary 1.0 or 0.0
  - Categorize: correct_items / total_items

## 6. XP Awards

- Quiz pass: +25 XP
- Code challenge pass: +50 XP
- Interactive pass: +25 XP
