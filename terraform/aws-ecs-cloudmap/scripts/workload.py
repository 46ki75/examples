"""Measure the deployed Caddy request path without retries hiding failures."""

import argparse
import concurrent.futures
import http.client
import json
import math
import time
import urllib.error
import urllib.request
from collections import Counter
from datetime import datetime, timezone
from typing import Any

from smoke import command_json


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--requests", type=int, default=1800)
    parser.add_argument("--rate", type=float, default=30)
    parser.add_argument("--concurrency", type=int, default=16)
    parser.add_argument("--allow-errors", action="store_true")
    args = parser.parse_args()
    if (
        args.requests < 1
        or not math.isfinite(args.rate)
        or args.rate <= 0
        or args.concurrency < 1
    ):
        parser.error("requests, rate, and concurrency must be positive")

    values = {
        key: item["value"]
        for key, item in command_json("terraform", "output", "-json").items()
    }
    url = values["api_url"]

    def discover_zones() -> dict[str, str]:
        result = command_json(
            "aws",
            "servicediscovery",
            "discover-instances",
            "--region",
            values["region"],
            "--namespace-name",
            values["cloudmap_namespace"],
            "--service-name",
            values["cloudmap_service_name"],
            "--health-status",
            "ALL",
            "--output",
            "json",
            "--no-cli-pager",
        )
        return {
            "ip-" + item["Attributes"]["AWS_INSTANCE_IPV4"].replace(".", "-"): item[
                "Attributes"
            ]["AVAILABILITY_ZONE"]
            for item in result["Instances"]
        }

    zones = discover_zones()

    def request(index: int) -> tuple[str, str, float]:
        method = "GET" if index % 2 == 0 else "POST"
        started = time.monotonic()
        backend = ""
        try:
            req = urllib.request.Request(
                f"{url}/workload/request?sequence={index}", method=method
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                body = response.read().decode()
                backend = response.headers.get("X-Backend-Id", "")
                fields = dict(line.split("=", 1) for line in body.splitlines()[1:])
                valid = (
                    body.startswith("Hello from Caddy on ECS!\n")
                    and bool(backend)
                    and fields.get("instance") == backend
                    and fields.get("method") == method
                    and fields.get("path") == "/workload/request"
                    and fields.get("query") == f"sequence={index}"
                )
                status = str(response.status) if valid else "invalid-response"
        except urllib.error.HTTPError as error:
            status = str(error.code)
            error.close()
        except (OSError, http.client.HTTPException):
            status = "connection-error"
        except (ValueError, UnicodeError):
            status = "invalid-response"
        return status, backend, (time.monotonic() - started) * 1000

    started_at = datetime.now(timezone.utc).isoformat()
    started = time.monotonic()
    futures: list[concurrent.futures.Future[tuple[str, str, float]]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        for index in range(args.requests):
            time.sleep(max(0, started + index / args.rate - time.monotonic()))
            futures.append(pool.submit(request, index))
        results = [future.result() for future in futures]
    elapsed = time.monotonic() - started
    zones.update(discover_zones())
    statuses = Counter(result[0] for result in results)
    backends = Counter(result[1] for result in results if result[0] == "200")
    by_zone: Counter[str] = Counter()
    for backend, count in backends.items():
        by_zone[zones.get(backend.split(".")[0], "unknown")] += count
    latencies = sorted(result[2] for result in results if result[0] == "200")

    def percentile(fraction: float) -> float | None:
        return (
            round(latencies[math.ceil(len(latencies) * fraction) - 1], 2)
            if latencies
            else None
        )

    report: dict[str, Any] = {
        "started_at": started_at,
        "api_url": url,
        "requests": args.requests,
        "target_requests_per_second": args.rate,
        "elapsed_seconds": round(elapsed, 2),
        "completed_requests_per_second": round(len(results) / elapsed, 2),
        "max_concurrency": args.concurrency,
        "statuses": dict(statuses),
        "successful_request_latency_ms": {
            "p50": percentile(0.5),
            "p95": percentile(0.95),
            "p99": percentile(0.99),
        },
        "requests_by_backend": dict(backends),
        "requests_by_az": dict(by_zone),
    }
    print(json.dumps(report, indent=2), flush=True)
    assert set(by_zone) == set(values["availability_zones"]), (
        "Traffic did not reach every selected AZ"
    )
    if not args.allow_errors:
        assert statuses["200"] == args.requests, (
            "Workload requests failed; see status counts above"
        )


if __name__ == "__main__":
    main()
