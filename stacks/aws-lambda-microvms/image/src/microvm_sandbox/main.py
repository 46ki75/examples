"""Entrypoint: serve the traffic and hooks apps on their two ports concurrently.

Both listeners bind ``0.0.0.0`` — Lambda reaches the hook port from outside the
guest, so a localhost-only listener would be unreachable. The control port must
match ``hooks.port`` passed to ``create-microvm-image`` (9000).
"""

from __future__ import annotations

import asyncio
import logging
import os

import uvicorn

from .hooks import app as hooks_app
from .sandbox import app as sandbox_app
from .session import SESSION

TRAFFIC_PORT = int(os.environ.get("MICROVM_TRAFFIC_PORT", "8080"))
CONTROL_PORT = int(os.environ.get("MICROVM_CONTROL_PORT", "9000"))


async def _serve() -> None:
    sandbox = uvicorn.Server(
        uvicorn.Config(sandbox_app, host="0.0.0.0", port=TRAFFIC_PORT, log_level="info")
    )
    hooks = uvicorn.Server(
        uvicorn.Config(hooks_app, host="0.0.0.0", port=CONTROL_PORT, log_level="info")
    )
    await asyncio.gather(sandbox.serve(), hooks.serve())


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    SESSION.start(None)
    # The app is initialized; let the build-time /ready hook report success.
    SESSION.ready = True
    asyncio.run(_serve())


if __name__ == "__main__":
    main()
