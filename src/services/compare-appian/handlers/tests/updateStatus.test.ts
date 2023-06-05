import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as updateStatus from "../updateStatus";
import * as libs from "../../../../libs";

vi.mock("../../../../libs", () => {
  return {
    putItem: vi.fn(),
    trackError: vi.fn(),
  };
});

const handler = updateStatus as { handler: Function };
const callback = vi.fn();
const event = { Payload: { iterations: 0 } };

describe("updateStatus", () => {
  beforeEach(() => {
    vi.spyOn(console, "log");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("with process.env.statusTableName", () => {
    it("logs the received event in the expected format", async () => {
      await handler.handler(event, null, callback);
      expect(console.log).toHaveBeenCalledWith(
        "Received event:",
        JSON.stringify(event, null, 2)
      );
    });

    it("calls putItem with the expected parameters", async () => {
      await handler.handler(event, null, callback);
      expect(libs.putItem).toHaveBeenCalledWith({
        tableName: "table-name",
        item: {
          iterations: 1,
        },
      });
    });

    it("logs the data after update", async () => {
      const data = {
        iterations: 1,
      };

      await handler.handler(event, null, callback);
      expect(console.log).toHaveBeenCalledWith(
        `data after updating item: ${JSON.stringify(data, null, 2)}`
      );
    });
  });
});
