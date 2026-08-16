"""The memory allowance has to bound memory, and say so when it bites.

Today it bounds address space instead, which is the wrong quantity twice over:
it stops runtimes that reserve without using, and it lets a program that really
does allocate too much die with a message about virtual machines.

Numbers here are deliberately small. The QA container's own cap is 256MB
(`memory.max` = 268435456), so a test that allocated 400MB would be refused by
the container no matter what the per-execution allowance said — and the control
would fail for a reason that has nothing to do with what is being tested.
Allocating 120MB keeps both the refusal and the control inside that cap.
"""

from __future__ import annotations

ALLOCATE_120MB = (
    "b = bytearray(120 * 1024 * 1024)\n"
    "for i in range(0, len(b), 4096):\n"  # touch it, so it is real memory
    "    b[i] = 1\n"
    "print('allocated', len(b))\n"
)


def test_a_program_over_its_allowance_is_refused_and_a_smaller_one_is_not(run_code):
    """The refusal and its control, in one test on purpose.

    Without the control this passes on any machine that happens to be short of
    memory, for a reason that has nothing to do with the allowance. That is the
    shape of a test that cannot fail — constitution principle II — and it is
    worth four extra lines to close it.
    """
    refused = run_code("python", ALLOCATE_120MB, timeout_seconds=30, memory_limit_mb=64)
    assert refused["limit_hit"] == "memory", (
        "a 120MB allocation was not refused at a 64MB allowance. "
        f"status={refused['status']} stderr={refused['stderr'][:300]}"
    )
    assert "allocated" not in refused["stdout"]

    # The control. Same program, an allowance that fits it, still inside the
    # container's own 256MB cap.
    allowed = run_code("python", ALLOCATE_120MB, timeout_seconds=30, memory_limit_mb=200)
    assert allowed["limit_hit"] is None, (
        "the control was refused too, so the first assertion proves nothing "
        f"about the allowance. stderr={allowed['stderr'][:300]}"
    )
    assert allowed["stdout"].strip().startswith("allocated")


def test_the_pupil_is_told_which_allowance_they_exceeded(run_code):
    """FR-002.

    A pupil who allocates too much should read that they ran out of their memory
    allowance. What they must not read is a runtime failing to initialise —
    that is what happens today for programs that are *correct*, and it is the
    single most confusing message this service produces.
    """
    refused = run_code("python", ALLOCATE_120MB, timeout_seconds=30, memory_limit_mb=64)

    assert refused["limit_hit"] == "memory"
    # The specific wordings that reached pupils for correct programs. None of
    # them is an acceptable way to say "you used too much memory".
    for runtime_noise in (
        "Could not reserve enough space",
        "failed to reserve page summary memory",
        "code cache",
    ):
        assert runtime_noise.lower() not in refused["stderr"].lower(), (
            f"the pupil was shown a runtime initialisation error: {runtime_noise}"
        )
