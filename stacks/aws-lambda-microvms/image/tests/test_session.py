"""Unit tests for the in-guest session logic (no AWS, no network)."""

from __future__ import annotations

from microvm_sandbox.session import Session


def test_namespace_persists_across_exec() -> None:
    session = Session()
    session.start(run_payload=None)

    session.run_code("x = 41")
    result = session.run_code("print(x + 1)")

    assert result.ok
    assert result.stdout.strip() == "42"
    assert session.exec_count == 2
    assert "x" in session.variables()


def test_exception_is_returned_not_raised() -> None:
    session = Session()
    session.start(run_payload=None)

    result = session.run_code("1 / 0")

    assert not result.ok
    assert result.error is not None
    assert "ZeroDivisionError" in result.error


def test_start_resets_namespace() -> None:
    session = Session()
    session.start(run_payload="first")
    session.run_code("leftover = 1")

    session.start(run_payload="second")

    assert session.variables() == []
    assert session.exec_count == 0
    assert session.run_payload == "second"
