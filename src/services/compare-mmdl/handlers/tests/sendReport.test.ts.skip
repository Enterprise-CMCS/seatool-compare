import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as sendReport from "../sendReport";
import * as libs from "../../../../libs";

const oldEnv = process.env;

const handler = sendReport as { handler: Function };

const mmdlTableName = "test-mmdl-table";
const seatoolTableName = "test-seatool-table";

const mmdlReportData = [{}];

vi.mock("../../../../libs", async () => {
  return {
    getCsvFromJson: vi.fn(),
    scanTable: vi.fn().mockImplementation(() => mmdlReportData),
    sendAttachment: vi.fn(),
    trackError: vi.fn(),
  };
});

const days = 10;
const event = { recipient: "recipient@example.com", days };

const testDate = new Date(1680790226131);

describe("sendReport", () => {
  beforeAll(() => {
    // Mock new Date() to a fixed time
    vi.useFakeTimers();
    vi.setSystemTime(testDate);
  });

  beforeEach(() => {
    process.env = {
      ...oldEnv,
      mmdlTableName,
      seatoolTableName,
    };

    vi.spyOn(console, "log");
  });

  afterEach(() => {
    process.env = oldEnv;
    vi.clearAllMocks();
  });

  it("logs the received event", async () => {
    await handler.handler(event);
    expect(console.log).toBeCalledWith(
      "Received event:",
      JSON.stringify(event, null, 2)
    );
  });

  it("throws an error if recipient or days is missing from event", async () => {
    const noDays = { recipient: "recipient@example.com" };
    const noRecipient = { days: 10 };

    const expectedError =
      'You must manually provide a recipient email and days in the event. ex. {"recipient": "user@example.com", "days": 250}';

    await expect(handler.handler(noDays)).rejects.toThrowError(expectedError);
    await expect(handler.handler(noRecipient)).rejects.toThrowError(
      expectedError
    );
    await expect(handler.handler({})).rejects.toThrowError(expectedError);
  });

  it("throws an error if process.env.mmdlTableName is missing", async () => {
    process.env.mmdlTableName = undefined;

    const expectedError =
      "process.env.mmdlTableName and process.env.seatoolTableName needs to be defined.";

    await expect(handler.handler(event)).rejects.toThrowError(expectedError);
  });

  it("throws an error if process.env.seatoolTableName is missing", async () => {
    process.env.seatoolTableName = undefined;

    const expectedError =
      "process.env.mmdlTableName and process.env.seatoolTableName needs to be defined.";

    await expect(handler.handler(event)).rejects.toThrowError(expectedError);
  });

  it("calls scanTable as expected", async () => {
    await handler.handler(event);
    expect(libs.scanTable).toBeCalledWith({ TableName: mmdlTableName });
  });

  it("calls sendAttachment", async () => {
    await handler.handler(event);
    expect(libs.sendAttachment).toBeCalledWith({
      attachments: [
        {
          content: undefined,
          filename: "MMDL SEA Tool Status - 2023-04-06.csv",
        },
      ],
      from: "noreply@cms.hhs.gov",
      html:
        `<p>Attached is a status report of MMDL and SEA Tool records for the previous ${days} days.</p>` +
        `<p>This report can be opened in your favorite spreadsheet viewing application.</p>`,
      subject: `MMDL SEA Tool Status - 2023-04-06`,
      to: "recipient@example.com",
    });
  });
});
