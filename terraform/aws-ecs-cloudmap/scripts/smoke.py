"""Read-only, live checks for the API Gateway / Cloud Map / ECS integration."""

import ipaddress
import json
import subprocess
import time
import urllib.error
import urllib.request
from collections import Counter
from typing import Any


def command_json(*args: str) -> dict[str, Any]:
    return json.loads(subprocess.check_output(args, text=True))


def main() -> None:
    outputs = command_json("terraform", "output", "-json")
    values = {key: item["value"] for key, item in outputs.items()}

    def aws(*args: str) -> dict[str, Any]:
        return command_json(
            "aws",
            *args,
            "--region",
            values["region"],
            "--output",
            "json",
            "--no-cli-pager",
        )

    def discover() -> list[dict[str, Any]]:
        return aws(
            "servicediscovery",
            "discover-instances",
            "--namespace-name",
            values["cloudmap_namespace"],
            "--service-name",
            values["cloudmap_service_name"],
            "--health-status",
            "HEALTHY",
        )["Instances"]

    deadline = time.monotonic() + 180
    while True:
        instances = discover()
        if len(instances) == values["task_count"]:
            break
        if time.monotonic() >= deadline:
            raise RuntimeError(f"Discovery did not converge: {instances}")
        time.sleep(5)

    for instance in instances:
        attributes = instance["Attributes"]
        assert ipaddress.ip_address(attributes["AWS_INSTANCE_IPV4"]).is_private, (
            instance
        )
        assert attributes["AWS_INSTANCE_PORT"] == "8080", instance
        assert instance["HealthStatus"] == "HEALTHY", instance

    task_arns = aws(
        "ecs",
        "list-tasks",
        "--cluster",
        values["ecs_cluster_name"],
        "--service-name",
        values["ecs_service_name"],
        "--desired-status",
        "RUNNING",
    )["taskArns"]
    assert len(task_arns) == values["task_count"], task_arns
    result = aws(
        "ecs",
        "describe-tasks",
        "--cluster",
        values["ecs_cluster_name"],
        "--tasks",
        *task_arns,
    )
    assert not result.get("failures"), result
    tasks = result["tasks"]
    placement = Counter(task["availabilityZone"] for task in tasks)
    assert set(placement) == set(values["availability_zones"]), placement
    assert max(placement.values()) - min(placement.values()) <= 1, placement
    assert {item["Attributes"]["AVAILABILITY_ZONE"] for item in instances} == set(
        placement
    ), instances
    eni_ids: list[str] = []
    for task in tasks:
        assert task["lastStatus"] == "RUNNING", task
        assert task["healthStatus"] == "HEALTHY", task
        for attachment in task["attachments"]:
            for detail in attachment["details"]:
                if detail["name"] == "networkInterfaceId":
                    eni_ids.append(detail["value"])
    assert len(eni_ids) == len(tasks), eni_ids
    enis = aws(
        "ec2", "describe-network-interfaces", "--network-interface-ids", *eni_ids
    )["NetworkInterfaces"]
    assert all(not eni.get("Association", {}).get("PublicIp") for eni in enis), enis
    assert {eni["PrivateIpAddress"] for eni in enis} == {
        instance["Attributes"]["AWS_INSTANCE_IPV4"] for instance in instances
    }, (enis, instances)

    link = aws("apigatewayv2", "get-vpc-link", "--vpc-link-id", values["vpc_link_id"])
    assert link["VpcLinkStatus"] == "AVAILABLE", link
    assert set(link["SubnetIds"]) == set(values["private_subnet_ids"].values()), link
    nat = aws(
        "ec2", "describe-nat-gateways", "--nat-gateway-ids", values["nat_gateway_id"]
    )["NatGateways"][0]
    assert nat["State"] == "available" and nat["AvailabilityMode"] == "regional", nat
    assert nat["AutoProvisionZones"] == "enabled", nat

    base_url = values["api_url"].rstrip("/")

    def request(path: str, method: str = "GET") -> tuple[str, str]:
        # Cloud Map propagation and API Gateway's discovery cache are eventually consistent.
        deadline = time.monotonic() + 180
        while True:
            try:
                req = urllib.request.Request(base_url + path, method=method)
                with urllib.request.urlopen(req, timeout=15) as response:
                    assert response.status == 200, response.status
                    backend = response.headers["X-Backend-Id"]
                    assert backend, response.headers
                    return response.read().decode(), backend
            except (urllib.error.URLError, TimeoutError):
                if time.monotonic() >= deadline:
                    raise
                time.sleep(3)

    health, _ = request("/health")
    assert health == "ok", health
    observed: set[str] = set()
    for path, method in [
        ("/", "GET"),
        ("/nested/path?hello=world&number=42", "GET"),
        ("/nested/path?hello=world&number=42", "POST"),
    ]:
        body, backend = request(path, method)
        observed.add(backend)
        assert "Hello from Caddy on ECS!" in body, body
        fields = dict(line.split("=", 1) for line in body.splitlines()[1:])
        expected_path, _, expected_query = path.partition("?")
        assert fields["instance"] == backend, body
        assert fields["method"] == method, body
        assert fields["path"] == expected_path, body
        assert fields["query"] == expected_query, body
        print(f"PASS {method} {path}: {backend}")

    # Sample rather than assuming strict round-robin scheduling.
    deadline = time.monotonic() + 180
    while len(observed) < values["task_count"] and time.monotonic() < deadline:
        _, backend = request("/")
        observed.add(backend)
        time.sleep(0.5)
    assert len(observed) == values["task_count"], observed
    print(f"PASS {len(instances)} healthy private task(s), port 8080, no public IPs")
    print(f"PASS balanced task placement and VPC Link coverage: {dict(placement)}")
    print(f"PASS regional NAT gateway: {values['nat_gateway_id']}")
    print(f"PASS backend distribution: {', '.join(sorted(observed))}")
    print(f"API: {base_url}")


if __name__ == "__main__":
    main()
