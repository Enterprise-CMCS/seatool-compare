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
            CRNT_STUS: "Submitted",
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

  describe("environment-specific timing calculation", () => {
    const FIXED_NOW = new Date("2025-12-15T10:00:00.000Z").getTime();
    const localCallback = vi.fn();

    beforeEach(() => {
      // Reset all mocks including any spies from previous describe blocks
      vi.restoreAllMocks();
      vi.useFakeTimers();
      vi.setSystemTime(FIXED_NOW);
      vi.spyOn(console, "log").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(libs, "trackError").mockImplementation(async () => {});
      process.env.appianTableName = "table-name";
      localCallback.mockClear();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.clearAllMocks();
      delete process.env.skipWait;
    });

    describe("master environment (skipWait=true)", () => {
      beforeEach(() => {
        process.env.skipWait = "true";
      });

      it("uses eligibleAt when present for secSinceAppianSubmitted", async () => {
        // eligibleAt was 30 minutes ago
        const eligibleAt = FIXED_NOW - 30 * 60 * 1000; // 30 minutes ago
        const eventWithEligibleAt = {
          Payload: {
            PK: "TN-25-0001-O#v1",
            SK: "Appian",
            eligibleAt,
          },
        };

        const appianRecord = {
          PK: "TN-25-0001-O#v1",
          SK: "Appian",
          payload: {
            SBMSSN_DATE: FIXED_NOW - 24 * 60 * 60 * 1000, // 1 day ago (should be ignored)
            SPA_ID: "TN-25-0001",
            SPA_PCKG_ID: "TN-25-0001-O",
            CRNT_STUS: "Submitted",
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(appianRecord);

        await handler.handler(eventWithEligibleAt, null, localCallback);

        const result = localCallback.mock.calls[0][1];
        // Should be ~1800 seconds (30 minutes), not ~86400 (1 day)
        expect(result.secSinceAppianSubmitted).toBe(1800);
      });

      it("falls back to SBMSSN_DATE when eligibleAt is missing", async () => {
        const eventWithoutEligibleAt = {
          Payload: {
            PK: "TN-25-0002-O#v1",
            SK: "Appian",
            // no eligibleAt
          },
        };

        const sbmssnDate = FIXED_NOW - 45 * 60 * 1000; // 45 minutes ago
        const appianRecord = {
          PK: "TN-25-0002-O#v1",
          SK: "Appian",
          payload: {
            SBMSSN_DATE: sbmssnDate,
            SPA_ID: "TN-25-0002",
            SPA_PCKG_ID: "TN-25-0002-O",
            CRNT_STUS: "Submitted",
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(appianRecord);

        await handler.handler(eventWithoutEligibleAt, null, localCallback);

        const result = localCallback.mock.calls[0][1];
        // Should use SBMSSN_DATE = 45 minutes = 2700 seconds
        expect(result.secSinceAppianSubmitted).toBe(2700);
      });

      it("calculates accurate minute-level timing from eligibleAt", async () => {
        // Test at various master environment timing boundaries
        const timingScenarios = [
          { minutesAgo: 10, expectedSeconds: 600 },   // First check
          { minutesAgo: 20, expectedSeconds: 1200 },  // sinceSubmissionChoiceSec threshold
          { minutesAgo: 30, expectedSeconds: 1800 },  // First email
          { minutesAgo: 70, expectedSeconds: 4200 },  // Urgent threshold
          { minutesAgo: 90, expectedSeconds: 5400 },  // After urgent
        ];

        for (const { minutesAgo, expectedSeconds } of timingScenarios) {
          localCallback.mockClear();

          const eligibleAt = FIXED_NOW - minutesAgo * 60 * 1000;
          const eventWithTiming = {
            Payload: {
              PK: `TN-25-TEST-O#v1`,
              SK: "Appian",
              eligibleAt,
            },
          };

          const appianRecord = {
            PK: `TN-25-TEST-O#v1`,
            SK: "Appian",
            payload: {
              SBMSSN_DATE: FIXED_NOW - 100 * 24 * 60 * 60 * 1000, // Old date to verify it's ignored
              SPA_ID: "TN-25-TEST",
              SPA_PCKG_ID: "TN-25-TEST-O",
              CRNT_STUS: "Submitted",
            },
          };

          vi.spyOn(libs, "getItem").mockResolvedValue(appianRecord);

          await handler.handler(eventWithTiming, null, localCallback);

          const result = localCallback.mock.calls[0][1];
          expect(result.secSinceAppianSubmitted).toBe(expectedSeconds);
        }
      });
    });

    describe("val/production environment (skipWait=false)", () => {
      beforeEach(() => {
        process.env.skipWait = "false";
      });

      it("always uses SBMSSN_DATE regardless of eligibleAt", async () => {
        const sbmssnDate = FIXED_NOW - 4 * 24 * 60 * 60 * 1000; // 4 days ago
        const eligibleAt = FIXED_NOW - 30 * 60 * 1000; // 30 minutes ago (should be ignored)

        const eventWithEligibleAt = {
          Payload: {
            PK: "TN-25-0003-O#v1",
            SK: "Appian",
            eligibleAt,
          },
        };

        const appianRecord = {
          PK: "TN-25-0003-O#v1",
          SK: "Appian",
          payload: {
            SBMSSN_DATE: sbmssnDate,
            SPA_ID: "TN-25-0003",
            SPA_PCKG_ID: "TN-25-0003-O",
            CRNT_STUS: "Submitted",
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(appianRecord);

        await handler.handler(eventWithEligibleAt, null, localCallback);

        const result = localCallback.mock.calls[0][1];
        // Should be ~345600 seconds (4 days), not 1800 (30 min)
        expect(result.secSinceAppianSubmitted).toBe(345600);
      });

      it("calculates day-level timing from SBMSSN_DATE", async () => {
        // Test at various val/production timing boundaries
        const timingScenarios = [
          { daysAgo: 2, expectedSeconds: 172800 },   // Initial wait
          { daysAgo: 3, expectedSeconds: 259200 },   // sinceSubmissionChoiceSec threshold
          { daysAgo: 5, expectedSeconds: 432000 },   // Urgent threshold
          { daysAgo: 7, expectedSeconds: 604800 },   // After urgent
        ];

        for (const { daysAgo, expectedSeconds } of timingScenarios) {
          localCallback.mockClear();

          const sbmssnDate = FIXED_NOW - daysAgo * 24 * 60 * 60 * 1000;
          const eventWithTiming = {
            Payload: {
              PK: `TN-25-TEST-O#v1`,
              SK: "Appian",
              eligibleAt: FIXED_NOW - 5 * 60 * 1000, // Should be ignored
            },
          };

          const appianRecord = {
            PK: `TN-25-TEST-O#v1`,
            SK: "Appian",
            payload: {
              SBMSSN_DATE: sbmssnDate,
              SPA_ID: "TN-25-TEST",
              SPA_PCKG_ID: "TN-25-TEST-O",
              CRNT_STUS: "Submitted",
            },
          };

          vi.spyOn(libs, "getItem").mockResolvedValue(appianRecord);

          await handler.handler(eventWithTiming, null, localCallback);

          const result = localCallback.mock.calls[0][1];
          expect(result.secSinceAppianSubmitted).toBe(expectedSeconds);
        }
      });
    });

    describe("skipWait not set (default behavior)", () => {
      beforeEach(() => {
        delete process.env.skipWait;
      });

      it("falls back to SBMSSN_DATE when skipWait is undefined", async () => {
        const sbmssnDate = FIXED_NOW - 60 * 60 * 1000; // 1 hour ago
        const eligibleAt = FIXED_NOW - 10 * 60 * 1000; // 10 minutes ago

        const eventWithEligibleAt = {
          Payload: {
            PK: "TN-25-0004-O#v1",
            SK: "Appian",
            eligibleAt,
          },
        };

        const appianRecord = {
          PK: "TN-25-0004-O#v1",
          SK: "Appian",
          payload: {
            SBMSSN_DATE: sbmssnDate,
            SPA_ID: "TN-25-0004",
            SPA_PCKG_ID: "TN-25-0004-O",
            CRNT_STUS: "Submitted",
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(appianRecord);

        await handler.handler(eventWithEligibleAt, null, localCallback);

        const result = localCallback.mock.calls[0][1];
        // Should use SBMSSN_DATE = 1 hour = 3600 seconds
        expect(result.secSinceAppianSubmitted).toBe(3600);
      });
    });
  });
});

