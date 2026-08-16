"""Who a pupil's program runs as.

Every other control in this feature bounds what a program may consume or reach.
This one bounds what it inherits if one of those controls has a hole: a runtime
escape landing on an unprivileged account inside a locked-down container is a
different afternoon from one landing on root.

Nothing a pupil can see changes. That is the point — this is the control that
costs nothing when it is right and matters only on the day something else is
wrong.
"""

from __future__ import annotations

import pytest

WHO_AM_I = {
    "python": "import os, pwd\nprint(pwd.getpwuid(os.geteuid()).pw_name, os.geteuid())\n",
    "javascript": "console.log(process.getuid())\n",
}


def test_a_program_does_not_run_as_root(run_code):
    result = run_code("python", WHO_AM_I["python"], timeout_seconds=15)

    reported = result["stdout"].strip()
    assert reported, f"the program produced nothing: stderr={result['stderr'][:200]}"
    name, _, uid = reported.partition(" ")
    assert name != "root" and uid != "0", f"a pupil's program ran as root: {reported!r}"


@pytest.mark.parametrize("language", sorted(WHO_AM_I))
def test_every_runtime_agrees_on_the_user(run_code, language):
    """One language switching users while another does not would be worse than
    either answer on its own, and is exactly what a per-runtime wrapper script or
    a stray `sudo` would produce."""
    result = run_code(language, WHO_AM_I[language], timeout_seconds=30)

    assert "0" not in result["stdout"].split(), (
        f"{language} reported uid 0: {result['stdout'].strip()!r}"
    )
