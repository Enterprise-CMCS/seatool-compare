import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  MockedFunction,
  vi,
} from "vitest";
import * as libs from "../../libs";
import * as sendReport from "../../services/compare-appian/handlers/sendReport";

const handler = sendReport as { handler: Function };

vi.mock("../../libs", () => {
  return {
    getCsvFromJson: vi.fn(),
    getItem: vi.fn(),
    getSecretsValue: vi.fn(),
    scanTable: vi.fn(),
    sendAttachment: vi.fn(),
    trackError: vi.fn(),
  };
});

const event = { recipient: "user@example.com", days: 30 };
const todayMs = Date.now();
const appianPayload = {
  SPA_ID: "TX-001",
  SBMSSN_DATE: todayMs,
  CRNT_STUS: "Submitted",
  IS_CRNT_VRSN: "Y",
};

describe("sendReport", () => {
  beforeEach(() => {
    process.env.region = "us-east-1";
    process.env.project = "compare";
    process.env.stage = "val";
    process.env.appianTableName = "appian-table";
    process.env.seatoolTableName = "seatool-table";
    process.env.ignoredStates = "ZZ,ZT";

    (
      libs.getSecretsValue as MockedFunction<typeof libs.getSecretsValue>
    ).mockResolvedValue({
      sourceEmail: "alerts@example.com",
    });
    (libs.scanTable as MockedFunction<typeof libs.scanTable>).mockResolvedValue([
      { payload: appianPayload },
    ]);
    (libs.getItem as MockedFunction<typeof libs.getItem>).mockResolvedValue({
      STATE_PLAN: {
        SUBMISSION_DATE: todayMs,
      },
    } as any);
    (libs.getCsvFromJson as MockedFunction<typeof libs.getCsvFromJson>).mockReturnValue(
      "csv-data"
    );
    (
      libs.sendAttachment as MockedFunction<typeof libs.sendAttachment>
    ).mockResolvedValue({} as any);
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.region;
    delete process.env.project;
    delete process.env.stage;
    delete process.env.appianTableName;
    delete process.env.seatoolTableName;
    delete process.env.ignoredStates;
  });

  it("uses sourceEmail from the alerts secret for the report sender", async () => {
    await handler.handler(event);

    expect(libs.getSecretsValue).toHaveBeenCalledWith(
      "us-east-1",
      "compare/val/alerts-appian"
    );
    expect(libs.sendAttachment).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "alerts@example.com",
        to: "user@example.com",
        subject: expect.stringMatching(/^Appian SEA Tool Status - /),
        attachments: [
          expect.objectContaining({
            filename: expect.stringMatching(/^Appian SEA Tool Status - .*\.csv$/),
            content: "csv-data",
          }),
        ],
      })
    );
  });

  it("does not send the report when the secret is missing", async () => {
    (
      libs.getSecretsValue as MockedFunction<typeof libs.getSecretsValue>
    ).mockResolvedValue(undefined);

    await handler.handler(event);

    expect(libs.sendAttachment).not.toHaveBeenCalled();
    expect(libs.trackError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Missing sourceEmail in secret compare/val/alerts-appian",
      })
    );
  });

  it("does not send the report when sourceEmail is absent from the secret", async () => {
    (
      libs.getSecretsValue as MockedFunction<typeof libs.getSecretsValue>
    ).mockResolvedValue({
      emailRecipients: {
        ToAddresses: ["user@example.com"],
        CcAddresses: [],
      },
    } as any);

    await handler.handler(event);

    expect(libs.sendAttachment).not.toHaveBeenCalled();
    expect(libs.trackError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Missing sourceEmail in secret compare/val/alerts-appian",
      })
    );
  });
});
