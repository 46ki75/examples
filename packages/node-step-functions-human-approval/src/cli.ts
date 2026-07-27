#!/usr/bin/env node

import {
  DescribeExecutionCommand,
  SFNClient,
  SendTaskFailureCommand,
  SendTaskSuccessCommand,
  StartExecutionCommand,
  type ExecutionStatus,
} from "@aws-sdk/client-sfn";
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";
import { parseArgs } from "node:util";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const terminalStatuses = new Set<ExecutionStatus>([
  "SUCCEEDED",
  "FAILED",
  "TIMED_OUT",
  "ABORTED",
  "PENDING_REDRIVE",
]);

const { positionals, values } = parseArgs({
  allowPositionals: true,
  strict: true,
  options: {
    comment: { type: "string" },
    decision: { type: "string" },
    execution: { type: "string" },
    help: { type: "boolean", short: "h" },
    input: { type: "string" },
    interval: { type: "string", default: "2" },
    name: { type: "string" },
    queue: { type: "string" },
    region: { type: "string" },
    "state-machine": { type: "string" },
    watch: { type: "boolean", default: false },
    "wait-seconds": { type: "string", default: "20" },
  },
});

const command = positionals[0];
const region =
  values.region ?? process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION;
const sfn = new SFNClient({ region });
const sqs = new SQSClient({ region });

type ApprovalMessage = {
  taskToken: string;
  executionArn: string;
  approvalRequest: unknown;
};

function usage(): void {
  console.log(`Usage: human-approval <command> [options]

Commands:
  start    Start a state machine execution
  status   Describe an execution once
  watch    Poll an execution until it reaches a terminal state
  review   Receive the next SQS request and approve, reject, or skip it

Configuration:
  --state-machine <arn>  State machine ARN (or STATE_MACHINE_ARN)
  --queue <url>          Approval queue URL (or APPROVAL_QUEUE_URL)
  --region <region>      AWS region (or standard AWS region environment variables)

Start options:
  --input <json>         Execution input (default: {})
  --name <name>          Optional execution name
  --watch                Poll the newly started execution

Status/watch options:
  --execution <arn>      Execution ARN
  --interval <seconds>   Poll interval for watch (default: 2)

Review options:
  --decision <value>     approve or reject; omit for an interactive prompt
  --comment <text>       Comment returned with the callback
  --wait-seconds <n>     SQS long-poll duration from 0 to 20 (default: 20)`);
}

function required(value: string | undefined, label: string): string {
  if (!value) {
    throw new Error(`Missing ${label}`);
  }
  return value;
}

function numberOption(
  value: string,
  label: string,
  min: number,
  max: number,
): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label} must be between ${min} and ${max}`);
  }
  return parsed;
}

function integerOption(
  value: string,
  label: string,
  min: number,
  max: number,
): number {
  const parsed = numberOption(value, label, min, max);
  if (!Number.isInteger(parsed)) throw new Error(`${label} must be an integer`);
  return parsed;
}

function parseJson(value: string, label: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

function stateMachineArn(): string {
  return required(
    values["state-machine"] ?? process.env.STATE_MACHINE_ARN,
    "--state-machine or STATE_MACHINE_ARN",
  );
}

function queueUrl(): string {
  return required(
    values.queue ?? process.env.APPROVAL_QUEUE_URL,
    "--queue or APPROVAL_QUEUE_URL",
  );
}

function printExecution(execution: {
  executionArn?: string;
  stateMachineArn?: string;
  name?: string;
  status?: ExecutionStatus;
  startDate?: Date;
  stopDate?: Date;
  input?: string;
  output?: string;
  error?: string;
  cause?: string;
}): void {
  const result: Record<string, unknown> = {
    executionArn: execution.executionArn,
    stateMachineArn: execution.stateMachineArn,
    name: execution.name,
    status: execution.status,
    startDate: execution.startDate,
    stopDate: execution.stopDate,
  };

  if (execution.input !== undefined)
    result.input = parseJson(execution.input, "Execution input");
  if (execution.output !== undefined)
    result.output = parseJson(execution.output, "Execution output");
  if (execution.error !== undefined) result.error = execution.error;
  if (execution.cause !== undefined) result.cause = execution.cause;

  console.log(JSON.stringify(result, null, 2));
}

async function describe(executionArn: string) {
  return sfn.send(new DescribeExecutionCommand({ executionArn }));
}

async function watch(executionArn: string): Promise<void> {
  const interval =
    numberOption(values.interval, "--interval", 0.1, 3600) * 1000;
  let previousStatus: ExecutionStatus | undefined;

  for (;;) {
    const execution = await describe(executionArn);
    if (
      execution.status !== previousStatus ||
      terminalStatuses.has(execution.status!)
    ) {
      printExecution(execution);
      previousStatus = execution.status;
    }
    if (execution.status && terminalStatuses.has(execution.status)) return;
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

async function start(): Promise<void> {
  const input = values.input ?? "{}";
  parseJson(input, "--input");
  const execution = await sfn.send(
    new StartExecutionCommand({
      stateMachineArn: stateMachineArn(),
      input,
      name: values.name,
    }),
  );

  console.log(
    JSON.stringify(
      { executionArn: execution.executionArn, startDate: execution.startDate },
      null,
      2,
    ),
  );
  if (values.watch)
    await watch(
      required(execution.executionArn, "execution ARN in AWS response"),
    );
}

function isApprovalMessage(value: unknown): value is ApprovalMessage {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ApprovalMessage>;
  return (
    typeof candidate.taskToken === "string" &&
    typeof candidate.executionArn === "string"
  );
}

async function promptForDecision(): Promise<string> {
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    return (await readline.question("Decision [approve/reject/skip]: "))
      .trim()
      .toLowerCase();
  } finally {
    readline.close();
  }
}

async function review(): Promise<void> {
  const approvalQueueUrl = queueUrl();
  const requestedDecision = values.decision?.toLowerCase();
  if (requestedDecision && !["approve", "reject"].includes(requestedDecision)) {
    throw new Error("--decision must be approve or reject");
  }
  const waitTimeSeconds = integerOption(
    values["wait-seconds"],
    "--wait-seconds",
    0,
    20,
  );
  const response = await sqs.send(
    new ReceiveMessageCommand({
      QueueUrl: approvalQueueUrl,
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: waitTimeSeconds,
      VisibilityTimeout: 300,
    }),
  );
  const message = response.Messages?.[0];
  if (!message) {
    console.log("No approval requests are waiting.");
    return;
  }

  const body = parseJson(
    required(message.Body, "SQS message body"),
    "SQS message body",
  );
  if (!isApprovalMessage(body))
    throw new Error("SQS message is not a valid approval request");

  console.log(
    JSON.stringify(
      {
        executionArn: body.executionArn,
        approvalRequest: body.approvalRequest,
      },
      null,
      2,
    ),
  );

  const decision = requestedDecision ?? (await promptForDecision());
  const reviewedAt = new Date().toISOString();
  if (decision === "skip" || decision === "") {
    console.log(
      "Skipped. The request will become visible again after the visibility timeout.",
    );
    return;
  }
  try {
    if (decision === "approve") {
      await sfn.send(
        new SendTaskSuccessCommand({
          taskToken: body.taskToken,
          output: JSON.stringify({
            approved: true,
            reviewedAt,
            comment: values.comment,
          }),
        }),
      );
    } else if (decision === "reject") {
      await sfn.send(
        new SendTaskFailureCommand({
          taskToken: body.taskToken,
          error: "HumanRejected",
          cause: values.comment ?? "Rejected by a human reviewer",
        }),
      );
    } else {
      throw new Error("Decision must be approve, reject, or skip");
    }
  } catch (error: unknown) {
    const staleTokenErrors = new Set([
      "InvalidToken",
      "TaskDoesNotExist",
      "TaskTimedOut",
    ]);
    if (!(error instanceof Error) || !staleTokenErrors.has(error.name))
      throw error;

    await deleteMessage(approvalQueueUrl, message.ReceiptHandle);
    throw new Error(`Removed stale approval request: ${error.name}`);
  }

  await deleteMessage(approvalQueueUrl, message.ReceiptHandle);
  console.log(
    `${decision === "approve" ? "Approved" : "Rejected"} ${body.executionArn}`,
  );
}

async function deleteMessage(
  approvalQueueUrl: string,
  receiptHandle: string | undefined,
): Promise<void> {
  await sqs.send(
    new DeleteMessageCommand({
      QueueUrl: approvalQueueUrl,
      ReceiptHandle: required(receiptHandle, "SQS receipt handle"),
    }),
  );
}

async function main(): Promise<void> {
  if (values.help || !command) {
    usage();
    return;
  }

  switch (command) {
    case "start":
      await start();
      break;
    case "status":
      printExecution(await describe(required(values.execution, "--execution")));
      break;
    case "watch":
      await watch(required(values.execution, "--execution"));
      break;
    case "review":
      await review();
      break;
    default:
      usage();
      throw new Error(`Unknown command: ${command}`);
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
