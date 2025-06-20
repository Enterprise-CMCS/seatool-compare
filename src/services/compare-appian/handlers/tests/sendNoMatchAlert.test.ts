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
  });
});
