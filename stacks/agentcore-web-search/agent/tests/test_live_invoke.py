# boto3 ships incomplete type information; this live test opts down to basic.
# pyright: basic
"""Live test: invoke the deployed AgentCore Runtime end to end.

Requires AGENT_RUNTIME_ARN (see Terraform output `agent_runtime_arn`) and AWS
credentials for us-east-1. Costs money (web search + model tokens).
"""

import json
import os
import uuid

import boto3
import pytest


@pytest.mark.live
def test_invoke_deployed_runtime() -> None:  # live: invokes the real runtime
    arn = os.environ.get("AGENT_RUNTIME_ARN")
    if not arn:
        pytest.skip("AGENT_RUNTIME_ARN not set")

    client = boto3.client("bedrock-agentcore", region_name="us-east-1")
    response = client.invoke_agent_runtime(
        agentRuntimeArn=arn,
        qualifier="live",
        runtimeSessionId=uuid.uuid4().hex + uuid.uuid4().hex,
        contentType="application/json",
        accept="application/json",
        payload=json.dumps({"prompt": "What is Amazon Bedrock AgentCore?"}).encode(),
    )

    body = response["response"].read()
    assert body
