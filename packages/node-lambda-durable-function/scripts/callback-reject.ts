import {
  SSMClient,
  GetParameterCommand,
  DeleteParameterCommand,
} from "@aws-sdk/client-ssm";
import {
  LambdaClient,
  SendDurableExecutionCallbackFailureCommand,
} from "@aws-sdk/client-lambda";

const ssmClient = new SSMClient({});

const callbackIdParameter = await ssmClient.send(
  new GetParameterCommand({
    Name: `/node-lambda-durable-function/callback-id`,
  }),
);

const callbackId = callbackIdParameter.Parameter?.Value;

const lambdaClient = new LambdaClient({});

await lambdaClient.send(
  new SendDurableExecutionCallbackFailureCommand({
    CallbackId: callbackId,
    Error: { ErrorData: JSON.stringify({ approved: false }) },
  }),
);

await ssmClient.send(
  new DeleteParameterCommand({
    Name: `/node-lambda-durable-function/callback-id`,
  }),
);
