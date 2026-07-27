# Step Functions Human Approval

This example demonstrates a human approval step in an AWS Step Functions
Standard Workflow. The state machine sends a request and task token to Amazon
SQS, then pauses at `sqs:sendMessage.waitForTaskToken` until the CLI approves or
rejects the request.

## Architecture

1. The CLI starts a Step Functions execution.
2. Step Functions sends the execution input and callback token to an encrypted
   SQS queue.
3. The `review` command long-polls the queue and presents the request to a human.
4. Approval calls `SendTaskSuccess`; rejection calls `SendTaskFailure` with a
   `HumanRejected` error.
5. The state machine finishes in the `Approved`, `Rejected`, or
   `ApprovalTimedOut` state.

The callback pattern requires a Standard Workflow. Task tokens must be treated
as secrets, and AWS requires the callback principal to be in the same AWS
account as the state machine.

## Deploy

From this package directory, deploy the CloudFormation stack:

```bash
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name step-functions-human-approval \
  --capabilities CAPABILITY_IAM
```

The default human approval timeout is 24 hours. Override it during deployment
if needed:

```bash
aws cloudformation deploy \
  --template-file cloudformation.yaml \
  --stack-name step-functions-human-approval \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides ApprovalTimeoutSeconds=3600
```

The stack creates an unattached managed policy containing the permissions the
CLI needs. Attach the `CliPolicyArn` output to the IAM user or role that runs
the CLI, or grant equivalent permissions through your existing IAM setup.

## Configure

Install workspace dependencies from the repository root:

```bash
pnpm install
```

Export the stack outputs:

```bash
export STATE_MACHINE_ARN="$(aws cloudformation describe-stacks \
  --stack-name step-functions-human-approval \
  --query 'Stacks[0].Outputs[?OutputKey==`StateMachineArn`].OutputValue' \
  --output text)"

export APPROVAL_QUEUE_URL="$(aws cloudformation describe-stacks \
  --stack-name step-functions-human-approval \
  --query 'Stacks[0].Outputs[?OutputKey==`ApprovalQueueUrl`].OutputValue' \
  --output text)"
```

The CLI uses the standard AWS SDK credential chain and `AWS_REGION` or
`AWS_DEFAULT_REGION`. Each setting can instead be passed using
`--state-machine`, `--queue`, and `--region`.

## Try the Workflow

Start an execution and keep polling it in one terminal:

```bash
pnpm --filter node-step-functions-human-approval cli start \
  --input '{"requestId":"change-123","title":"Deploy release 2.0","requestedBy":"alice"}' \
  --watch
```

Review the request in another terminal:

```bash
pnpm --filter node-step-functions-human-approval cli review
```

The CLI prints the request and asks for `approve`, `reject`, or `skip`. A skipped
message becomes visible again after the five-minute SQS visibility timeout.

For automation or a non-interactive test, provide the decision directly:

```bash
pnpm --filter node-step-functions-human-approval cli review \
  --decision approve \
  --comment "Approved in change review"
```

Poll an existing execution separately:

```bash
pnpm --filter node-step-functions-human-approval cli status \
  --execution "$EXECUTION_ARN"

pnpm --filter node-step-functions-human-approval cli watch \
  --execution "$EXECUTION_ARN" \
  --interval 2
```

## Remove

```bash
aws cloudformation delete-stack --stack-name step-functions-human-approval
aws cloudformation wait stack-delete-complete --stack-name step-functions-human-approval
```
