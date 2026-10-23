"""Offline regressions for routing ownership and rollback detection."""

import unittest
from unittest.mock import patch

from operations import (
    Stack,
    forward_weights,
    main,
    production_group,
    rollback_candidate,
    validate_service,
)


def rule(blue: int, green: int) -> dict[str, object]:
    return {
        "Actions": [
            {
                "Type": "forward",
                "ForwardConfig": {
                    "TargetGroups": [
                        {"TargetGroupArn": "blue", "Weight": blue},
                        {"TargetGroupArn": "green", "Weight": green},
                    ]
                },
            }
        ],
    }


class RoutingTests(unittest.TestCase):
    def test_initial_and_swapped_production(self) -> None:
        for blue, green, expected in [(100, 0, "blue"), (0, 100, "green")]:
            with self.subTest(expected=expected):
                self.assertEqual(
                    production_group(rule(blue, green), {"blue", "green"}), expected
                )

    def test_single_target_response(self) -> None:
        self.assertEqual(
            forward_weights(
                {"Actions": [{"Type": "forward", "TargetGroupArn": "green"}]}
            ),
            {"green": 1},
        )

    def test_rejects_mixed_or_unknown_production(self) -> None:
        for weights, known in [
            (rule(50, 50), {"blue", "green"}),
            (rule(0, 0), {"blue", "green"}),
            (rule(100, 0), {"green"}),
        ]:
            with self.subTest(weights=weights), self.assertRaises(ValueError):
                production_group(weights, known)

    def test_rejects_missing_forward_action(self) -> None:
        with self.assertRaises(ValueError):
            forward_weights({"Actions": [{"Type": "fixed-response"}]})


class DeploymentTests(unittest.TestCase):
    def test_rollback_requires_one_in_progress_deployment(self) -> None:
        active = {"status": "IN_PROGRESS", "serviceDeploymentArn": "active"}
        completed = {"status": "SUCCESSFUL", "serviceDeploymentArn": "old"}
        self.assertEqual(rollback_candidate([completed, active]), "active")
        for deployments in [[], [completed], [active, active]]:
            with self.subTest(deployments=deployments), self.assertRaises(ValueError):
                rollback_candidate(deployments)

    def test_smoke_detects_automatic_rollback(self) -> None:
        values = {"task_definition_arn": "new", "task_count": 3}
        service = {
            "taskDefinition": "new",
            "runningCount": 3,
            "desiredCount": 3,
            "pendingCount": 0,
        }
        validate_service(service, values)
        with self.assertRaisesRegex(ValueError, "rollback"):
            validate_service({**service, "taskDefinition": "old"}, values)

    def test_smoke_rejects_incomplete_service(self) -> None:
        with self.assertRaisesRegex(ValueError, "steady-state"):
            validate_service(
                {
                    "taskDefinition": "new",
                    "runningCount": 2,
                    "desiredCount": 3,
                    "pendingCount": 1,
                },
                {"task_definition_arn": "new", "task_count": 3},
            )

    def test_paginates_and_sorts_deployment_history(self) -> None:
        with patch.object(Stack, "__init__", return_value=None):
            stack = Stack()
        stack.values = {"ecs_cluster_name": "cluster", "ecs_service_name": "caddy"}
        with patch.object(
            Stack,
            "aws",
            side_effect=[
                {
                    "serviceDeployments": [{"createdAt": "2026-01-01T00:00:00Z"}],
                    "nextToken": "page2",
                },
                {"serviceDeployments": [{"createdAt": "2026-01-02T00:00:00Z"}]},
            ],
        ) as aws:
            deployments = stack.deployments()
        self.assertEqual(deployments[0]["createdAt"], "2026-01-02T00:00:00Z")
        self.assertEqual(aws.call_args_list[1].args[-2:], ("--next-token", "page2"))

    def test_rollback_confirmation_precedes_all_external_commands(self) -> None:
        with (
            patch("sys.argv", ["operations.py", "rollback"]),
            patch("operations.command_json") as command,
            self.assertRaises(SystemExit) as error,
        ):
            main()
        self.assertEqual(error.exception.code, 2)
        command.assert_not_called()


if __name__ == "__main__":
    unittest.main()
