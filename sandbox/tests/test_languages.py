"""Every language the product offers must actually run.

Two of the five do not, for two unrelated reasons, and both are invisible from
the outside: Java is stopped by an address-space limit that bounds the wrong
quantity, and Go and C++ are stopped by their compiled binary landing on a
`noexec` mount. A pupil sees a virtual machine failing to initialise, or a
permission error, for a program that is correct.
"""

from __future__ import annotations

import pytest

# One program per language, each printing the same thing, so a failure is about
# the language and never about the program.
HELLO = {
    "python": "print(42)",
    "javascript": "console.log(42)",
    "java": (
        "public class Main {\n"
        "    public static void main(String[] args) {\n"
        "        System.out.println(42);\n"
        "    }\n"
        "}\n"
    ),
    "cpp": (
        "#include <iostream>\n"
        "int main() {\n"
        "    std::cout << 42 << std::endl;\n"
        "    return 0;\n"
        "}\n"
    ),
    "go": ('package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println(42)\n}\n'),
}


@pytest.mark.parametrize("language", sorted(HELLO))
def test_a_correct_program_returns_its_output(run_code, language):
    """At the platform's default allowance, which is the whole point.

    Nothing here is exotic — it prints a number. If this fails, the language is
    advertised and does not work.
    """
    result = run_code(language, HELLO[language], timeout_seconds=30, memory_limit_mb=256)

    assert result["stdout"].strip() == "42", (
        f"{language} did not produce its output. "
        f"status={result['status']} stderr={result['stderr'][:400]}"
    )
    assert result["status"] == "success"
    assert result["limit_hit"] is None


def test_go_compiles_within_the_product_default_allowance(run_code):
    """The default is 10 seconds, and compilation now shares it.

    Go's build cache sits on a tmpfs, so it is empty every time the container
    starts. Measured cold in the QA container: 8.0s to build, against the 5s
    half-share that a 10-second exercise gives compilation. Without the startup
    warm-up, the first pupil to try a Go exercise after any deploy timed out and
    the second was fine — a bug that hides itself the moment anyone looks.

    Run against a freshly started container this fails if the warm-up is
    removed, which is the only condition under which it can fail at all.
    """
    result = run_code("go", HELLO["go"], timeout_seconds=10, memory_limit_mb=256)

    assert result["limit_hit"] is None, (
        "Go did not finish inside the default allowance — the build cache is "
        f"probably cold. stderr={result['stderr'][:300]}"
    )
    assert result["stdout"].strip() == "42"
