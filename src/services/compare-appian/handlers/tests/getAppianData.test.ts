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
import * as timeHelper from "../utils/timeHelper";

const handler = getAppianData as { handler: Function };
const callback = vi.fn();

const mockSeconds = 9876543210;
const mockSubmittedDate = 1311638400000;

const event = {
  Payload: {
    appianSubmittedDate: mockSubmittedDate,
    seatoolRecord: {
      STATE_PLAN: {
        ID_NUMBER: "NC-11-020",
        SUBMISSION_DATE: mockSubmittedDate,
      },
    },
  },
};

const exampleAppianRecord = {
  PK: "test-pk",
  SK: "test-sk",
  payload: {
    SBMSSN_DATE: mockSubmittedDate,
    SPA_ID: "TEST-SPA-ID",
  },
};

describe("getAppianData", () => {
  describe("when process.env.appianTableName is not defined", () => {
    it("throws an error if process.env.appianTableName is not defined", async () => {
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

      it("does not throw an error when passed properly-formatted data", async () => {
        await handler.handler(event, null, callback);
        expect(libs.getItem).toHaveBeenCalledOnce();
        expect(libs.trackError).not.toHaveBeenCalled();
      });

      it("logs the received event in the expected format", async () => {
        await handler.handler(event, null, callback);

        expect(console.log).toHaveBeenCalledWith(
          "Received event:",
          JSON.stringify(event, null, 2)
        );
      });

      it("includes appianRecord in the callback data", async () => {
        await handler.handler(event, null, callback);
        expect(callback.mock.calls[0][1].hasOwnProperty("appianRecord")).toBe(
          true
        );
        expect(callback.mock.calls[0][1]["appianRecord"]).toEqual(
          exampleAppianRecord
        );
      });

      it("includes SPA_ID in the callback data", async () => {
        await handler.handler(event, null, callback);
        expect(callback.mock.calls[0][1].hasOwnProperty("SPA_ID")).toBe(true);
        expect(callback.mock.calls[0][1]["SPA_ID"]).toBe("TEST-SPA-ID");
      });

      it("includes seconds since Appian record submission", async () => {
        vi.spyOn(timeHelper, "secondsBetweenDates").mockImplementation(
          () => mockSeconds
        );

        await handler.handler(event, null, callback);
        expect(
          callback.mock.calls[0][1].hasOwnProperty("secSinceAppianSubmitted")
        ).toBe(true);
        expect(callback.mock.calls[0][1]["secSinceAppianSubmitted"]).toBe(
          mockSeconds
        );
      });

      it("sets isAppianInSubmittedStatus to true when expected", async () => {
        const submittedAppianRecord = {
          PK: "test-pk",
          SK: "test-sk",
          payload: {
            SBMSSN_DATE: 1311638400000,
            SBMSSN_TYPE: "oFfIcIaL", // this should be case insensitive
            SPA_ID: "TEST-SPA-ID",
            SPA_PCKG_ID: "test-o",
          },
        };

        vi.spyOn(libs, "getItem").mockImplementation(
          async () => submittedAppianRecord
        );

        await handler.handler(event, null, callback);
        expect(
          callback.mock.calls[0][1].hasOwnProperty("isAppianInSubmittedStatus")
        ).toBe(true);
        expect(callback.mock.calls[0][1]["isAppianInSubmittedStatus"]).toBe(
          true
        );
      });

      it("sets isAppianInSubmittedStatus to false when expected", async () => {
        await handler.handler(event, null, callback);
        expect(
          callback.mock.calls[0][1].hasOwnProperty("isAppianInSubmittedStatus")
        ).toBe(true);
        expect(callback.mock.calls[0][1]["isAppianInSubmittedStatus"]).toBe(
          false
        );
      });

      it("includes appianSubmittedDate in the callback data", async () => {
        await handler.handler(event, null, callback);
        expect(
          callback.mock.calls[0][1].hasOwnProperty("appianSubmittedDate")
        ).toBe(true);
        expect(callback.mock.calls[0][1]["appianSubmittedDate"]).toBe(
          mockSubmittedDate
        );
      });
    });

    describe("when no Appian record is found", () => {
      beforeEach(() => {
        vi.spyOn(libs, "getItem").mockImplementation(async () => null);
      });

      afterEach(() => {
        vi.clearAllMocks();
      });

      it("throws an error when no Appian record is found", async () => {
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
