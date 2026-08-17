"""What a pupil's program can reach.

The internet route is already closed — the sandbox sits on a network with
`internal: true`. The route that is open is the one nobody looked at: the
backend shares `sandbox-net`, so a pupil's program can open a socket to our own
API. It needs no credentials to be worth closing; an unauthenticated attack
surface reachable from arbitrary pupil code is a surface.
"""

from __future__ import annotations

# The backend's address inside sandbox-net, exactly as the compose files name it.
CONNECT_TO_OUR_API = (
    "import socket\n"
    "try:\n"
    "    s = socket.create_connection(('backend', 8000), timeout=3)\n"
    "    print('CONNECTED')\n"
    "    s.close()\n"
    "except Exception as exc:\n"
    "    print('refused:', type(exc).__name__)\n"
)

LISTEN_FOR_CONNECTIONS = (
    "import socket\n"
    "try:\n"
    "    s = socket.socket()\n"
    "    s.bind(('0.0.0.0', 9099))\n"
    "    s.listen(1)\n"
    "    print('LISTENING')\n"
    "    s.close()\n"
    "except Exception as exc:\n"
    "    print('refused:', type(exc).__name__)\n"
)


def test_a_program_cannot_reach_our_own_api(run_code):
    """Expected to print CONNECTED today. That is the finding."""
    result = run_code("python", CONNECT_TO_OUR_API, timeout_seconds=15)

    assert "CONNECTED" not in result["stdout"], (
        "a pupil's program opened a socket to the platform's own backend. "
        f"stdout={result['stdout'].strip()!r}"
    )


def test_a_listening_program_can_still_not_be_reached(run_code):
    """A pupil may listen. Nothing can dial them, which is what matters.

    FR-011 originally said listening must be impossible, and it cannot be: the
    filter applies to every process in the container and the runner is a web
    server, so denying `bind` stopped the service starting at all. The spec now
    records that, and this test pins the property that actually holds — one
    program listens, another cannot reach it, so the listener is talking to
    nobody.

    Written this way rather than deleted, because "we could not enforce that"
    and "nothing enforces that" are different claims and only one of them is
    true here.
    """
    listener = run_code("python", LISTEN_FOR_CONNECTIONS, timeout_seconds=15)
    assert "LISTENING" in listener["stdout"], (
        "the premise changed: binding is now refused, so this test is asserting "
        f"the wrong thing. stdout={listener['stdout'].strip()!r}"
    )

    dial_the_listener = (
        "import socket\n"
        "try:\n"
        "    socket.create_connection(('127.0.0.1', 9099), timeout=2)\n"
        "    print('REACHED')\n"
        "except Exception as exc:\n"
        "    print('refused:', type(exc).__name__)\n"
    )
    caller = run_code("python", dial_the_listener, timeout_seconds=15)
    assert "REACHED" not in caller["stdout"], (
        "one program in the sandbox dialled another. Outbound connection is "
        f"supposed to be denied. stdout={caller['stdout'].strip()!r}"
    )
