# /// script
# requires-python = ">=3.10"
# dependencies = ["boto3>=1.35"]
# ///
# pyright: basic
# boto3 ships only partial type information for its dynamic clients, so the
# harness client and its streaming response are loosely typed here.
"""Invoke an AgentCore harness and stream the reply.

Runs two turns with the SAME runtimeSessionId. The first asks a question that
needs current information, so the agent calls the Gateway-backed `web_search`
tool; the second is a follow-up answered from the managed short-term memory of
that result (it is never re-sent). Tool invocations are surfaced inline as
``[tool: ...]`` so you can see the web search fire.

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
        if "contentBlockStart" in event:
            tool = event["contentBlockStart"].get("start", {}).get("toolUse")
            if tool:
                print(f"\n  [tool: {tool.get('name')}]", flush=True)
        elif "contentBlockDelta" in event:
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
    # loads the prior history (and the search results) from memory before
    # reasoning on the follow-up.
    session_id = f"{uuid.uuid4().hex}{uuid.uuid4().hex}"

    stream(
        client,
        harness_arn,
        session_id,
        "Use web search to find the latest stable Terraform release version, "
        "then answer with the version number and cite the source URL.",
    )
    stream(
        client,
        harness_arn,
        session_id,
        "Without searching again, what version did you just report?",
    )


if __name__ == "__main__":
    main()
