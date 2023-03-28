import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as initStatus from "../initStatus";
import * as libs from "../../../../libs";

const handler = initStatus as { handler: Function };
const callback = vi.fn();

const event = {
  Context: {
    Execution: {
      Input: {
        PK: { S: "PK-Test" },
        SK: { S: "SK-Test" },
      },
    },
  },
};

const callbackData = {
  iterations: 0,
  PK: "PK-Test",
  SK: "SK-Test",
};

describe("initStatus", () => {
  describe("when process.env.statusTableName is not defined", () => {
    it("throws an error if process.env.statusTableName is not defined", async () => {
      await expect(() =>
        handler.handler(event, null, callback)
      ).rejects.toThrowError(
        "process.env.statusTableName needs to be defined."
      );
    });
  });

  describe("when process.env.appianTableName is defined", () => {
    beforeAll(() => {
      process.env.statusTableName = "table-name";
      process.env.region = "example-region";
    });

    beforeEach(() => {
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(libs, "putItem").mockImplementation(() => {});
      vi.spyOn(libs, "trackError");
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("logs the event", async () => {
      await handler.handler(event, null, callback);
      expect(console.log).toHaveBeenCalledWith(
        "Received event:",
        JSON.stringify(event, null, 2)
      );
    });

    it("calls putItem as expected", async () => {
      await handler.handler(event, null, callback);
      expect(libs.putItem).toBeCalledWith({
        tableName: "table-name",
        item: callbackData,
      });
    });

    it("passes data to the callback", async () => {
      await handler.handler(event, null, callback);
      expect(callback.mock.calls[0][1]).toMatchObject(callbackData);
    });
  });
});
