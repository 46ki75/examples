import { describe, it } from "node:test";
import assert from "node:assert";
import { handler } from "../../src/index.js";
import { LambdaFunctionURLEvent } from "aws-lambda";

describe("Lambda Function Handler", () => {
  it("should return a greeting message for valid query parameters", async () => {
    const event: LambdaFunctionURLEvent = {
      queryStringParameters: { name: "World" },
    } as any;

    const result = await handler(event, {} as any);

    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual(result.headers?.["Content-Type"], "application/json");
    assert.strictEqual(
      JSON.parse(String(result.body)).message,
      "Hello, World!"
    );
  });

  it("should return a greeting message for missing query parameters", async () => {
    const event: LambdaFunctionURLEvent = {
      queryStringParameters: {},
    } as any;

    const result = await handler(event, {} as any);

    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual(
      JSON.parse(String(result.body)).message,
      "Hello, Lambda!"
    );
  });

  it("should handle invalid query parameters gracefully", async () => {
    const event: LambdaFunctionURLEvent = {
      queryStringParameters: { name: null },
    } as any;

    const result = await handler(event, {} as any);

    assert.strictEqual(result.statusCode, 200);
    assert.strictEqual(
      JSON.parse(String(result.body)).message,
      "Hello, Lambda!"
    );
  });
});
