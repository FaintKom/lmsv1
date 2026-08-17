# `needs_exec` marks a language whose run command *is* a file the compiler just
# produced. Those two need a working directory that permits execution; the other
# three run through an interpreter or a VM that lives in the image, so their
# scratch space stays mounted noexec. See sandbox/runner/executor.py.
LANGUAGES = {
    "python": {
        "extension": ".py",
        "compile_cmd": None,
        "run_cmd": "python3 {file}",
    },
    "javascript": {
        "extension": ".js",
        "compile_cmd": None,
        "run_cmd": "node {file}",
    },
    "java": {
        "extension": ".java",
        "compile_cmd": "javac {file}",
        "run_cmd": "java -cp {dir} Main",
        "filename": "Main.java",
    },
    "cpp": {
        "extension": ".cpp",
        "compile_cmd": "g++ -o {dir}/a.out {file} -std=c++17",
        "run_cmd": "{dir}/a.out",
        "needs_exec": True,
    },
    "go": {
        "extension": ".go",
        "compile_cmd": "go build -o {dir}/a.out {file}",
        "run_cmd": "{dir}/a.out",
        "needs_exec": True,
    },
}
