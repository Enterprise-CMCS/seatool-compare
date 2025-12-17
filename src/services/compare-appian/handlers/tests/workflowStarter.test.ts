import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as libs from "../../../../libs";
import { handler } from "../workflowStarter";
import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";

// Mock the AWS SDK
vi.mock("@aws-sdk/client-sfn", () => {
  const mockSend = vi.fn().mockResolvedValue({ executionArn: "test-arn" });
  return {
    SFNClient: vi.fn().mockImplementation(() => ({
      send: mockSend,
    })),
    StartExecutionCommand: vi.fn().mockImplementation((params) => {
      // Store the input for verification
      return { input: params.input, name: params.name, stateMachineArn: params.stateMachineArn };
    }),
  };
});

const testPK = "TN-25-0001-O#v1";
const testSK = "Appian";

const event = {
  Records: [{ dynamodb: { Keys: { PK: { S: testPK }, SK: { S: testSK } } } }],
};

const oldAppianRecord = {
  PK: testPK,
  SK: testSK,
  payload: {
    SBMSSN_DATE: 1311638400000, // Very old date (2011)
    SBMSSN_TYPE: "oFfIcIaL", // this should be case insensitive
    SPA_ID: "TN-25-0001",
    SPA_PCKG_ID: "TN-25-0001-O",
  },
};

// Create a recent record (10 days ago)
const recentDate = new Date();
recentDate.setDate(recentDate.getDate() - 10);

const recentAppianRecord = {
  PK: testPK,
  SK: testSK,
  payload: {
    SBMSSN_DATE: recentDate.getTime(),
    SBMSSN_TYPE: "oFfIcIaL", // this should be case insensitive
    SPA_ID: "TN-25-0001",
    SPA_PCKG_ID: "TN-25-0001-O",
  },
};

describe("workflowStarter", () => {
  beforeEach(() => {
    vi.spyOn(console, "log");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("throws an error if process.env.appianTableName is not set", async () => {
    await expect(handler(event)).rejects.toThrowError(
      /^process.env.appianTableName needs to be defined.$/
    );
  });

  describe("with process.env.appianTableName set", () => {
    beforeAll(() => {
      process.env.appianTableName = "test-table-name";
      process.env.region = "us-east-1";
      process.env.stateMachineArn = "arn:aws:states:us-east-1:123456789:stateMachine:test";
    });

    it("logs the received event as expected", async () => {
      await handler(event);
      expect(console.log).toHaveBeenCalledWith(
        "Received event:",
        JSON.stringify(event, null, 2)
      );
    });

    // process.env.workflowStatus = "OFF"
    describe("with process.env.workflowsStatus set to OFF", () => {
      beforeAll(() => {
        process.env.workflowsStatus = "OFF";
      });

      it("prints a log when workflows status is not set to ON", async () => {
        await handler(event);
        expect(console.log).toHaveBeenCalledWith(
          'Workflows status is currently not "ON". not starting workflow'
        );
      });
    });

    // process.env.workflowStatus = "ON"
    describe("with process.env.workflowsStatus set to ON", () => {
      beforeAll(() => {
        process.env.workflowsStatus = "ON";
      });

      // No Appian record
      describe("with no Appian record found", () => {
        beforeEach(() => {
          vi.spyOn(libs, "getItem").mockImplementation(async () => null);
        });

        it("throws an error when no Appian record is found", async () => {
          await expect(handler(event)).rejects.toThrowError(
            "No appian record found"
          );
        });
      });

      // Valid appian record
      describe("with an old Appian record found", () => {
        beforeEach(() => {
          vi.spyOn(libs, "getItem").mockImplementation(
            async () => oldAppianRecord
          );
        });

        it("calls getItem as expected", async () => {
          await handler(event);
          expect(libs.getItem).toHaveBeenCalledWith({
            tableName: "test-table-name",
            key: { PK: testPK, SK: testSK },
          });
        });

        it("does not throw an error when an Appian record is found", async () => {
          await expect(handler(event)).resolves.not.toThrowError();
        });

        it("logs a message if the record is > 200 days old", async () => {
          await handler(event);
          expect(console.log).toHaveBeenCalledWith(
            `Record ${testPK} not submitted within last 200 days. Ignoring...`
          );
        });
      });

      describe("with an Appian record < 200 days old", () => {
        beforeEach(() => {
          vi.spyOn(libs, "getItem").mockImplementation(
            async () => recentAppianRecord
          );
        });

        it("calls getItem as expected", async () => {
          await handler(event);
          expect(libs.getItem).toHaveBeenCalledWith({
            tableName: "test-table-name",
            key: { PK: testPK, SK: testSK },
          });
        });

        it("does not throw an error when an Appian record is found", async () => {
          await expect(handler(event)).resolves.not.toThrowError();
        });
      });
    });

    describe("eligibleAt timestamp capture", () => {
      beforeAll(() => {
        process.env.workflowsStatus = "ON";
      });

      beforeEach(() => {
        // Clear the StartExecutionCommand mock
        vi.mocked(StartExecutionCommand).mockClear();
      });

      it("includes eligibleAt in Step Function input when record is eligible", async () => {
        // Use real timers for this test to avoid potential issues
        const now = Date.now();
        
        // Create an eligible record (recent, official, ends with 'o')
        const eligibleRecord = {
          PK: "TN-25-0005-O#v1",
          SK: "Appian",
          payload: {
            SBMSSN_DATE: now - 5 * 24 * 60 * 60 * 1000, // 5 days ago (within 201 days)
            SBMSSN_TYPE: "official",
            SPA_ID: "TN-25-0005",
            SPA_PCKG_ID: "TN-25-0005-O", // Ends with 'o'
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(eligibleRecord);

        const eligibleEvent = {
          Records: [
            {
              dynamodb: {
                Keys: { PK: { S: "TN-25-0005-O#v1" }, SK: { S: "Appian" } },
              },
            },
          ],
        };

        await handler(eligibleEvent);

        // Verify StartExecutionCommand was called
        expect(vi.mocked(StartExecutionCommand)).toHaveBeenCalled();
        
        // Get the input that was passed
        const call = vi.mocked(StartExecutionCommand).mock.calls[0][0];
        const input = JSON.parse(call.input);
        
        // Should include eligibleAt as a number close to now
        expect(input).toHaveProperty("eligibleAt");
        expect(typeof input.eligibleAt).toBe("number");
        // eligibleAt should be within 5 seconds of now
        expect(Math.abs(input.eligibleAt - now)).toBeLessThan(5000);
      });

      it("eligibleAt is a valid timestamp close to Date.now()", async () => {
        // Use real time - capture before and after to verify range
        const beforeTime = Date.now();
        
        const eligibleRecord = {
          PK: "TN-25-0006-O#v1",
          SK: "Appian",
          payload: {
            SBMSSN_DATE: beforeTime - 3 * 24 * 60 * 60 * 1000, // 3 days ago
            SBMSSN_TYPE: "Official",
            SPA_ID: "TN-25-0006",
            SPA_PCKG_ID: "TN-25-0006-O",
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(eligibleRecord);

        const eligibleEvent = {
          Records: [
            {
              dynamodb: {
                Keys: { PK: { S: "TN-25-0006-O#v1" }, SK: { S: "Appian" } },
              },
            },
          ],
        };

        await handler(eligibleEvent);
        const afterTime = Date.now();

        // Get the input that was passed to StartExecutionCommand
        const call = vi.mocked(StartExecutionCommand).mock.calls[0][0];
        const input = JSON.parse(call.input);

        // eligibleAt should be between beforeTime and afterTime
        expect(input.eligibleAt).toBeGreaterThanOrEqual(beforeTime);
        expect(input.eligibleAt).toBeLessThanOrEqual(afterTime);
      });

      it("preserves PK and SK in Step Function input alongside eligibleAt", async () => {
        // Use real time
        const now = Date.now();
        
        const eligibleRecord = {
          PK: "TN-25-0007-O#v1",
          SK: "Appian",
          payload: {
            SBMSSN_DATE: now - 7 * 24 * 60 * 60 * 1000, // 7 days ago
            SBMSSN_TYPE: "official",
            SPA_ID: "TN-25-0007",
            SPA_PCKG_ID: "TN-25-0007-O",
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(eligibleRecord);

        const eligibleEvent = {
          Records: [
            {
              dynamodb: {
                Keys: { PK: { S: "TN-25-0007-O#v1" }, SK: { S: "Appian" } },
              },
            },
          ],
        };

        await handler(eligibleEvent);

        // Get the input that was passed to StartExecutionCommand
        const call = vi.mocked(StartExecutionCommand).mock.calls[0][0];
        const input = JSON.parse(call.input);

        // Check PK and SK are preserved
        expect(input.PK).toBe("TN-25-0007-O#v1");
        expect(input.SK).toBe("Appian");
        // eligibleAt should be present and a number
        expect(typeof input.eligibleAt).toBe("number");
      });

      it("does not start workflow for non-official submission types", async () => {
        // Use real time - just need recent date
        const now = Date.now();
        const unofficialRecord = {
          PK: "TN-25-0008-O#v1",
          SK: "Appian",
          payload: {
            SBMSSN_DATE: now - 5 * 24 * 60 * 60 * 1000,
            SBMSSN_TYPE: "draft", // Not official
            SPA_ID: "TN-25-0008",
            SPA_PCKG_ID: "TN-25-0008-O",
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(unofficialRecord);

        const unofficialEvent = {
          Records: [
            {
              dynamodb: {
                Keys: { PK: { S: "TN-25-0008-O#v1" }, SK: { S: "Appian" } },
              },
            },
          ],
        };

        await handler(unofficialEvent);

        // StartExecutionCommand should NOT have been called
        expect(vi.mocked(StartExecutionCommand)).not.toHaveBeenCalled();
      });

      it("does not start workflow for records not ending with 'o'", async () => {
        // Use real time - just need recent date
        const now = Date.now();
        const nonOfficialPkgRecord = {
          PK: "TN-25-0009-P#v1",
          SK: "Appian",
          payload: {
            SBMSSN_DATE: now - 5 * 24 * 60 * 60 * 1000,
            SBMSSN_TYPE: "official",
            SPA_ID: "TN-25-0009",
            SPA_PCKG_ID: "TN-25-0009-P", // Ends with 'P', not 'O'
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(nonOfficialPkgRecord);

        const nonOfficialEvent = {
          Records: [
            {
              dynamodb: {
                Keys: { PK: { S: "TN-25-0009-P#v1" }, SK: { S: "Appian" } },
              },
            },
          ],
        };

        await handler(nonOfficialEvent);

        // StartExecutionCommand should NOT have been called
        expect(vi.mocked(StartExecutionCommand)).not.toHaveBeenCalled();
      });

      it("starts workflow for records with null SBMSSN_DATE (treats as recent)", async () => {
        const now = Date.now();
        const nullDateRecord = {
          PK: "TN-25-0010-O#v1",
          SK: "Appian",
          payload: {
            SBMSSN_DATE: null, // No submission date - should be treated as recent
            SBMSSN_TYPE: "official",
            SPA_ID: "TN-25-0010",
            SPA_PCKG_ID: "TN-25-0010-O",
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(nullDateRecord);

        const nullDateEvent = {
          Records: [
            {
              dynamodb: {
                Keys: { PK: { S: "TN-25-0010-O#v1" }, SK: { S: "Appian" } },
              },
            },
          ],
        };

        await handler(nullDateEvent);

        // StartExecutionCommand SHOULD have been called (null date = treat as recent)
        expect(vi.mocked(StartExecutionCommand)).toHaveBeenCalled();

        // Verify the input includes eligibleAt
        const call = vi.mocked(StartExecutionCommand).mock.calls[0][0];
        const input = JSON.parse(call.input);
        expect(input.PK).toBe("TN-25-0010-O#v1");
        expect(input.SK).toBe("Appian");
        expect(typeof input.eligibleAt).toBe("number");
        // eligibleAt should be close to now
        expect(Math.abs(input.eligibleAt - now)).toBeLessThan(5000);
      });

      it("starts workflow for records with undefined SBMSSN_DATE (treats as recent)", async () => {
        const now = Date.now();
        const undefinedDateRecord = {
          PK: "TN-25-0011-O#v1",
          SK: "Appian",
          payload: {
            // SBMSSN_DATE is completely missing (undefined)
            SBMSSN_TYPE: "official",
            SPA_ID: "TN-25-0011",
            SPA_PCKG_ID: "TN-25-0011-O",
          },
        };

        vi.spyOn(libs, "getItem").mockResolvedValue(undefinedDateRecord);

        const undefinedDateEvent = {
          Records: [
            {
              dynamodb: {
                Keys: { PK: { S: "TN-25-0011-O#v1" }, SK: { S: "Appian" } },
              },
            },
          ],
        };

        await handler(undefinedDateEvent);

        // StartExecutionCommand SHOULD have been called (undefined date = treat as recent)
        expect(vi.mocked(StartExecutionCommand)).toHaveBeenCalled();
      });
    });
  });
});

