import { describe, it } from "node:test";
import assert from "node:assert";
import { parseQueryParams } from "../../src/lib.js";

describe("parseQueryParams", () => {
  it("should return the default name 'Lambda' when queryParams is undefined", async () => {
    const result = await parseQueryParams();
    assert.deepStrictEqual(result, { name: "Lambda" });
  });

  it("should return the default name 'Lambda' when queryParams.name is undefined", async () => {
    const result = await parseQueryParams({});
    assert.deepStrictEqual(result, { name: "Lambda" });
  });

  it("should return the provided name when queryParams.name is defined", async () => {
    const result = await parseQueryParams({ name: "TestName" });
    assert.deepStrictEqual(result, { name: "TestName" });
  });
});
