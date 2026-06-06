from typing import Any

from fastapi import FastAPI

app = FastAPI()


@app.get("/")
def read_root() -> dict[str, str]:
    return {"message": "Hello, World!"}


@app.post("/events")
def read_event(event: dict[str, Any]) -> dict[str, Any]:
    return event
