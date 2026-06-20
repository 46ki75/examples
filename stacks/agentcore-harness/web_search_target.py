# /// script
# requires-python = ">=3.10"
# dependencies = ["boto3>=1.43"]
# ///
# pyright: basic
"""Create or delete the Gateway's built-in "web-search" connector target.

Neither the native ``aws_bedrockagentcore_gateway_target`` resource nor the
bundled ``aws`` CLI model the ``connector`` target type yet (only lambda /
api_gateway / mcp_server / open_api_schema / smithy_model), so Terraform shells
out to this helper. It runs as a self-contained PEP 723 script via
``uv run --script``, which builds an isolated env from the inline boto3 pin
above — new enough to know the ``connector`` shape.

Usage:
    uv run --script web_search_target.py create --region us-east-1 --gateway-id <id>
    uv run --script web_search_target.py delete --region us-east-1 --gateway-id <id>
"""

from __future__ import annotations

import argparse
import time

import boto3
from botocore.exceptions import ClientError

CONNECTOR_ID = "web-search"
TOOL_NAME = "WebSearch"
_TERMINAL_OK = "READY"
_TERMINAL_FAIL = {"FAILED", "CREATE_PENDING_AUTH", "UPDATE_UNSUCCESSFUL"}


def _client(region: str):
    return boto3.client("bedrock-agentcore-control", region_name=region)


def _find_target_id(client, gateway_id: str, name: str) -> str | None:
    next_token: str | None = None
    while True:
        kwargs = {"gatewayIdentifier": gateway_id}
        if next_token:
            kwargs["nextToken"] = next_token
        resp = client.list_gateway_targets(**kwargs)
        for item in resp.get("items", []):
            if item.get("name") == name:
                return item.get("targetId")
        next_token = resp.get("nextToken")
        if not next_token:
            return None


def _wait_ready(client, gateway_id: str, target_id: str, timeout: int = 180) -> None:
    deadline = time.monotonic() + timeout
    while True:
        resp = client.get_gateway_target(
            gatewayIdentifier=gateway_id, targetId=target_id
        )
        status = resp.get("status")
        if status == _TERMINAL_OK:
            print(f"target {target_id} is READY")
            return
        if status in _TERMINAL_FAIL:
            reasons = resp.get("statusReasons") or []
            raise SystemExit(
                f"target {target_id} did not become READY: {status} {reasons}"
            )
        if time.monotonic() > deadline:
            raise SystemExit(
                f"timed out after {timeout}s waiting for {target_id} (last status: {status})"
            )
        time.sleep(3)


def create(args: argparse.Namespace) -> None:
    client = _client(args.region)
    target_id = _find_target_id(client, args.gateway_id, args.name)
    if target_id:
        print(f"target {args.name!r} already exists ({target_id}); ensuring READY")
    else:
        parameter_values: dict[str, object] = {}
        if args.exclude_domain:
            parameter_values["domainFilter"] = {"exclude": args.exclude_domain}
        resp = client.create_gateway_target(
            gatewayIdentifier=args.gateway_id,
            name=args.name,
            targetConfiguration={
                "mcp": {
                    "connector": {
                        "source": {"connectorId": CONNECTOR_ID},
                        "configurations": [
                            {"name": TOOL_NAME, "parameterValues": parameter_values}
                        ],
                    }
                }
            },
            credentialProviderConfigurations=[
                {"credentialProviderType": "GATEWAY_IAM_ROLE"}
            ],
        )
        target_id = resp["targetId"]
        print(f"created target {args.name!r} ({target_id})")
    _wait_ready(client, args.gateway_id, target_id)


def _wait_deleted(client, gateway_id: str, target_id: str, timeout: int = 180) -> None:
    """Block until the target is fully gone (GetGatewayTarget 404s).

    DeleteGatewayTarget is async — the target lingers in `Deleting` for a bit.
    If we returned immediately, Terraform would move on to delete the Gateway,
    whose own deletion also reaps targets and fails on one already `Deleting`
    ("DeleteGatewayTarget can't be performed when in Deleting state"). Waiting
    here serializes the two deleters: by the time the Gateway is deleted, it has
    no targets left to reap.
    """
    deadline = time.monotonic() + timeout
    while True:
        try:
            resp = client.get_gateway_target(
                gatewayIdentifier=gateway_id, targetId=target_id
            )
        except ClientError as err:
            if err.response.get("Error", {}).get("Code") == "ResourceNotFoundException":
                print(f"target {target_id} deleted")
                return
            raise
        if time.monotonic() > deadline:
            raise SystemExit(
                f"timed out after {timeout}s waiting for {target_id} to delete "
                f"(last status: {resp.get('status')})"
            )
        time.sleep(3)


def delete(args: argparse.Namespace) -> None:
    client = _client(args.region)
    target_id = _find_target_id(client, args.gateway_id, args.name)
    if not target_id:
        print(f"target {args.name!r} not found; nothing to delete")
        return
    client.delete_gateway_target(gatewayIdentifier=args.gateway_id, targetId=target_id)
    print(f"deleting target {args.name!r} ({target_id})")
    _wait_deleted(client, args.gateway_id, target_id)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Manage the web-search gateway target."
    )
    sub = parser.add_subparsers(dest="command", required=True)

    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--region", required=True)
    common.add_argument("--gateway-id", required=True)
    common.add_argument("--name", default="web-search-tool")

    create_parser = sub.add_parser("create", parents=[common])
    create_parser.add_argument("--exclude-domain", action="append", default=[])
    create_parser.set_defaults(func=create)

    delete_parser = sub.add_parser("delete", parents=[common])
    delete_parser.set_defaults(func=delete)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
