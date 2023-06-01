import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as getMmdlData from "../getMmdlData";
import * as libs from "../../../../libs";

const handler = getMmdlData as unknown as {
  handler: Function;
  getSecsSinceNowFromSigDate: Function;
};
const callback = vi.fn();

const testPK = "test-pk";
const testSK = "test-sk";

const event = {
  Payload: {
    PK: testPK,
    SK: testSK,
  },
};

const mmdlReportData = {
  PK: testPK,
  SK: testSK,
  mmdlSigDate: "1680785774788",
  clockStartDate: "1680785774788",
};

vi.mock("../../../../libs", async () => {
  return {
    getItem: vi.fn().mockImplementation(() => mmdlReportData),
    trackError: vi.fn(),
  };
});

describe("getMmdlData", () => {
  beforeEach(() => {
    vi.spyOn(console, "log");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("throws an error if process.env.mmdlTableName is not defined", async () => {
    await expect(() =>
      handler.handler(event, null, callback)
    ).rejects.toThrowError("process.env.mmdlTableName needs to be defined.");
  });

  describe("with process.env.mmdlTableName defined", () => {
    beforeAll(() => {
      process.env.mmdlTableName = "test-table";
    });

    it("does not call trackError with properly-formatted data", async () => {
      await handler.handler(event, null, callback);
      expect(libs.trackError).not.toBeCalled();
    });

    it("logs the received event", async () => {
      await handler.handler(event, null, callback);
      expect(console.log).toBeCalledWith(
        "Received event:",
        JSON.stringify(event, null, 2)
      );
    });

    it("calls getItem with the expected parameters", async () => {
      await handler.handler(event, null, callback);
      expect(libs.getItem).toBeCalledWith({
        tableName: "test-table",
        key: { PK: testPK, SK: testSK },
      });
    });

    it("passes data to the callback as expected", async () => {
      await handler.handler(event, null, callback);
      const callbackData = callback.mock.calls[0][1];
      console.log(callbackData);
      expect(callbackData).toHaveProperty("programType");
      expect(callbackData).toHaveProperty("TN");
    });

    it("calculates secSinceMmdlSigned as a number", async () => {
      await handler.handler(event, null, callback);
      const callbackData = callback.mock.calls[0][1];
      expect(callbackData).toHaveProperty("secSinceMmdlSigned");
      expect(callbackData["secSinceMmdlSigned"]).toBeTypeOf("number");
    });

    it("calculates secSinceClockStart as a number", async () => {
      await handler.handler(event, null, callback);
      const callbackData = callback.mock.calls[0][1];
      expect(callbackData).toHaveProperty("secSinceClockStart");
      expect(callbackData["secSinceClockStart"]).toBeTypeOf("number");
    });

    it("calculates seconds since now from sig date correctly", () => {
      const result = handler.getSecsSinceNowFromSigDate("05/24/2023");
      expect(result).not.toBeNull();
      expect(result).toBeTypeOf("number");
      expect(result).toBeGreaterThan(660000);
    });

    it("logs the returning data", async () => {
      await handler.handler(event, null, callback);
      const callbackData = callback.mock.calls[0][1];

      expect(console.log).toBeCalledWith(
        `Returning data `,
        JSON.stringify(callbackData, null, 2)
      );
    });
  });
});
