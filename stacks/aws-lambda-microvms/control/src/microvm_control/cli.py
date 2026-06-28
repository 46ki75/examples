# boto3 ships only partial type information for its dynamic clients, so this
# module opts down to basic type checking (the repo convention for boto3 code).
# pyright: basic
"""Command-line driver for the Lambda MicroVMs lifecycle.

Subcommands map onto the ``lambda-microvms`` control plane plus the MicroVM's
data-plane HTTPS endpoint:

    build      zip image/ -> S3 -> create-microvm-image, wait for CREATED
    run        run-microvm (returns a microvmId + endpoint)
    status     get-microvm
    wait       poll get-microvm until a target state
    token      create-microvm-auth-token
    exec       POST /exec to the running sandbox
    suspend    suspend-microvm
    resume     resume-microvm
    terminate  terminate-microvm
    demo       run -> exec -> suspend -> resume -> exec -> terminate end to end

The id of the most recently run MicroVM is cached in ./.microvm-last.json, so
most subcommands default to it when --microvm-id is omitted.
"""

from __future__ import annotations

import argparse
import io
import json
import os
import sys
import time
import zipfile
from pathlib import Path
from typing import Any

import boto3
import httpx

SERVICE = "lambda-microvms"
DEFAULT_REGION = os.environ.get("AWS_REGION", "us-east-1")
DEFAULT_IMAGE_DIR = "stacks/aws-lambda-microvms/image"
CONTROL_PORT = 9000  # must match hooks.port baked into the image
TRAFFIC_PORT = 8080  # default MicroVM routing target
STATE_FILE = Path(".microvm-last.json")

# Terminal states we poll toward.
RUNNING = "RUNNING"
SUSPENDED = "SUSPENDED"
TERMINATED = "TERMINATED"


# --------------------------------------------------------------------------- #
# helpers
# --------------------------------------------------------------------------- #
def _client(region: str) -> Any:
    return boto3.client(SERVICE, region_name=region)


def _print(obj: Any) -> None:
    print(json.dumps(obj, indent=2, default=str))


def _save_last(microvm_id: str, region: str) -> None:
    STATE_FILE.write_text(json.dumps({"microvmId": microvm_id, "region": region}))


def _resolve_id(microvm_id: str | None) -> str:
    if microvm_id:
        return microvm_id
    if STATE_FILE.exists():
        return json.loads(STATE_FILE.read_text())["microvmId"]
    sys.exit("no --microvm-id given and no ./.microvm-last.json to fall back to")


def _zip_image(image_dir: Path) -> bytes:
    """Zip the Dockerfile (at the root) and src/ — the image build context."""
    dockerfile = image_dir / "Dockerfile"
    src = image_dir / "src"
    if not dockerfile.is_file():
        sys.exit(f"no Dockerfile in {image_dir}")
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.write(dockerfile, "Dockerfile")
        for path in sorted(src.rglob("*")):
            if path.is_file() and "__pycache__" not in path.parts:
                archive.write(path, str(path.relative_to(image_dir)))
    return buffer.getvalue()


def _poll_microvm(
    client: Any, microvm_id: str, target: str, timeout: int = 300
) -> dict[str, Any]:
    deadline = time.monotonic() + timeout
    while True:
        response = client.get_microvm(microvmIdentifier=microvm_id)
        state = response.get("state")
        print(f"  microvm {microvm_id}: {state}")
        if state == target:
            return response
        if state == TERMINATED and target != TERMINATED:
            sys.exit(f"microvm reached {state} (reason: {response.get('stateReason')})")
        if time.monotonic() > deadline:
            sys.exit(f"timed out waiting for {target} (last state: {state})")
        time.sleep(3)


def _endpoint(client: Any, microvm_id: str) -> str:
    endpoint = client.get_microvm(microvmIdentifier=microvm_id).get("endpoint")
    if not endpoint:
        sys.exit(f"microvm {microvm_id} has no endpoint yet")
    return f"https://{endpoint}"


def _mint_token(client: Any, microvm_id: str, port: int, minutes: int) -> str:
    response = client.create_microvm_auth_token(
        microvmIdentifier=microvm_id,
        expirationInMinutes=minutes,
        allowedPorts=[{"port": port}],
    )
    return response["authToken"]["X-aws-proxy-auth"]


def _post_exec(base_url: str, token: str, code: str, port: int) -> dict[str, Any]:
    response = httpx.post(
        f"{base_url}/exec",
        headers={"X-aws-proxy-auth": token, "X-aws-proxy-port": str(port)},
        json={"code": code},
        timeout=30.0,
    )
    response.raise_for_status()
    return response.json()


def _resolve_image(client: Any, image: str) -> str:
    """Return the image ARN. The get/run ops want a full ARN, not the bare name,
    so a name is looked up in list-microvm-images."""
    if image.startswith("arn:"):
        return image
    for item in client.list_microvm_images().get("items", []):
        if item.get("name") == image:
            return item["imageArn"]
    sys.exit(f"no microvm image named {image!r}")


def _wait_image(client: Any, image_arn: str, timeout: int = 1800) -> None:
    deadline = time.monotonic() + timeout
    while True:
        state = client.get_microvm_image(imageIdentifier=image_arn).get("state")
        print(f"  image: {state}")
        if state and "FAILED" in state:
            sys.exit(f"image build failed ({state})")
        if state not in (None, "CREATING", "PENDING", "BUILDING"):
            return
        if time.monotonic() > deadline:
            sys.exit("timed out waiting for image build")
        time.sleep(10)


# --------------------------------------------------------------------------- #
# commands
# --------------------------------------------------------------------------- #
def cmd_build(args: argparse.Namespace) -> None:
    client = _client(args.region)
    image_dir = Path(args.image_dir)
    payload = _zip_image(image_dir)

    s3 = boto3.client("s3", region_name=args.region)
    key = f"{args.name}.zip"
    print(f"uploading {len(payload)} bytes to s3://{args.artifact_bucket}/{key}")
    s3.put_object(Bucket=args.artifact_bucket, Key=key, Body=payload)

    print(f"creating microvm image {args.name!r}")
    response = client.create_microvm_image(
        name=args.name,
        baseImageArn=args.base_image_arn,
        buildRoleArn=args.build_role_arn,
        codeArtifact={"uri": f"s3://{args.artifact_bucket}/{key}"},
        cpuConfigurations=[{"architecture": "ARM_64"}],
        hooks={
            "port": CONTROL_PORT,
            "microvmImageHooks": {"ready": "ENABLED", "readyTimeoutInSeconds": 30},
            "microvmHooks": {
                "run": "ENABLED",
                "runTimeoutInSeconds": 10,
                "resume": "ENABLED",
                "resumeTimeoutInSeconds": 10,
                "suspend": "ENABLED",
                "suspendTimeoutInSeconds": 10,
                "terminate": "ENABLED",
                "terminateTimeoutInSeconds": 10,
            },
        },
    )
    image_arn = response.get("imageArn") or _resolve_image(client, args.name)

    print(
        f"waiting for image build (logs: CloudWatch /aws/lambda/microvms/{args.name})"
    )
    _wait_image(client, image_arn)
    print(f"image is ready — run it with: microvm-control run --image {image_arn}")


def cmd_run(args: argparse.Namespace) -> None:
    client = _client(args.region)
    request: dict[str, Any] = {
        "imageIdentifier": _resolve_image(client, args.image),
        "idlePolicy": {
            "maxIdleDurationSeconds": args.idle,
            "suspendedDurationSeconds": args.suspended,
            "autoResumeEnabled": True,
        },
        "maximumDurationInSeconds": args.max_duration,
    }
    if args.execution_role_arn:
        request["executionRoleArn"] = args.execution_role_arn
    if args.payload:
        request["runHookPayload"] = args.payload

    response = client.run_microvm(**request)
    _print(response)
    _save_last(response["microvmId"], args.region)


def cmd_status(args: argparse.Namespace) -> None:
    client = _client(args.region)
    _print(client.get_microvm(microvmIdentifier=_resolve_id(args.microvm_id)))


def cmd_wait(args: argparse.Namespace) -> None:
    client = _client(args.region)
    _poll_microvm(client, _resolve_id(args.microvm_id), args.target)


def cmd_token(args: argparse.Namespace) -> None:
    client = _client(args.region)
    print(_mint_token(client, _resolve_id(args.microvm_id), args.port, args.minutes))


def cmd_exec(args: argparse.Namespace) -> None:
    client = _client(args.region)
    microvm_id = _resolve_id(args.microvm_id)
    code = Path(args.file).read_text() if args.file else args.code
    if not code:
        sys.exit("pass --code or --file")
    base_url = _endpoint(client, microvm_id)
    token = _mint_token(client, microvm_id, args.port, minutes=15)
    _print(_post_exec(base_url, token, code, args.port))


def cmd_suspend(args: argparse.Namespace) -> None:
    client = _client(args.region)
    microvm_id = _resolve_id(args.microvm_id)
    client.suspend_microvm(microvmIdentifier=microvm_id)
    _poll_microvm(client, microvm_id, SUSPENDED)


def cmd_resume(args: argparse.Namespace) -> None:
    client = _client(args.region)
    microvm_id = _resolve_id(args.microvm_id)
    client.resume_microvm(microvmIdentifier=microvm_id)
    _poll_microvm(client, microvm_id, RUNNING)


def cmd_terminate(args: argparse.Namespace) -> None:
    client = _client(args.region)
    microvm_id = _resolve_id(args.microvm_id)
    client.terminate_microvm(microvmIdentifier=microvm_id)
    print(f"terminated {microvm_id}")


def cmd_demo(args: argparse.Namespace) -> None:
    """End-to-end showcase: prove session state survives suspend/resume."""
    client = _client(args.region)

    print("== run ==")
    request: dict[str, Any] = {
        "imageIdentifier": _resolve_image(client, args.image),
        "idlePolicy": {
            "maxIdleDurationSeconds": 300,
            "suspendedDurationSeconds": 1800,
            "autoResumeEnabled": True,
        },
        "maximumDurationInSeconds": 3600,
        "runHookPayload": "demo-session",
    }
    if args.execution_role_arn:
        request["executionRoleArn"] = args.execution_role_arn
    run_response = client.run_microvm(**request)
    microvm_id = run_response["microvmId"]
    _save_last(microvm_id, args.region)
    print(f"microvmId={microvm_id} endpoint={run_response.get('endpoint')}")
    _poll_microvm(client, microvm_id, RUNNING)

    base_url = _endpoint(client, microvm_id)
    token = _mint_token(client, microvm_id, TRAFFIC_PORT, minutes=30)

    print("\n== exec: build up some session state ==")
    _print(_post_exec(base_url, token, "counter = 100", TRAFFIC_PORT))
    _print(_post_exec(base_url, token, "counter += 5\nprint(counter)", TRAFFIC_PORT))

    print("\n== suspend ==")
    client.suspend_microvm(microvmIdentifier=microvm_id)
    _poll_microvm(client, microvm_id, SUSPENDED)

    print("\n== resume ==")
    client.resume_microvm(microvmIdentifier=microvm_id)
    _poll_microvm(client, microvm_id, RUNNING)

    print("\n== exec: state survived the snapshot ==")
    _print(_post_exec(base_url, token, "print(counter)", TRAFFIC_PORT))

    print("\n== terminate ==")
    client.terminate_microvm(microvmIdentifier=microvm_id)
    print(f"terminated {microvm_id}")


# --------------------------------------------------------------------------- #
# argument parsing
# --------------------------------------------------------------------------- #
def _add_region(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--region", default=DEFAULT_REGION)


def _add_id(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("--microvm-id", help="defaults to ./.microvm-last.json")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="microvm-control", description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)

    p_build = sub.add_parser("build", help="package image/ and create a MicroVM image")
    _add_region(p_build)
    p_build.add_argument("--name", required=True)
    p_build.add_argument("--artifact-bucket", required=True)
    p_build.add_argument("--build-role-arn", required=True)
    p_build.add_argument(
        "--base-image-arn",
        required=True,
        help="Lambda-managed base, e.g. arn:aws:lambda:<region>:aws:microvm-image:al2023-1 "
        "(discover with `aws lambda-microvms list-managed-microvm-images`)",
    )
    p_build.add_argument("--image-dir", default=DEFAULT_IMAGE_DIR)
    p_build.set_defaults(func=cmd_build)

    p_run = sub.add_parser("run", help="launch a MicroVM from an image")
    _add_region(p_run)
    p_run.add_argument("--image", required=True, help="image name or ARN")
    p_run.add_argument("--execution-role-arn")
    p_run.add_argument("--payload", help="runHookPayload string (<=4096 bytes)")
    p_run.add_argument(
        "--max-duration", type=int, default=3600, help="1..28800 seconds"
    )
    p_run.add_argument("--idle", type=int, default=300, help="maxIdleDurationSeconds")
    p_run.add_argument(
        "--suspended", type=int, default=1800, help="suspendedDurationSeconds"
    )
    p_run.set_defaults(func=cmd_run)

    p_status = sub.add_parser("status", help="get-microvm")
    _add_region(p_status)
    _add_id(p_status)
    p_status.set_defaults(func=cmd_status)

    p_wait = sub.add_parser("wait", help="poll get-microvm until a state")
    _add_region(p_wait)
    _add_id(p_wait)
    p_wait.add_argument("--target", default=RUNNING)
    p_wait.set_defaults(func=cmd_wait)

    p_token = sub.add_parser("token", help="mint a data-plane auth token")
    _add_region(p_token)
    _add_id(p_token)
    p_token.add_argument("--port", type=int, default=TRAFFIC_PORT)
    p_token.add_argument("--minutes", type=int, default=15, help="<=60")
    p_token.set_defaults(func=cmd_token)

    p_exec = sub.add_parser("exec", help="POST code to the sandbox /exec")
    _add_region(p_exec)
    _add_id(p_exec)
    p_exec.add_argument("--code")
    p_exec.add_argument("--file", help="read code from a file instead of --code")
    p_exec.add_argument("--port", type=int, default=TRAFFIC_PORT)
    p_exec.set_defaults(func=cmd_exec)

    for name, func in (
        ("suspend", cmd_suspend),
        ("resume", cmd_resume),
        ("terminate", cmd_terminate),
    ):
        p = sub.add_parser(name, help=f"{name}-microvm")
        _add_region(p)
        _add_id(p)
        p.set_defaults(func=func)

    p_demo = sub.add_parser("demo", help="run->exec->suspend->resume->exec->terminate")
    _add_region(p_demo)
    p_demo.add_argument("--image", required=True, help="image name or ARN")
    p_demo.add_argument("--execution-role-arn")
    p_demo.set_defaults(func=cmd_demo)

    return parser


def main() -> None:
    args = build_parser().parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
