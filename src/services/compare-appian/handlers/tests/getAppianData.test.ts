import {
  afterEach,
  beforeAll,
  beforeEach,
  it,
  describe,
  expect,
  vi,
} from "vitest";
import * as libs from "../../../../libs";
import * as getAppianData from "../getAppianData";

const handler = getAppianData as { handler: Function };
const callback = vi.fn();

const event = {
  Payload: {
    appianSubmittedDate: 1311638400000,
    seatoolRecord: {
      STATE_PLAN: {
        ID_NUMBER: "NC-11-020",
        SUBMISSION_DATE: 1311638400000,
      },
    },
  },
};

const exampleAppianRecord = {
  PK: "test-pk",
  SK: "test-sk",
  payload: {
    SBMSSN_DATE: 1311638400000,
    SPA_ID: "TEST-SPA-ID",
  },
};

describe("getAppianData", () => {
  describe("when process.env.appianTableName is not defined", () => {
    it("should throw an error if process.env.appianTableName is not defined", async () => {
      await expect(() =>
        handler.handler(event, null, callback)
      ).rejects.toThrowError(
        "process.env.appianTableName needs to be defined."
      );
    });
  });

  describe("when process.env.appianTableName is defined", () => {
    beforeEach(() => {
      vi.spyOn(console, "log");
      vi.spyOn(console, "error");
      vi.spyOn(libs, "trackError");
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    beforeAll(() => {
      process.env.appianTableName = "table-name";
    });

    describe("when an Appian record is found", () => {
      beforeEach(() => {
        vi.spyOn(libs, "getItem").mockImplementation(
          async () => exampleAppianRecord
        );
      });

      it("should not throw an error when passed properly-formatted data", async () => {
        await handler.handler(event, null, callback);
        expect(libs.getItem).toHaveBeenCalledOnce();
        expect(libs.trackError).not.toHaveBeenCalled();
      });

      it("should log the received event in the expected format", async () => {
        await handler.handler(event, null, callback);

        expect(console.log).toHaveBeenCalledWith(
          "Received event:",
          JSON.stringify(event, null, 2)
        );
      });

      it("should include appianRecord in the data sent to callback", async () => {
        await handler.handler(event, null, callback);
        expect(callback.mock.calls[0][1].hasOwnProperty("appianRecord")).toBe(
          true
        );
        expect(callback.mock.calls[0][1]["appianRecord"]).toEqual(
          exampleAppianRecord
        );
      });

      it("should include SPA_ID in the data sent to the callback", async () => {
        await handler.handler(event, null, callback);
        expect(callback.mock.calls[0][1].hasOwnProperty("SPA_ID")).toBe(true);
        expect(callback.mock.calls[0][1]["SPA_ID"]).toBe("TEST-SPA-ID");
      });
    });

    describe("when no Appian record is found", () => {
      beforeEach(() => {
        vi.spyOn(libs, "getItem").mockImplementation(async () => null);
      });

      afterEach(() => {
        vi.clearAllMocks();
      });

      it("should throw an error when no Appian record is found", async () => {
        await handler.handler(event, null, callback);
        expect(libs.getItem).toHaveBeenCalledOnce();
        expect(libs.trackError).toHaveBeenCalled();
        expect(console.error).toHaveBeenCalledWith(
          "ERROR:",
          JSON.stringify("No Appian record found", null, 2)
        );
      });
    });
  });
});
