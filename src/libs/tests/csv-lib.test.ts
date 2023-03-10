import { getCsvFromJson } from "../csv-lib";
import { it, describe, expect } from "vitest";

describe("getCsvFromJson", () => {
  it("should not throw an error when all required variables are present", () => {
    expect(() => getCsvFromJson({})).not.toThrow();
  });
});
