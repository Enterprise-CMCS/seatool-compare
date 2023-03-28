import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as sendReport from "../sendReport";
import * as libs from "../../../../libs";

vi.mock("../../../../libs", () => {
  return {
    scanTable: vi.fn().mockImplementation(() => appianReportData),
    trackError: vi.fn(),
  };
});

const appianReportData = [
  {
    PK: "test-pk",
    SK: "test-sk",
    isAppianSubmitted: true,
    SPA_ID: "test-id",
    iterations: 0,
    secSinceAppianSubmitted: 123,
    appianSubmittedDate: 1234567890,
    seatoolExist: true,
    seatoolSubmissionDate: 1234567890, // optional
    match: true, // optional
  },
];

const handler = sendReport as { handler: Function };

describe("sendReport", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should log the received event in the expected format", async () => {
    process.env.statusTable = "test-table";
    vi.spyOn(console, "log");
    const event = { recipient: "recipient@example.com" };
    await handler.handler(event);

    expect(console.log).toHaveBeenCalledWith(
      "Received event:",
      JSON.stringify(event, null, 2)
    );
  });

  it("throws an error if no email provided", async () => {
    const event = { recipient: null };
    await expect(() =>
      handler
        .handler(event)
        .rejects.toThrowError(
          'You must manually provide a recipient email in the event to send a report. ex. {"recipient": "user@example.com"}'
        )
    );
  });

  it("throws an error if process.env.statusTable is not set", async () => {
    await expect(() =>
      handler
        .handler(event)
        .rejects.toThrowError("process.env.statusTable needs to be defined.")
    );
  });

  it("gets data from scanTable", async () => {
    const event = { recipient: "recipient@example.com" };
    process.env.statusTable = "test-table";

    await handler.handler(event);
    expect(libs.scanTable).toHaveBeenCalledOnce();
    expect(libs.trackError).not.toHaveBeenCalled();
  });
});
