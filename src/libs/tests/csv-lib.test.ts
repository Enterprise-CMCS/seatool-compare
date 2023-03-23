import { getCsvFromJson } from "../csv-lib";
import { it, describe, expect } from "vitest";

describe("getCsvFromJson", () => {
  it("should not throw an error when all required variables are present", () => {
    expect(() => getCsvFromJson({})).not.toThrow();
  });

  it("should throw an error when all required variables are present", () => {
    const test = getCsvFromJson(
      '"source": "u003Ca href="http: //twtr.jp" rel="nofollow"u003EKeitai Webu003C/au003E"'
    );
    expect(test.message).toEqual(
      `Data should not be empty or the "fields" option should be included`
    );
  });
});
