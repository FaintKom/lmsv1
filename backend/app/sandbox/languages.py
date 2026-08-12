# Languages offered to the language pickers in the editor and the challenge
# builder (frontend/src/components/code-editor/*, exercise-renderer.tsx).
#
# This list used to carry 37 Judge0 entries, a leftover from before the
# self-hosted runner. Only five of them ever ran, so a student could pick Rust
# and get "Unsupported language: rust" the moment they pressed Run. The keys
# now come from SUPPORTED_LANGUAGES, which is what execute() actually checks —
# adding a runner language is the only way to add a picker entry.

from app.sandbox.executor import SUPPORTED_LANGUAGES

# Display name + Monaco grammar id per executable language.
LANGUAGE_MAP = {
    "python": {"name": "Python 3", "monaco": "python"},
    "javascript": {"name": "JavaScript (Node.js)", "monaco": "javascript"},
    "java": {"name": "Java", "monaco": "java"},
    "cpp": {"name": "C++ (GCC)", "monaco": "cpp"},
    "go": {"name": "Go", "monaco": "go"},
}


def get_all_languages() -> list[dict]:
    """Languages the sandbox can actually execute, sorted by display name."""
    return sorted(
        (
            {"key": key, "name": LANGUAGE_MAP[key]["name"], "monaco": LANGUAGE_MAP[key]["monaco"]}
            for key in SUPPORTED_LANGUAGES
        ),
        key=lambda entry: entry["name"],
    )
