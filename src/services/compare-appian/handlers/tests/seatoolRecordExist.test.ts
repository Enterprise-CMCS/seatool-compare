import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as seatoolRecordExists from "../seatoolRecordExist";
import * as libs from "../../../../libs";

const handler = seatoolRecordExists as { handler: Function };
const callback = vi.fn();

const event = { Payload: {} };

const mockSubmittedDate = 1311638400000;
const mockSpaId = "test-spa-id";
const exampleAppianRecord = {
  PK: "test-pk",
  SK: "test-sk",
  Payload: {
    SBMSSN_DATE: mockSubmittedDate,
    SPA_ID: mockSpaId,
  },
};

describe("seatoolRecordExists", () => {
  describe("when process.env.statusTableName is not defined", () => {
    it("throws an error if process.env.statusTableName is not defined", async () => {
      await expect(() =>
        handler.handler(event, null, callback)
      ).rejects.toThrowError(
        "process.env.seatoolTableName needs to be defined."
      );
    });
  });

  describe("when process.env.statusTableName is defined", () => {
    beforeAll(() => {
      process.env.seatoolTableName = "table-name";
    });

    beforeEach(() => {
      vi.spyOn(console, "log");
      vi.spyOn(libs, "getItem");
      vi.spyOn(libs, "trackError");
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    describe("when a matching SEA Tool record is found", () => {
      beforeEach(() => {
        vi.spyOn(libs, "getItem").mockImplementation(
          async () => exampleAppianRecord
        );
      });

      it("does not throw an error when passed properly-formatted data", async () => {
        await handler.handler(event, null, callback);
        expect(libs.trackError).not.toHaveBeenCalled();
      });

      it("logs the received event in the expected format", async () => {
        await handler.handler(event, null, callback);
        expect(console.log).toHaveBeenCalledWith(
          "Received event:",
          JSON.stringify(event, null, 2)
        );
      });

      it("calls getItem as expected", async () => {
        await handler.handler(event, null, callback);
        expect(libs.getItem).toHaveBeenCalledOnce();
      });

      it("sets seatoolExist to true", async () => {
        await handler.handler(event, null, callback);
        console.info("callback", callback.mock.calls[0][1]);
        expect(callback.mock.calls[0][1]["seatoolExist"]).toBe(true);
      });

      it("sets the seatoolRecord as expected", async () => {
        await handler.handler(event, null, callback);
        expect(callback.mock.calls[0][1]["seatoolRecord"]).toMatchObject(
          exampleAppianRecord
        );
      });
    });

    describe("when no matching SEA Tool record is found", () => {
      beforeEach(() => {
        vi.spyOn(libs, "getItem").mockImplementation(async () => null);
      });

      it("logs an error", async () => {
        await handler.handler(event, null, callback);
        expect(console.log).toBeCalledWith(
          `No Seatool record found for Appian record: undefined`
        );
      });
    });
  });
});
