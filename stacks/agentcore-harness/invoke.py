# /// script
# requires-python = ">=3.10"
# dependencies = ["boto3>=1.35"]
# ///
# pyright: basic
# boto3 ships only partial type information for its dynamic clients, so the
# harness client and its streaming response are loosely typed here.
"""Invoke an AgentCore harness and stream the reply.

Runs two turns with the SAME runtimeSessionId to show that the harness's managed
short-term memory carries the conversation: the second turn asks about something
stated in the first, and it is never re-sent.

Usage:
    uv run --script invoke.py <harnessArn> [region]
"""

from __future__ import annotations

import sys
import uuid

import boto3


def stream(client, harness_arn: str, session_id: str, text: str) -> None:
    print(f"\n>>> {text}")
    response = client.invoke_harness(
        harnessArn=harness_arn,
        runtimeSessionId=session_id,
        messages=[{"role": "user", "content": [{"text": text}]}],
    )
    for event in response["stream"]:
        if "contentBlockDelta" in event:
            delta = event["contentBlockDelta"].get("delta", {})
            if "text" in delta:
                print(delta["text"], end="", flush=True)
        elif "runtimeClientError" in event:
            print(f"\n[error] {event['runtimeClientError']['message']}")
    print()


def main() -> None:
    if len(sys.argv) < 2:
        sys.exit("usage: uv run --script invoke.py <harnessArn> [region]")
    harness_arn = sys.argv[1]
    region = sys.argv[2] if len(sys.argv) > 2 else "us-east-1"

    client = boto3.client("bedrock-agentcore", region_name=region)

    # The session id must be >= 33 chars; reuse it across turns so the harness
    # loads the prior history from memory before reasoning.
    session_id = f"{uuid.uuid4().hex}{uuid.uuid4().hex}"

    stream(client, harness_arn, session_id, "Hi! My name is Ikuma. Please remember it.")
    stream(client, harness_arn, session_id, "What is my name?")


if __name__ == "__main__":
    main()
