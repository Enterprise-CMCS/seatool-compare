import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as sendNoMatchAlert from "../sendNoMatchAlert";
import { doesSecretExist } from "../../../../libs";

vi.mock("../../../../libs");

const handler = sendNoMatchAlert as { handler: Function };
const callback = vi.fn();
const event = { Payload: {} };

describe("sendNoMatchAlert", () => {
  describe("when process.env values are not set", async () => {
    it("throws an error if process.env.region is not defined", async () => {
      await expect(() =>
        handler.handler(event, null, callback)
      ).rejects.toThrowError("process.env.region needs to be defined.");
    });
  });

  describe("when process.env values are set", async () => {
    beforeAll(() => {
      process.env.project = "test-project";
      process.env.region = "test-region";
      process.env.stage = "test-state";
    });

    beforeEach(() => {
      vi.spyOn(console, "log");
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("logs the received event", async () => {
      await handler.handler(event, null, callback);
      expect(console.log).toHaveBeenCalledWith(
        "Received event:",
        JSON.stringify(event, null, 2)
      );
    });
  });
});
