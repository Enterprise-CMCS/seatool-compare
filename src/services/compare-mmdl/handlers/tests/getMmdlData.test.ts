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

vi.mock("../../../../libs", async () => {
  return {
    getItem: vi.fn().mockImplementation(() => {}),
    trackError: vi.fn(),
  };
});

const handler = getMmdlData as { handler: Function };
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
};

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
        key: { PK: "test-pk", SK: "test-sk" },
      });
    });

    it("calls trackError if mmdlSigDate is missing", async () => {
      await handler.handler(event, null, callback);
      const expectedError = new Error(
        "Cannot read properties of undefined (reading 'mmdlSigDate')"
      );
      expect(libs.trackError).toBeCalledWith(expectedError);
    });

    // it("does not call trackError with properly-formatted data", async () => {
    //   await handler.handler(event, null, callback);
    //   expect(libs.trackError).not.toBeCalled();
    // });
  });
});
