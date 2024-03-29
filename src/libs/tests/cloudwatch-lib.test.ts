import { it, describe, expect, beforeEach, afterEach } from "vitest";
import { sendMetricData, putLogsEvent } from "../cloudwatch-lib";
import {
  PutMetricDataCommand,
  CloudWatchClient,
} from "@aws-sdk/client-cloudwatch";
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { mockClient } from "aws-sdk-client-mock";

const cloudWatchClientMock = mockClient(CloudWatchClient);
const cloudWatchClientLogMock = mockClient(CloudWatchLogsClient);

describe("sendMetricData", () => {
  beforeEach(() => {
    process.env.region = "test-region";
    process.env.sesLogGroupName = "test-group";
  });
  afterEach(() => {
    cloudWatchClientMock.reset();
    cloudWatchClientLogMock.reset();
  });

  it("should return successful metric response", async () => {
    const metricResponse = {
      $metadata: {
        httpStatusCode: 200,
        requestId: "d8680883-37ca-49e4-8619-e43d1e3a391b",
        attempts: 1,
        totalRetryDelay: 0,
      },
    };
    cloudWatchClientMock.on(PutMetricDataCommand).resolves(metricResponse);

    const result = await sendMetricData({
      Namespace: "test",
      MetricData: [{ MetricName: "name" }],
    });

    expect(result).toEqual(metricResponse);
  });

  it("should unsuccessfuly put metric response", async () => {
    cloudWatchClientMock.on(PutMetricDataCommand).rejects("error");

    const result = await sendMetricData({
      Namespace: "test",
      MetricData: [{ MetricName: "name" }],
    });

    expect(result).toBeUndefined();
  });

  it("should return a successful put of an error log", async () => {
    const metricResponse = {
      $metadata: {
        httpStatusCode: 200,
        requestId: "d8680883-37ca-49e4-8619-e43d1e3a391b",
        attempts: 1,
        totalRetryDelay: 0,
      },
    };
    cloudWatchClientLogMock.on(PutLogEventsCommand).resolves(metricResponse);

    const result = await putLogsEvent({
      type: "NOMATCH-APPIAN",
      message: "Error",
    });

    expect(result?.$metadata.httpStatusCode).toEqual(200);
  });

  it("should unsuccessfully put of an error log", async () => {
    cloudWatchClientLogMock.on(PutLogEventsCommand).rejects("error");

    const result = await putLogsEvent({
      type: "NOMATCH-APPIAN",
      message: "Error",
    });

    expect(result).toBeUndefined();
  });
});
