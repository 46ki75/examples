"""Control-plane app: the MicroVM lifecycle hooks (served on control port 9000).

Lambda calls these over HTTP on the port declared as ``hooks.port`` in
``create-microvm-image`` (9000 here — distinct from the 8080 traffic port).
Every hook is a ``POST`` under ``/aws/lambda-microvms/runtime/v1`` and must
return 200 on success; ``/ready`` returns 503 until the app is up so Lambda can
poll it during the build. Because Lambda may retry suspend/terminate, the hooks
are written to be idempotent.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Response
from pydantic import BaseModel

from .session import SESSION

logger = logging.getLogger("microvm.hooks")

app = FastAPI(title="MicroVM lifecycle hooks")

HOOK_PREFIX = "/aws/lambda-microvms/runtime/v1"


class RunRequest(BaseModel):
    # Field names match the JSON Lambda sends to the /run hook.
    microvmId: str | None = None  # noqa: N815 — wire format is camelCase
    runHookPayload: str | None = None  # noqa: N815 — wire format is camelCase


@app.post(f"{HOOK_PREFIX}/ready")
def ready() -> Response:
    """Build-time gate: 200 once the app has initialized, else 503 (Lambda polls)."""
    return Response(status_code=200 if SESSION.ready else 503)


@app.post(f"{HOOK_PREFIX}/validate")
def validate() -> Response:
    """Build-time hook; lets Lambda sample touched snapshot pages to prefetch."""
    return Response(status_code=200)


@app.post(f"{HOOK_PREFIX}/run")
def run(request: RunRequest) -> Response:
    """Fires once per launch before traffic is forwarded; start a fresh session."""
    SESSION.start(request.runHookPayload)
    logger.info(
        "run hook: microvmId=%s payload=%r", request.microvmId, request.runHookPayload
    )
    return Response(status_code=200)


@app.post(f"{HOOK_PREFIX}/resume")
def resume() -> Response:
    """Fires on SUSPENDED->RUNNING; the VM holds in SUSPENDED until this returns 200.

    Session state is preserved by the snapshot, so we keep it and only refresh
    ephemeral things. This is where a real app would reseed RNGs and re-open
    network connections that should not outlive a snapshot.
    """
    SESSION.resume_count += 1
    logger.info("resume hook: resume_count=%d", SESSION.resume_count)
    return Response(status_code=200)


@app.post(f"{HOOK_PREFIX}/suspend")
def suspend() -> Response:
    """Fires before RUNNING->SUSPENDED; flush/checkpoint here."""
    logger.info("suspend hook")
    return Response(status_code=200)


@app.post(f"{HOOK_PREFIX}/terminate")
def terminate() -> Response:
    """Fires before the MicroVM's resources are released."""
    logger.info("terminate hook")
    return Response(status_code=200)
