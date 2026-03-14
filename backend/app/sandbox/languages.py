# Judge0 language ID mapping
# See: https://ce.judge0.com/languages

LANGUAGE_MAP = {
    "python": {"id": 71, "name": "Python 3", "monaco": "python"},
    "javascript": {"id": 63, "name": "JavaScript (Node.js)", "monaco": "javascript"},
    "typescript": {"id": 74, "name": "TypeScript", "monaco": "typescript"},
    "java": {"id": 62, "name": "Java", "monaco": "java"},
    "cpp": {"id": 54, "name": "C++ (GCC)", "monaco": "cpp"},
    "c": {"id": 50, "name": "C (GCC)", "monaco": "c"},
    "csharp": {"id": 51, "name": "C# (Mono)", "monaco": "csharp"},
    "go": {"id": 60, "name": "Go", "monaco": "go"},
    "rust": {"id": 73, "name": "Rust", "monaco": "rust"},
    "ruby": {"id": 72, "name": "Ruby", "monaco": "ruby"},
    "php": {"id": 68, "name": "PHP", "monaco": "php"},
    "swift": {"id": 83, "name": "Swift", "monaco": "swift"},
    "kotlin": {"id": 78, "name": "Kotlin", "monaco": "kotlin"},
    "scala": {"id": 81, "name": "Scala", "monaco": "scala"},
    "r": {"id": 80, "name": "R", "monaco": "r"},
    "perl": {"id": 85, "name": "Perl", "monaco": "perl"},
    "haskell": {"id": 61, "name": "Haskell", "monaco": "haskell"},
    "lua": {"id": 64, "name": "Lua", "monaco": "lua"},
    "bash": {"id": 46, "name": "Bash", "monaco": "shell"},
    "sql": {"id": 82, "name": "SQL (SQLite)", "monaco": "sql"},
    "pascal": {"id": 67, "name": "Pascal", "monaco": "pascal"},
    "fsharp": {"id": 87, "name": "F# (.NET Core)", "monaco": "fsharp"},
    "elixir": {"id": 57, "name": "Elixir", "monaco": "elixir"},
    "clojure": {"id": 86, "name": "Clojure", "monaco": "clojure"},
    "dart": {"id": 90, "name": "Dart", "monaco": "dart"},
    "groovy": {"id": 88, "name": "Groovy", "monaco": "groovy"},
    "objective_c": {"id": 79, "name": "Objective-C", "monaco": "objective-c"},
    "fortran": {"id": 59, "name": "Fortran", "monaco": "fortran"},
    "cobol": {"id": 77, "name": "COBOL", "monaco": "cobol"},
    "prolog": {"id": 69, "name": "Prolog", "monaco": "prolog"},
    "lisp": {"id": 55, "name": "Common Lisp", "monaco": "lisp"},
    "erlang": {"id": 58, "name": "Erlang", "monaco": "erlang"},
    "ocaml": {"id": 65, "name": "OCaml", "monaco": "ocaml"},
    "d": {"id": 56, "name": "D", "monaco": "d"},
    "assembly": {"id": 45, "name": "Assembly (NASM)", "monaco": "asm"},
    "vbnet": {"id": 84, "name": "Visual Basic.NET", "monaco": "vb"},
    "plain_text": {"id": 43, "name": "Plain Text", "monaco": "plaintext"},
}


def get_all_languages() -> list[dict]:
    """Return list of all supported languages."""
    return [
        {"key": key, "name": info["name"], "monaco": info["monaco"]}
        for key, info in sorted(LANGUAGE_MAP.items(), key=lambda x: x[1]["name"])
    ]


def get_judge0_id(language: str) -> int | None:
    """Get Judge0 language ID for a language key."""
    info = LANGUAGE_MAP.get(language)
    return info["id"] if info else None
