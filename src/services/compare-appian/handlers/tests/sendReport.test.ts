import {
  MockedFunction,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as sendReport from "../sendReport";
import * as libs from "../../../../libs";

const handler = sendReport as { handler: Function };

vi.mock("../../../../libs", () => {
  return {
    getCsvFromJson: vi.fn(),
    scanTable: vi.fn(),
    sendAttachment: vi.fn(),
    trackError: vi.fn(),
  };
});

const submissionDateString = "1680723474372";

const appianReportData = [
  {
    PK: "test-pk",
    SK: "test-sk",
    isAppianSubmitted: true,
    SPA_ID: "test-id",
    iterations: 0,
    secSinceAppianSubmitted: "12345678",
    appianSubmittedDate: submissionDateString,
    seatoolExist: true,
    seatoolSubmissionDate: submissionDateString,
    match: true,
  },
];

const event = { recipient: "recipient@example.com" };

describe("sendReport", () => {
  beforeEach(() => {
    vi.spyOn(console, "log");
    vi.spyOn(libs, "trackError");
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("when process.env.statusTable is defined", () => {
    it("logs the received event in the expected format", async () => {
      vi.spyOn(console, "log");
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

    it("calls scanTable as expected", async () => {
      await handler.handler(event);
      expect(libs.scanTable).toBeCalledWith({
        TableName: "test-table",
      });
    });

    it("does not attempt to format data if undefined", async () => {
      await handler.handler(event);
      expect(libs.getCsvFromJson).not.toBeCalled();
      expect(libs.sendAttachment).not.toBeCalled();
      expect(libs.trackError).not.toBeCalled();
    });

    it("formats data and sends attachment", async () => {
      (
        libs.scanTable as MockedFunction<typeof libs.scanTable>
      ).mockResolvedValue(appianReportData);

      await handler.handler(event);

      expect(libs.getCsvFromJson).toBeCalledWith([
        {
          PCKG_ID: "test-pk",
          "SPA ID": "test-id",
          "Iterations ": 0,
          "Submission Date": formatDate(Number(submissionDateString)),
          "Seatool Record Exist": true,
          "Seatool Signed Date": formatDate(Number(submissionDateString)),
          "Records Match": true,
        },
      ]);

      const todaysDate = new Date().toISOString().split("T")[0];
      expect(libs.sendAttachment).toBeCalledWith({
        attachments: [
          {
            content: undefined,
            filename: `Appian SEA Tool Status - ${todaysDate}.csv`,
          },
        ],
        from: "noreply@cms.hhs.gov",
        html: "<p>Attached is a csv indicating the current status of Appian and SEA Tool records.</p><p>This report can be opened in your favorite spreadsheet viewing application.</p>",
        subject: `Appian SEA Tool Status - ${todaysDate}`,
        to: "recipient@example.com",
      });
    });
  });
});

function formatDate(dateMs: number) {
  return new Date(dateMs).toLocaleString("en-US", {
    timeZone: "America/New_York",
  });
}
