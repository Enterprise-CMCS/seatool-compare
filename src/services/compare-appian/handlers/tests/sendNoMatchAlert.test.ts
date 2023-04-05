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
import {
  doesSecretExist,
  getEmailParams,
  getSecretsValue,
  putLogsEvent,
  trackError,
} from "../../../../libs";

const body = {
  Html: {
    Data: "HTML data",
  },
  Text: {
    Data: "Plain text data",
  },
};

const CcAddresses = ["cc@example.com"];

const emailParams = {
  Destination: {
    ToAddresses: ["test@example.com"],
    CcAddresses,
  },
  Source: "source@example.com",
  Message: {
    Body: body,
    Subject: {
      Data: "Subject Line",
    },
  },
};

const testSpaId = "test-spa-id";

vi.mock("../../../../libs", () => {
  return {
    doesSecretExist: vi.fn(),
    getEmailBody: vi.fn().mockImplementation(() => body),
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

      expect(putLogsEvent).toBeCalledWith({
        type: "NOTFOUND-APPIAN",
        message: `Alert for ${testSpaId} - TEST `,
      });
    });

    it("does not log an error if secret does exist", async () => {
      (
        doesSecretExist as MockedFunction<typeof doesSecretExist>
      ).mockResolvedValue(true);

      await handler.handler(event, null, callback);

      expect(console.log).not.toBeCalledWith(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details: ",
        JSON.stringify(emailParams, null, 2)
      );

      expect(putLogsEvent).not.toBeCalledWith({
        type: "NOTFOUND-APPIAN",
        message: `Alert for ${testSpaId} - TEST `,
      });
    });

    it("attempts to get the secrets value if secret exists", async () => {
      await handler.handler(event, null, callback);
      expect(getSecretsValue).toBeCalled();
      expect(trackError).toBeCalled();
    });

    it("calls trackError if appianSecret is malformed", async () => {
      await handler.handler(event, null, callback);
      const expectedError = new Error(
        "Cannot read properties of undefined (reading 'sourceEmail')"
      );
      expect(trackError).toBeCalledWith(expectedError);
    });

    describe("properly-formatted secret", () => {
      beforeEach(() => {
        (
          getSecretsValue as MockedFunction<typeof getSecretsValue>
        ).mockResolvedValue({
          emailRecipients: {
            ToAddresses: ["test@example.com"],
            CcAddresses: [
              { email: "cc@example.com", alertIfGreaterThanSeconds: 1000 },
            ],
          },
          sourceEmail: "source@example.com",
        });
      });

      it("does not call trackError if the secret is properly formed", async () => {
        await handler.handler(event, null, callback);
        expect(trackError).not.toBeCalled();
      });

      it("calls getEmailParams as expected", async () => {
        await handler.handler(event, null, callback);
        expect(getEmailParams).toBeCalledWith({
          Body: body,
          id: testSpaId,
          CcAddresses,
        });
      });

      it("calls sendAlert with properly-formatted email params", async () => {});

      it("handles errors thrown by sendAlert", async () => {});

      it("calls putLogsEvent when the email is sent", async () => {});

      it("sends the expected data to the callback", async () => {});
    });
  });
});
