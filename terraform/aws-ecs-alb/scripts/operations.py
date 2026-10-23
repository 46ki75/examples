"""Inspect ECS-owned routing, verify a completed release, or request rollback."""

import argparse
import ipaddress
import json
import subprocess
import urllib.request
from collections import Counter
from datetime import datetime
from typing import Any


def command_json(*args: str) -> dict[str, Any]:
    return json.loads(subprocess.check_output(args, text=True, timeout=90))


def forward_weights(rule: dict[str, Any]) -> dict[str, int]:
    """Handle both ELB's single-target and weighted-forward response shapes."""
    actions = [action for action in rule["Actions"] if action["Type"] == "forward"]
    if len(actions) != 1:
        raise ValueError(f"Expected one forward action: {rule}")
    action = actions[0]
    groups = action.get("ForwardConfig", {}).get("TargetGroups", [])
    if groups:
        return {group["TargetGroupArn"]: group.get("Weight", 1) for group in groups}
    return {action["TargetGroupArn"]: 1}


def production_group(rule: dict[str, Any], known_groups: set[str]) -> str:
    weights = forward_weights(rule)
    active = [arn for arn, weight in weights.items() if weight > 0]
    if not set(weights) <= known_groups or len(active) != 1:
        raise ValueError(
            f"Expected all production traffic on one known group: {weights}"
        )
    return active[0]


def rollback_candidate(deployments: list[dict[str, Any]]) -> str:
    active = [
        deployment
        for deployment in deployments
        if deployment["status"] == "IN_PROGRESS"
    ]
    if len(active) != 1:
        raise ValueError(
            "Expected exactly one IN_PROGRESS deployment; inspect status first."
        )
    return active[0]["serviceDeploymentArn"]


def validate_service(service: dict[str, Any], values: dict[str, Any]) -> None:
    if service["taskDefinition"] != values["task_definition_arn"]:
        raise ValueError(
            "Running task revision differs from Terraform; a rollback may have occurred."
        )
    if (
        service["runningCount"] != values["task_count"]
        or service["desiredCount"] != values["task_count"]
        or service["pendingCount"] != 0
    ):
        raise ValueError(
            "Service has not reached its expected steady-state task count."
        )


class Stack:
    def __init__(self) -> None:
        outputs = command_json("terraform", "output", "-json")
        self.values: dict[str, Any] = {
            name: output["value"] for name, output in outputs.items()
        }

    def aws(self, *args: str) -> dict[str, Any]:
        return command_json(
            "aws",
            *args,
            "--region",
            self.values["region"],
            "--output",
            "json",
            "--no-cli-pager",
            "--no-cli-auto-prompt",
        )

    def deployments(self) -> list[dict[str, Any]]:
        # ListServiceDeployments uses explicit nextToken pagination, not a CLI paginator.
        deployments: list[dict[str, Any]] = []
        token: list[str] = []
        while True:
            response = self.aws(
                "ecs",
                "list-service-deployments",
                "--cluster",
                self.values["ecs_cluster_name"],
                "--service",
                self.values["ecs_service_name"],
                *token,
            )
            deployments.extend(response["serviceDeployments"])
            if not response.get("nextToken"):
                break
            token = ["--next-token", response["nextToken"]]
        return sorted(
            deployments,
            key=lambda item: datetime.fromisoformat(item["createdAt"]),
            reverse=True,
        )

    def rule(self, output: str) -> dict[str, Any]:
        return self.aws("elbv2", "describe-rules", "--rule-arns", self.values[output])[
            "Rules"
        ][0]

    def status(self) -> None:
        deployments = self.deployments()
        result: dict[str, Any] = {
            "production": forward_weights(self.rule("production_rule_arn")),
            "test": forward_weights(self.rule("test_rule_arn")),
            "deployments": deployments,
        }
        if deployments:
            result["latest"] = self.aws(
                "ecs",
                "describe-service-deployments",
                "--service-deployment-arns",
                deployments[0]["serviceDeploymentArn"],
            )
        print(json.dumps(result, indent=2))

    def rollback(self) -> None:
        arn = rollback_candidate(self.deployments())
        deployment = self.aws(
            "ecs", "describe-service-deployments", "--service-deployment-arns", arn
        )["serviceDeployments"][0]
        if not deployment.get("sourceServiceRevisions"):
            raise ValueError(
                "The initial deployment has no previous revision to roll back to."
            )
        result = self.aws(
            "ecs",
            "stop-service-deployment",
            "--service-deployment-arn",
            arn,
            "--stop-type",
            "ROLLBACK",
        )
        print(json.dumps(result, indent=2))
        print("Rollback requested, not yet complete. Monitor with mise run status.")
        print(
            "Restore the last good release/image/config in Terraform before the next apply."
        )

    def smoke(self) -> None:
        values = self.values
        deployments = self.deployments()
        if not deployments or deployments[0]["status"] != "SUCCESSFUL":
            raise ValueError(
                "Latest deployment is not SUCCESSFUL; inspect mise run status."
            )

        response = self.aws(
            "ecs",
            "describe-services",
            "--cluster",
            values["ecs_cluster_name"],
            "--services",
            values["ecs_service_name"],
        )
        if response.get("failures"):
            raise ValueError(response)
        validate_service(response["services"][0], values)

        task_arns = self.aws(
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
        response = self.aws(
            "ecs",
            "describe-tasks",
            "--cluster",
            values["ecs_cluster_name"],
            "--tasks",
            *task_arns,
        )
        assert not response.get("failures"), response
        tasks = response["tasks"]
        assert len(tasks) == values["task_count"], tasks
        eni_ids: list[str] = []
        placement: Counter[str] = Counter()
        for task in tasks:
            assert task["taskDefinitionArn"] == values["task_definition_arn"], task
            assert (
                task["lastStatus"] == "RUNNING" and task["healthStatus"] == "HEALTHY"
            ), task
            placement[task["availabilityZone"]] += 1
            for attachment in task["attachments"]:
                for detail in attachment["details"]:
                    if detail["name"] == "networkInterfaceId":
                        eni_ids.append(detail["value"])
        assert set(placement) == set(values["availability_zones"]), placement
        assert max(placement.values()) - min(placement.values()) <= 1, placement
        assert len(eni_ids) == len(tasks), eni_ids
        enis = self.aws(
            "ec2", "describe-network-interfaces", "--network-interface-ids", *eni_ids
        )["NetworkInterfaces"]
        assert len(enis) == len(tasks), enis
        for eni in enis:
            assert not eni.get("Association", {}).get("PublicIp"), eni
            assert eni["SubnetId"] in values["private_subnet_ids"].values(), eni
            assert ipaddress.ip_address(eni["PrivateIpAddress"]).is_private, eni

        group = production_group(
            self.rule("production_rule_arn"), set(values["target_group_arns"].values())
        )
        targets = self.aws(
            "elbv2", "describe-target-health", "--target-group-arn", group
        )["TargetHealthDescriptions"]
        assert len(targets) == len(tasks), targets
        assert all(
            target["TargetHealth"]["State"] == "healthy" for target in targets
        ), targets
        assert all(target["Target"]["Port"] == 8080 for target in targets), targets
        assert {target["Target"]["Id"] for target in targets} == {
            eni["PrivateIpAddress"] for eni in enis
        }, (targets, enis)

        observed: set[str] = set()
        base_url = values["production_url"].rstrip("/")
        for path, method in [
            ("/health", "GET"),
            ("/", "GET"),
            ("/nested/path?hello=world&number=42", "POST"),
        ]:
            request = urllib.request.Request(base_url + path, method=method)
            # Do not disable TLS verification or retry away deployment failures.
            with urllib.request.urlopen(request, timeout=15) as response:
                assert response.status == 200, response.status
                assert response.headers["X-Release"] == values["release"], (
                    response.headers
                )
                backend = response.headers["X-Backend-Id"]
                assert backend, response.headers
                observed.add(backend)
                body = response.read().decode()
                if path == "/health":
                    assert body == "ok", body
                else:
                    fields = dict(line.split("=", 1) for line in body.splitlines()[1:])
                    expected_path, _, query = path.partition("?")
                    assert fields["release"] == values["release"], body
                    assert fields["instance"] == backend, body
                    assert fields["method"] == method, body
                    assert (
                        fields["path"] == expected_path and fields["query"] == query
                    ), body
                print(
                    f"PASS {method} {path}: release={values['release']}, backend={backend}"
                )
        print(f"PASS {len(tasks)} healthy private tasks across {dict(placement)}")
        print(f"PASS actual production target group: {group}")
        print(f"Observed backends: {', '.join(sorted(observed))}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=["status", "smoke", "rollback"])
    parser.add_argument(
        "--confirm", action="store_true", help="Allow the rollback mutation."
    )
    args = parser.parse_args()
    if args.operation == "rollback" and not args.confirm:
        parser.error(
            "rollback changes AWS resources; pass --confirm after inspecting status"
        )
    stack = Stack()
    if args.operation == "status":
        stack.status()
    elif args.operation == "smoke":
        stack.smoke()
    else:
        stack.rollback()


if __name__ == "__main__":
    main()
