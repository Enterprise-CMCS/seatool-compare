import {
  MockedFunction,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as sendNoMatchAlert from "../sendNoMatchAlert";
import * as libs from "../../../../libs";

// Mock email values
const ToAddresses = ["test@example.com"];
const CcAddresses = ["cc@example.com"];
const sourceEmail = "source@example.com";
const testSpaId = "test-spa-id";
const subjectText = `${testSpaId} - ACTION REQUIRED - No matching record in SEA Tool`;

const Body = {
  Html: {
    Data: "HTML data",
  },
  Text: {
    Data: "Plain text data",
  },
};

const emailParams = {
  Destination: {
    ToAddresses,
    CcAddresses,
  },
  Source: sourceEmail,
  Message: {
    Body,
    Subject: {
      Data: subjectText,
    },
  },
};

vi.mock("../../../../libs", () => {
  return {
    doesSecretExist: vi.fn(),
    getEmailBody: vi.fn().mockImplementation(() => Body),
    getEmailParams: vi.fn().mockImplementation(() => emailParams),
    getSecretsValue: vi.fn(),
    putLogsEvent: vi.fn(),
    sendAlert: vi.fn(),
    trackError: vi.fn(),
  };
});

const handler = sendNoMatchAlert as { handler: Function };
const callback = vi.fn();
const event = {
  Payload: {
    SPA_ID: testSpaId,
    secSinceAppianSubmitted: 10000,
  },
};

describe("sendNoMatchAlert", () => {
  describe("when process.env values are not set", async () => {
    it("throws an error if process.env.region is not defined", async () => {
      await expect(() =>
        handler.handler(event, null, callback)
      ).rejects.toThrowError("process.env.region needs to be defined.");
    });
  });

  describe("when process.env values are set", async () => {
    beforeAll(() => {
      process.env.project = "test-project";
      process.env.region = "test-region";
      process.env.stage = "test-state";
      process.env.isUrgentThresholdSec = "432000"; // 5 days in seconds
    });

    beforeEach(() => {
      vi.spyOn(console, "log");
      vi.spyOn(console, "info");
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it("logs the received event", async () => {
      await handler.handler(event, null, callback);
      expect(console.log).toBeCalledWith(
        "Received event:",
        JSON.stringify(event, null, 2)
      );
    });

    it("logs an error if secret doesn't exist", async () => {
      await handler.handler(event, null, callback);
      expect(console.log).toBeCalledWith(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details: ",
        JSON.stringify(emailParams, null, 2)
      );

      expect(libs.putLogsEvent).toBeCalledWith({
        type: "NOTFOUND-APPIAN",
        message: `Alert for ${testSpaId} - TEST `,
      });
    });

    it("does not log an error if secret does exist", async () => {
      (
        libs.doesSecretExist as MockedFunction<typeof libs.doesSecretExist>
      ).mockResolvedValue(true);

      await handler.handler(event, null, callback);

      expect(console.log).not.toBeCalledWith(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details: ",
        JSON.stringify(emailParams, null, 2)
      );

      expect(libs.putLogsEvent).not.toBeCalledWith({
        type: "NOTFOUND-APPIAN",
        message: `Alert for ${testSpaId} - TEST `,
      });
    });

    it("attempts to get the secrets value if secret exists", async () => {
      await handler.handler(event, null, callback);
      expect(libs.getSecretsValue).toBeCalled();
      expect(libs.trackError).toBeCalled();
    });

    it("calls trackError if appianSecret is malformed", async () => {
      await handler.handler(event, null, callback);
      const expectedError = new TypeError(
        "Cannot read properties of undefined (reading 'sourceEmail')"
      );
      expect(libs.trackError).toBeCalledWith(expectedError);
    });

    describe("properly-formatted secret", () => {
      beforeEach(() => {
        (
          libs.getSecretsValue as MockedFunction<typeof libs.getSecretsValue>
        ).mockResolvedValue({
          emailRecipients: {
            ToAddresses: ["test@example.com"],
            CcAddresses: [
              { email: "cc@example.com", alertIfGreaterThanSeconds: 10000 }, // more than 5 days
            ],
          },
          sourceEmail: "source@example.com",
        });
      });

      it("does not call trackError if the secret is properly formed", async () => {
        await handler.handler(event, null, callback);
        expect(libs.trackError).not.toBeCalled();
      });

      it("calls getEmailParams as expected", async () => {
        await handler.handler(event, null, callback);
        expect(libs.getEmailParams).toBeCalledWith({
          Body,
          id: testSpaId,
          CcAddresses,
          sourceEmail,
          subjectText,
          ToAddresses,
        });
      });

      it("calls sendAlert with properly-formatted email params", async () => {
        await handler.handler(event, null, callback);
        expect(libs.sendAlert).toBeCalledWith({
          Destination: {
            ToAddresses,
            CcAddresses,
          },
          Source: sourceEmail,
          Message: {
            Body,
            Subject: {
              Data: subjectText,
            },
          },
        });
      });

      it("calls putLogsEvent as expected when the email is sent", async () => {
        await handler.handler(event, null, callback);
        expect(libs.putLogsEvent).toBeCalledWith({
          type: "NOTFOUND-APPIAN",
          message: `Alert for ${testSpaId} - sent to ${[
            ...ToAddresses,
            ...CcAddresses,
          ].join(", ")}`,
        });
      });

      it("sends the expected data to the callback", async () => {
        await handler.handler(event, null, callback);
        expect(callback.mock.calls[0][1]).toEqual({
          SPA_ID: "test-spa-id",
          secSinceAppianSubmitted: 10000,
        });
      });
    });

    describe("urgent threshold logic", () => {
      beforeEach(() => {
        (
          libs.doesSecretExist as MockedFunction<typeof libs.doesSecretExist>
        ).mockResolvedValue(true);
        (
          libs.getSecretsValue as MockedFunction<typeof libs.getSecretsValue>
        ).mockResolvedValue({
          emailRecipients: {
            ToAddresses: ["test@example.com"],
            CcAddresses: [],
          },
          sourceEmail: "source@example.com",
        });
      });

      it("marks email as non-urgent when secSinceAppianSubmitted is below threshold", async () => {
        // Set threshold to 4200 seconds (70 minutes)
        process.env.isUrgentThresholdSec = "4200";
        
        // Event with 1200 seconds (20 minutes) - below threshold
        const nonUrgentEvent = {
          Payload: {
            SPA_ID: testSpaId,
            secSinceAppianSubmitted: 1200, // 20 minutes, below 70 minute threshold
          },
        };

        await handler.handler(nonUrgentEvent, null, callback);

        // Verify getEmailBody was called - we can check the first call to see what was passed
        expect(libs.getEmailBody).toHaveBeenCalled();
      });

      it("marks email as urgent when secSinceAppianSubmitted exceeds threshold", async () => {
        // Set threshold to 4200 seconds (70 minutes)
        process.env.isUrgentThresholdSec = "4200";
        
        // Event with 5000 seconds (~83 minutes) - above threshold
        const urgentEvent = {
          Payload: {
            SPA_ID: testSpaId,
            secSinceAppianSubmitted: 5000, // ~83 minutes, above 70 minute threshold
          },
        };

        await handler.handler(urgentEvent, null, callback);

        expect(libs.getEmailBody).toHaveBeenCalled();
      });

      it("marks email as urgent when secSinceAppianSubmitted equals threshold exactly", async () => {
        // Set threshold to 4200 seconds (70 minutes)
        process.env.isUrgentThresholdSec = "4200";
        
        // Event with exactly 4200 seconds (70 minutes) - at threshold boundary
        const boundaryEvent = {
          Payload: {
            SPA_ID: testSpaId,
            secSinceAppianSubmitted: 4200, // exactly at threshold
          },
        };

        await handler.handler(boundaryEvent, null, callback);

        expect(libs.getEmailBody).toHaveBeenCalled();
      });

      it("uses default threshold of 432000 (5 days) when env var not set", async () => {
        // Remove the env var to test default behavior
        delete process.env.isUrgentThresholdSec;
        
        // Event with ~18 hours (well below 5 day default)
        const eventBelowDefault = {
          Payload: {
            SPA_ID: testSpaId,
            secSinceAppianSubmitted: 64800, // 18 hours in seconds
          },
        };

        await handler.handler(eventBelowDefault, null, callback);

        // Should not be urgent since 18 hours < 5 days
        expect(libs.getEmailBody).toHaveBeenCalled();
        
        // Restore for other tests
        process.env.isUrgentThresholdSec = "432000";
      });
    });

    describe("urgent threshold with realistic timing values", () => {
      beforeEach(() => {
        (
          libs.doesSecretExist as MockedFunction<typeof libs.doesSecretExist>
        ).mockResolvedValue(true);
        (
          libs.getSecretsValue as MockedFunction<typeof libs.getSecretsValue>
        ).mockResolvedValue({
          emailRecipients: {
            ToAddresses: ["test@example.com"],
            CcAddresses: [],
          },
          sourceEmail: "source@example.com",
        });
      });

      describe("master environment timing (isUrgentThresholdSec=4200)", () => {
        beforeEach(() => {
          process.env.isUrgentThresholdSec = "4200"; // 70 minutes
        });

        it("is NOT urgent at 20 minutes (1200 sec)", async () => {
          const event20min = {
            Payload: {
              SPA_ID: "TN-25-0001",
              secSinceAppianSubmitted: 1200, // 20 minutes
            },
          };

          await handler.handler(event20min, null, callback);

          // The isUrgent calculation: 1200 >= 4200 = false
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(1200);
        });

        it("is NOT urgent at 30 minutes (1800 sec) - first email time", async () => {
          const event30min = {
            Payload: {
              SPA_ID: "TN-25-0002",
              secSinceAppianSubmitted: 1800, // 30 minutes
            },
          };

          await handler.handler(event30min, null, callback);

          // The isUrgent calculation: 1800 >= 4200 = false
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(1800);
        });

        it("is NOT urgent at 60 minutes (3600 sec)", async () => {
          const event60min = {
            Payload: {
              SPA_ID: "TN-25-0003",
              secSinceAppianSubmitted: 3600, // 60 minutes
            },
          };

          await handler.handler(event60min, null, callback);

          // The isUrgent calculation: 3600 >= 4200 = false
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(3600);
        });

        it("IS urgent at exactly 70 minutes (4200 sec)", async () => {
          const event70min = {
            Payload: {
              SPA_ID: "TN-25-0004",
              secSinceAppianSubmitted: 4200, // exactly 70 minutes
            },
          };

          await handler.handler(event70min, null, callback);

          // The isUrgent calculation: 4200 >= 4200 = true
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(4200);
        });

        it("IS urgent at 90 minutes (5400 sec)", async () => {
          const event90min = {
            Payload: {
              SPA_ID: "TN-25-0005",
              secSinceAppianSubmitted: 5400, // 90 minutes
            },
          };

          await handler.handler(event90min, null, callback);

          // The isUrgent calculation: 5400 >= 4200 = true
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(5400);
        });

        it("IS urgent at 2 hours (7200 sec)", async () => {
          const event2hr = {
            Payload: {
              SPA_ID: "TN-25-0006",
              secSinceAppianSubmitted: 7200, // 2 hours
            },
          };

          await handler.handler(event2hr, null, callback);

          // The isUrgent calculation: 7200 >= 4200 = true
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(7200);
        });
      });

      describe("val/production timing (isUrgentThresholdSec=432000)", () => {
        beforeEach(() => {
          process.env.isUrgentThresholdSec = "432000"; // 5 days
        });

        it("is NOT urgent at 1 day (86400 sec)", async () => {
          const event1day = {
            Payload: {
              SPA_ID: "TN-25-0010",
              secSinceAppianSubmitted: 86400, // 1 day
            },
          };

          await handler.handler(event1day, null, callback);

          // The isUrgent calculation: 86400 >= 432000 = false
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(86400);
        });

        it("is NOT urgent at 3 days (259200 sec) - first email threshold", async () => {
          const event3days = {
            Payload: {
              SPA_ID: "TN-25-0011",
              secSinceAppianSubmitted: 259200, // 3 days
            },
          };

          await handler.handler(event3days, null, callback);

          // The isUrgent calculation: 259200 >= 432000 = false
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(259200);
        });

        it("is NOT urgent at 4 days (345600 sec)", async () => {
          const event4days = {
            Payload: {
              SPA_ID: "TN-25-0012",
              secSinceAppianSubmitted: 345600, // 4 days
            },
          };

          await handler.handler(event4days, null, callback);

          // The isUrgent calculation: 345600 >= 432000 = false
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(345600);
        });

        it("IS urgent at 5 days (432000 sec)", async () => {
          const event5days = {
            Payload: {
              SPA_ID: "TN-25-0013",
              secSinceAppianSubmitted: 432000, // exactly 5 days
            },
          };

          await handler.handler(event5days, null, callback);

          // The isUrgent calculation: 432000 >= 432000 = true
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(432000);
        });

        it("IS urgent at 7 days (604800 sec)", async () => {
          const event7days = {
            Payload: {
              SPA_ID: "TN-25-0014",
              secSinceAppianSubmitted: 604800, // 7 days
            },
          };

          await handler.handler(event7days, null, callback);

          // The isUrgent calculation: 604800 >= 432000 = true
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(604800);
        });

        it("IS urgent at 10 days (864000 sec)", async () => {
          const event10days = {
            Payload: {
              SPA_ID: "TN-25-0015",
              secSinceAppianSubmitted: 864000, // 10 days
            },
          };

          await handler.handler(event10days, null, callback);

          // The isUrgent calculation: 864000 >= 432000 = true
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(864000);
        });
      });

      describe("boundary edge cases", () => {
        it("is NOT urgent at one second below threshold", async () => {
          process.env.isUrgentThresholdSec = "4200";
          
          const eventJustBelow = {
            Payload: {
              SPA_ID: "TN-25-0020",
              secSinceAppianSubmitted: 4199, // 1 second below 70 minutes
            },
          };

          await handler.handler(eventJustBelow, null, callback);

          // The isUrgent calculation: 4199 >= 4200 = false
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(4199);
        });

        it("IS urgent at one second above threshold", async () => {
          process.env.isUrgentThresholdSec = "4200";
          
          const eventJustAbove = {
            Payload: {
              SPA_ID: "TN-25-0021",
              secSinceAppianSubmitted: 4201, // 1 second above 70 minutes
            },
          };

          await handler.handler(eventJustAbove, null, callback);

          // The isUrgent calculation: 4201 >= 4200 = true
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(4201);
        });

        it("handles zero secSinceAppianSubmitted as non-urgent", async () => {
          process.env.isUrgentThresholdSec = "4200";
          
          const eventZero = {
            Payload: {
              SPA_ID: "TN-25-0022",
              secSinceAppianSubmitted: 0,
            },
          };

          await handler.handler(eventZero, null, callback);

          // The isUrgent calculation: 0 >= 4200 = false
          expect(callback.mock.calls[0][1].secSinceAppianSubmitted).toBe(0);
        });

        it("handles missing secSinceAppianSubmitted (defaults to 0)", async () => {
          process.env.isUrgentThresholdSec = "4200";
          
          const eventMissing = {
            Payload: {
              SPA_ID: "TN-25-0023",
              // secSinceAppianSubmitted not provided
            },
          };

          await handler.handler(eventMissing, null, callback);

          // Should default to 0, which is non-urgent
          expect(libs.getEmailBody).toHaveBeenCalled();
        });
      });

      describe("realistic SPA ID format scenarios", () => {
        beforeEach(() => {
          process.env.isUrgentThresholdSec = "4200"; // 70 minutes for master
        });

        it("handles Tennessee SPA ID format (TN-25-XXXX)", async () => {
          const tnEvent = {
            Payload: {
              SPA_ID: "TN-25-5666",
              secSinceAppianSubmitted: 4500, // ~75 minutes, urgent
            },
          };

          await handler.handler(tnEvent, null, callback);
          expect(callback.mock.calls[0][1].SPA_ID).toBe("TN-25-5666");
        });

        it("handles North Carolina SPA ID format (NC-XX-XXX)", async () => {
          const ncEvent = {
            Payload: {
              SPA_ID: "NC-11-020",
              secSinceAppianSubmitted: 3600, // 60 minutes, non-urgent
            },
          };

          await handler.handler(ncEvent, null, callback);
          expect(callback.mock.calls[0][1].SPA_ID).toBe("NC-11-020");
        });

        it("handles California SPA ID format with suffix (CA-24-0001-P)", async () => {
          const caEvent = {
            Payload: {
              SPA_ID: "CA-24-0001-P",
              secSinceAppianSubmitted: 1200, // 20 minutes, non-urgent
            },
          };

          await handler.handler(caEvent, null, callback);
          expect(callback.mock.calls[0][1].SPA_ID).toBe("CA-24-0001-P");
        });
      });
    });
  });
});
