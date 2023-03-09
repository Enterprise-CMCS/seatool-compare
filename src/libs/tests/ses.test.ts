import { getEmailParams, sendAlert, sendAttachment } from "../ses-lib";
import { it, describe, expect, beforeEach, vi } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClientMock = mockClient(SESClient);
const sesResponse = {
  $metadata: {
    httpStatusCode: 200,
    requestId: "d8680883-37ca-49e4-8619-e43d1e3a391b",
    attempts: 1,
    totalRetryDelay: 0,
  },
};
describe("sns lib", () => {
  beforeEach(() => {
    process.env.region = "test-region";
  });

  it("should successfully return a response object when an email successfully sends", async () => {
    sesClientMock.on(SendEmailCommand).resolves(sesResponse);

    const response = await sendAlert({
      Source: "email@gmail.com",
      Destination: { ToAddresses: [], CcAddresses: [], BccAddresses: [] },
      Message: { Body: {}, Subject: { Data: "test" } },
    });

    expect(response).toEqual(sesResponse);
  });

  it("should successfully return a response object when an attachment successfully sends", async () => {
    vi.mock("nodemailer", () => ({
      createTransport: vi.fn().mockReturnValue({
        sendMail: vi.fn().mockReturnValue({
          $metadata: {
            httpStatusCode: 200,
            requestId: "d8680883-37ca-49e4-8619-e43d1e3a391b",
            attempts: 1,
            totalRetryDelay: 0,
          },
        }),
      }),
    }));

    const response = await sendAttachment({
      from: "noreply@cms.hhs.gov",
      subject: `Appian SEA Tool Status`,
      html:
        `<p>Attached is a csv indicating the current status of Appian and SEA Tool records.</p>` +
        `<p>This report can be opened in your favorite spreadsheet viewing application.</p>`,
      to: "test@gmail.com",
      attachments: [
        {
          filename: `Appian SEA Tool Status`,
        },
      ],
    });

    expect(response).toEqual(sesResponse);
  });

  it("should return email params", async () => {
    const response = getEmailParams({
      ToAddresses: [],
      CcAddresses: [],
      sourceEmail: "test@gmail.com",
      Body: {},
      id: "test",
    });

    expect(response).toEqual({
      Destination: {
        CcAddresses: [],
        ToAddresses: [],
      },
      Source: "test@gmail.com",
      Message: {
        Body: {},
        Subject: {
          Data: "Attention Required",
        },
      },
    });
  });
});
