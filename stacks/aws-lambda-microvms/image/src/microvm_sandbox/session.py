"""The in-guest session state shared by the traffic and hooks servers.

A single :class:`Session` instance lives for the life of the MicroVM. Its
``namespace`` (the variables a caller builds up with ``/exec``) sits in memory,
so it is preserved by the Firecracker memory snapshot across **suspend/resume** —
this is what lets a MicroVM hold an interactive session open for hours at low
idle cost. The lifecycle hooks mutate this same object: ``/run`` starts a fresh
session (every MicroVM resumes from the *shared* build snapshot, so per-session
state must be reset), while ``/resume`` only bumps a counter and would be where
you reseed randomness or re-open connections that should not outlive a snapshot.
"""

from __future__ import annotations

import contextlib
import io
import traceback
from dataclasses import dataclass


@dataclass
class ExecResult:
    """Outcome of one ``/exec`` call."""

    ok: bool
    stdout: str
    error: str | None


class Session:
    """Mutable per-MicroVM session state."""

    def __init__(self) -> None:
        self.namespace: dict[str, object] = {}
        self.exec_count: int = 0
        self.resume_count: int = 0
        self.run_payload: str | None = None
        # Flipped on once the app is serving; gates the build-time /ready hook.
        self.ready: bool = False

    def start(self, run_payload: str | None) -> None:
        """(Re)initialize the session — called from the ``/run`` hook.

        Resets ``namespace`` so a MicroVM launched from the shared snapshot does
        not inherit another session's variables.
        """
        self.namespace = {"__name__": "__sandbox__"}
        self.exec_count = 0
        self.resume_count = 0
        self.run_payload = run_payload

    def run_code(self, code: str) -> ExecResult:
        """Execute ``code`` in the persistent namespace, capturing its output.

        Exceptions in caller code are returned as ``error`` rather than raised —
        a failing snippet is a normal result for a code sandbox, not a 500.
        """
        buffer = io.StringIO()
        try:
            with contextlib.redirect_stdout(buffer), contextlib.redirect_stderr(buffer):
                exec(code, self.namespace)  # the MicroVM is the sandbox boundary
        except Exception:
            return ExecResult(
                ok=False, stdout=buffer.getvalue(), error=traceback.format_exc()
            )
        else:
            return ExecResult(ok=True, stdout=buffer.getvalue(), error=None)
        finally:
            self.exec_count += 1

    def variables(self) -> list[str]:
        """User-defined names currently in the session (dunders hidden)."""
        return sorted(name for name in self.namespace if not name.startswith("__"))


# One session per MicroVM process, imported by both servers.
SESSION = Session()
