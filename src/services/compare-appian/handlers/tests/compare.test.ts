import { afterEach, beforeEach, it, describe, expect, vi } from "vitest";
import * as compare from "../compare";
import * as libs from "../../../../libs";

const appianCompare = compare as { handler: Function };
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

describe("compare", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(libs, "trackError");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("with properly-formatted data", () => {
    it("should not throw an error when passed properly-formatted data", async () => {
      await appianCompare.handler(event, null, callback);
      expect(libs.trackError).not.toHaveBeenCalled();
    });

    it("should return data with match set to true if Appian and SEA Tool submitted dates are the same", async () => {
      await appianCompare.handler(event, null, callback);
      expect(callback.mock.calls[0][1].hasOwnProperty("match")).toBe(true);
      expect(callback.mock.calls[0][1]["match"]).toBe(true);
    });

    it("should log the received event in the expected format", async () => {
      await appianCompare.handler(event, null, callback);

      expect(console.log).toHaveBeenCalledWith(
        "Received event:",
        JSON.stringify(event, null, 2)
      );
    });
  });

  describe("with malformed or missing data", () => {
    it("should throw an error when passed malformed data", async () => {
      const malformedEvent = {
        wrongData: {
          malformed: "malformed data",
        },
      };

      await appianCompare.handler(malformedEvent, null, callback);
      expect(libs.trackError).toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        "ERROR:",
        JSON.stringify("Required SEA Tool data missing", null, 2)
      );
    });

    it("should send data to callback with match set to false if data doesn't include appianSubmittedDate", async () => {
      const noAppianDate = {
        Payload: {
          seatoolRecord: {
            STATE_PLAN: {
              ID_NUMBER: "NC-11-020",
              SUBMISSION_DATE: 1311638400000,
            },
          },
        },
      };

      await appianCompare.handler(noAppianDate, null, callback);
      expect(callback.mock.calls[0][1].hasOwnProperty("match")).toBe(true);
      expect(callback.mock.calls[0][1]["match"]).toBe(false);
    });

    it("should send data to callback with match set to false if appianSubmittedDate and SEA Tool submisison date don't match", async () => {
      const mismatchedEvent = {
        Payload: {
          appianSubmittedDate: 1311638400000,
          seatoolRecord: {
            STATE_PLAN: {
              ID_NUMBER: "NC-11-020",
              SUBMISSION_DATE: 1111111100000,
            },
          },
        },
      };

      await appianCompare.handler(mismatchedEvent, null, callback);
      expect(callback.mock.calls[0][1].hasOwnProperty("match")).toBe(true);
      expect(callback.mock.calls[0][1]["match"]).toBe(false);
    });
  });
});
