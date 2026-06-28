"""Data-plane app: the code-execution sandbox (served on traffic port 8080).

Callers reach these routes through the MicroVM's HTTPS endpoint, which forwards
to port 8080 by default. The whole surface is one MicroVM = one session: state
built up here persists in memory across suspend/resume.
"""

from __future__ import annotations

from fastapi import FastAPI
from pydantic import BaseModel

from .session import SESSION

app = FastAPI(title="MicroVM code-exec sandbox")


class ExecRequest(BaseModel):
    code: str


class ExecResponse(BaseModel):
    ok: bool
    stdout: str
    error: str | None = None
    exec_count: int


@app.post("/exec")
def exec_code(request: ExecRequest) -> ExecResponse:
    """Run a snippet in the persistent session namespace."""
    result = SESSION.run_code(request.code)
    return ExecResponse(
        ok=result.ok,
        stdout=result.stdout,
        error=result.error,
        exec_count=SESSION.exec_count,
    )


@app.get("/state")
def state() -> dict[str, object]:
    """Inspect the live session — handy for showing state survives resume."""
    return {
        "exec_count": SESSION.exec_count,
        "resume_count": SESSION.resume_count,
        "run_payload": SESSION.run_payload,
        "variables": SESSION.variables(),
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
