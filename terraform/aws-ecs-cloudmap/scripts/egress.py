"""Run disposable Fargate probes to measure the NAT public IP used in each AZ."""

import ipaddress
import json
import subprocess
import time
from typing import Any

from smoke import command_json


def main() -> None:
    values = {
        key: item["value"]
        for key, item in command_json("terraform", "output", "-json").items()
    }

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

    service = aws(
        "ecs",
        "describe-services",
        "--cluster",
        values["ecs_cluster_name"],
        "--services",
        values["ecs_service_name"],
    )["services"][0]
    tasks: dict[str, str] = {}
    try:
        for zone, subnet in values["private_subnet_ids"].items():
            config = dict(service["networkConfiguration"]["awsvpcConfiguration"])
            config["subnets"] = [subnet]
            result = aws(
                "ecs",
                "run-task",
                "--cluster",
                values["ecs_cluster_name"],
                "--launch-type",
                "FARGATE",
                "--platform-version",
                service["platformVersion"],
                "--task-definition",
                service["taskDefinition"],
                "--network-configuration",
                json.dumps({"awsvpcConfiguration": config}),
                "--overrides",
                json.dumps(
                    {
                        "containerOverrides": [
                            {
                                "name": "caddy",
                                "command": [
                                    "wget -q -T 20 -O - https://checkip.amazonaws.com"
                                ],
                            }
                        ]
                    }
                ),
            )
            for task in result["tasks"]:
                tasks[task["taskArn"]] = zone
            assert not result["failures"] and len(result["tasks"]) == 1, result

        subprocess.run(
            [
                "aws",
                "ecs",
                "wait",
                "tasks-stopped",
                "--region",
                values["region"],
                "--cluster",
                values["ecs_cluster_name"],
                "--tasks",
                *tasks,
            ],
            check=True,
        )
        result = aws(
            "ecs",
            "describe-tasks",
            "--cluster",
            values["ecs_cluster_name"],
            "--tasks",
            *tasks,
        )
        assert not result["failures"], result
        observed: dict[str, str] = {}
        for task in result["tasks"]:
            assert task["containers"][0].get("exitCode") == 0, task
            zone = tasks[task["taskArn"]]
            assert task["availabilityZone"] == zone, task
            stream = "caddy/caddy/" + task["taskArn"].rsplit("/", 1)[1]
            deadline = time.monotonic() + 120
            while True:
                events = aws(
                    "logs",
                    "get-log-events",
                    "--log-group-name",
                    values["log_groups"]["caddy"],
                    "--log-stream-name",
                    stream,
                )["events"]
                if events:
                    address = str(ipaddress.IPv4Address(events[-1]["message"].strip()))
                    observed[zone] = address
                    break
                if time.monotonic() >= deadline:
                    raise RuntimeError(f"No probe log events in {stream}")
                time.sleep(3)
        nat = aws(
            "ec2",
            "describe-nat-gateways",
            "--nat-gateway-ids",
            values["nat_gateway_id"],
        )["NatGateways"][0]
        assert nat["AvailabilityMode"] == "regional" and nat["State"] == "available", (
            nat
        )
        public_ips = {
            address["PublicIp"]
            for address in nat["NatGatewayAddresses"]
            if "PublicIp" in address
        }
        assert set(observed.values()) <= public_ips, (observed, nat)
        local_addresses: dict[str, set[str]] = {}
        for address in nat["NatGatewayAddresses"]:
            if address.get("Status") == "succeeded" and "PublicIp" in address:
                local_addresses.setdefault(address["AvailabilityZone"], set()).add(
                    address["PublicIp"]
                )
        assert all(
            address in local_addresses.get(zone, set())
            for zone, address in observed.items()
        ), (
            f"Regional NAT has not established same-AZ egress: {observed}, {local_addresses}"
        )
        print(
            json.dumps(
                {
                    "nat_gateway_id": values["nat_gateway_id"],
                    "egress_by_az": observed,
                    "same_az_egress_verified": True,
                    "nat_addresses": nat["NatGatewayAddresses"],
                },
                indent=2,
            )
        )
    finally:
        if tasks:
            result = aws(
                "ecs",
                "describe-tasks",
                "--cluster",
                values["ecs_cluster_name"],
                "--tasks",
                *tasks,
            )
            for task in result["tasks"]:
                if task["lastStatus"] != "STOPPED":
                    aws(
                        "ecs",
                        "stop-task",
                        "--cluster",
                        values["ecs_cluster_name"],
                        "--task",
                        task["taskArn"],
                        "--reason",
                        "Egress probe cleanup",
                    )


if __name__ == "__main__":
    main()
