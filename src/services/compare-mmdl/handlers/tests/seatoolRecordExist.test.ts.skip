import {
  MockedFunction,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { getItem } from "../../../../libs";
import * as seatoolRecordExist from "../seatoolRecordExist";

const handler = seatoolRecordExist as { handler: Function };
const callback = vi.fn();

const testPK = "test-pk";
const testSK = "test-sk";
const testTN = "test-tn";
const testTable = "test-table";

const event = {
  Payload: {
    TN: testTN,
    PK: testPK,
  },
};

const originalEnv = process.env;

const mmdlReportData = {
  PK: testPK,
  SK: testSK,
  mmdlSigDate: "1680785774788",
  clockStartDate: "1680785774788",
};

vi.mock("../../../../libs", async () => {
  return {
    getItem: vi.fn().mockImplementation(() => mmdlReportData),
  };
});

describe("seatoolRecordExist", () => {
  beforeEach(() => {
    vi.spyOn(console, "log");
    vi.resetModules();

    process.env = {
      ...originalEnv,
      seatoolTableName: testTable,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("logs the received event", async () => {
    await handler.handler(event, null, callback);
    expect(console.log).toBeCalledWith(
      "Received event:",
      JSON.stringify(event, null, 2)
    );
  });

  it("throws an error of process.env.seatoolTableName is not set", async () => {
    process.env.seatoolTableName = undefined;
    await expect(() =>
      handler.handler(event, null, callback)
    ).rejects.toThrowError("process.env.seatoolTableName needs to be defined.");
  });

  it("sends the expected data to getItem", async () => {
    await handler.handler(event, null, callback);
    expect(getItem).toBeCalledWith({
      key: {
        PK: testTN,
        SK: testTN,
      },
      tableName: testTable,
    });
  });

  it("logs an error if no SEA tool record is found", async () => {
    (getItem as MockedFunction<typeof getItem>).mockResolvedValueOnce(null);
    await handler.handler(event, null, callback);
    expect(console.log).toBeCalledWith(
      `No Seatool record found for mmdl record id: ${testPK}, Transmittal Number: ${testTN}`
    );
  });

  it("sets data.seatoolExist to true if getItem finds a SEA Tool record", async () => {
    await handler.handler(event, null, callback);
    expect(console.log).not.toBeCalledWith(
      `No Seatool record found for mmdl record id: ${testPK}, Transmittal Number: ${testTN}`
    );
    expect(callback.mock.calls[0][1]["seatoolExist"]).toBe(true);
  });

  it("logs the data before passing to callback", async () => {
    const data = {
      ...event.Payload,
      seatoolExist: true,
    };

    await handler.handler(event, null, callback);

    expect(console.log).toBeCalledWith(
      `data after finding seatool item: ${JSON.stringify(data, null, 2)}`
    );
  });

  it("passes the expected data to the callback when no SEA Tool record exists", async () => {
    await handler.handler(event, null, callback);
    expect(callback.mock.calls[0][1]).toEqual({
      PK: testPK,
      TN: testTN,
      seatoolExist: true,
    });
  });

  it("passes the expected data to the callback when a SEA Tool record exists", async () => {
    await handler.handler(event, null, callback);
    expect(callback.mock.calls[0][1]).toEqual({
      PK: testPK,
      TN: testTN,
      seatoolExist: true,
    });
  });
});
