import { trackError } from "../sns-lib";
import { it, describe, expect } from "vitest";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { mockClient } from "aws-sdk-client-mock";

const snsClientMock = mockClient(SNSClient);

describe("sns lib", () => {
  it("should return the error object when calling trackError", async () => {
    const snsResponse = {
      $metadata: {
        httpStatusCode: 500,
        requestId: "d8680883-37ca-49e4-8619-e43d1e3a391b",
        attempts: 1,
        totalRetryDelay: 0,
      },
    };

    snsClientMock.on(PublishCommand).resolves(snsResponse);

    const response = await trackError(new Error("test"));

    expect(response).toEqual(snsResponse);
  });
});
