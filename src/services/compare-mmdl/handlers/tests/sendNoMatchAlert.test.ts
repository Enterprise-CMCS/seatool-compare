import {
  MockedFunction,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as sendNoMatchAlert from "../sendNoMatchAlert";
import * as libs from "../../../../libs";
import * as getIsIgnoredState from "../utils/getIsIgnoredState";
import * as getEmailContent from "../utils/getEmailContent";

const originalEnv = process.env;

const handler = sendNoMatchAlert as { handler: Function };
const callback = vi.fn();

const testRegion = "test-region";
const testSecretId = "test-project/test-stage/mmdl-alerts";
const testSubdomain = "test-subdomain";
const testPK = "test-pk";
const testTN = "test-tn";

const event = { Payload: { PK: testPK, TN: testTN } };

const testSourceEmail = "source@example.com";
const mockSecretsValue = {
  CHP: {
    ToAddresses: ["test@example.com"],
    CcAddresses: [
      { email: "cc@example.com", alertIfGreaterThanSeconds: 10000 },
    ],
  },
  nonCHP: {
    ToAddresses: ["test@example.com"],
    CcAddresses: [
      { email: "cc@example.com", alertIfGreaterThanSeconds: 10000 },
    ],
  },
  sourceEmail: testSourceEmail,
};

const testEmailContent = {
  htmlData: "test-html-data",
  textData: "test-text-data",
};

const testEmailBody = {
  Html: {
    Data: "HTML data",
  },
  Text: {
    Data: "Plain text data",
  },
};

// Mock email values
const ToAddresses = ["test@example.com"];
const CcAddresses = ["cc@example.com"];
const sourceEmail = "source@example.com";
const subjectText = `${testTN} - ACTION REQUIRED - No matching record in SEA Tool`;

const testEmailParams = {
  Destination: {
    ToAddresses,
    CcAddresses,
  },
  Source: sourceEmail,
  Message: {
    Body: testEmailBody,
    Subject: {
      Data: subjectText,
    },
  },
};

vi.mock("../../../../libs", async () => {
  return {
    doesSecretExist: vi.fn(),
    getEmailBody: vi.fn().mockImplementation(() => testEmailBody),
    getEmailParams: vi.fn().mockImplementation(() => testEmailParams),
    getSecretsValue: vi.fn(),
    putLogsEvent: vi.fn(),
    sendAlert: vi.fn(),
    trackError: vi.fn(),
  };
});

describe("sendNoMatchAlert", async () => {
  beforeEach(() => {
    process.env = {
      ...originalEnv,
      project: "test-project",
      region: testRegion,
      seatoolSubdomain: testSubdomain,
      stage: "test-stage",
    };

    vi.spyOn(console, "log");
    vi.spyOn(getIsIgnoredState, "getIsIgnoredState").mockImplementation(
      () => false
    );
    vi.spyOn(getEmailContent, "getEmailContent").mockImplementation(
      () => testEmailContent
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("throws an error if process.env.region is not set", async () => {
    process.env.region = undefined;
    await expect(() =>
      handler.handler(event, null, callback)
    ).rejects.toThrowError("process.env.region needs to be defined.");
  });

  it("logs the received event", async () => {
    await handler.handler(event, null, callback);
    expect(console.log).toBeCalledWith(
      "Received event:",
      JSON.stringify(event, null, 2)
    );
  });

  it("throws and error if data.TN does not exist", async () => {
    const badEvent = { Payload: {} };
    await expect(() =>
      handler.handler(badEvent, null, callback)
    ).rejects.toThrowError("transmittal number required to get email content");
  });

  it("calls doesSecretExist with the expected parameters", async () => {
    await handler.handler(event, null, callback);
    expect(libs.doesSecretExist).toBeCalledWith(testRegion, testSecretId);
  });

  it("calls getIsIgnoredState with the expected parameters", async () => {
    await handler.handler(event, null, callback);
    expect(getIsIgnoredState.getIsIgnoredState).toBeCalledWith(event.Payload);
  });

  it("calls getEmailContent with the expected parameters", async () => {
    await handler.handler(event, null, callback);
    expect(getEmailContent.getEmailContent).toBeCalledWith({
      id: testTN,
      isUrgent: false,
      isCHP: false,
      seatoolSubdomain: testSubdomain,
    });
  });

  it("calls getEmailBody with the expected parameters", async () => {
    await handler.handler(event, null, callback);
    expect(libs.getEmailBody).toBeCalledWith(testEmailContent);
  });

  describe("when secretExists is false", () => {
    beforeEach(() => {
      (
        libs.doesSecretExist as MockedFunction<typeof libs.doesSecretExist>
      ).mockResolvedValue(false);
    });

    it("calls getEmailParams with the expected parameters", async () => {
      await handler.handler(event, null, callback);
      expect(libs.getEmailParams).toBeCalledWith({
        Body: testEmailBody,
        id: testTN,
      });
    });

    it("logs a message that email was not sent", async () => {
      await handler.handler(event, null, callback);
      expect(console.log).toBeCalledWith(
        "EMAIL NOT SENT - Secret does not exist for this stage. Example email details:",
        JSON.stringify(testEmailParams, null, 2)
      );
    });

    it("calls putLogsEvent with the expected parameters", async () => {
      await handler.handler(event, null, callback);
      expect(libs.putLogsEvent).toBeCalledWith({
        type: "NOTFOUND-MMDL",
        message:
          "Alert for id: test-pk with transmittal number: test-tn - TEST ",
      });
    });
  });

  describe("when secretExists is true", () => {
    beforeEach(() => {
      (
        libs.doesSecretExist as MockedFunction<typeof libs.doesSecretExist>
      ).mockResolvedValue(true);

      (
        libs.getSecretsValue as MockedFunction<typeof libs.getSecretsValue>
      ).mockResolvedValue(mockSecretsValue);
    });

    it("calls getSecretsValue with the expected params", async () => {
      await handler.handler(event, null, callback);
      expect(libs.getSecretsValue).toBeCalledWith(testRegion, testSecretId);
    });

    it("calls getEmailParams with the expected parameters", async () => {
      await handler.handler(event, null, callback);
      expect(libs.getEmailParams).toBeCalledWith({
        Body: testEmailBody,
        CcAddresses: [],
        ToAddresses: ["test@example.com"],
        id: testTN,
        sourceEmail: testSourceEmail,
        subjectText: subjectText,
      });
    });

    it("calls sendAlert", async () => {
      await handler.handler(event, null, callback);
      expect(libs.sendAlert).toBeCalledWith(testEmailParams);
    });

    it("calls putLogsEvent as expected when the email is sent", async () => {
      await handler.handler(event, null, callback);
      expect(libs.putLogsEvent).toBeCalledWith({
        type: "NOTFOUND-MMDL",
        message: `Alert for id: test-pk with transmittal number: test-tn - to ${[
          ...["test@example.com"],
        ].join(", ")}.`,
      });
    });

    it("sends the expected data to the callback", async () => {
      await handler.handler(event, null, callback);
      expect(callback.mock.calls[0][1]).toEqual({
        PK: testPK,
        TN: testTN,
      });
    });
  });
});
