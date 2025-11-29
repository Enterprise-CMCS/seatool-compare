import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as workflowStarter from "../workflowStarter";
import * as libs from "../../../../libs";

const handler = workflowStarter as { handler: Function };

const testPK = "test-pk";
const testSK = "test-sk";

const event = {
  Records: [{ dynamodb: { Keys: { PK: { S: testPK }, SK: { S: testSK } } } }],
};

const oldMmdlRecord = {
  PK: testPK,
  SK: testSK,
  payload: {
    SBMSSN_DATE: 1311638400000,
    SBMSSN_TYPE: "oFfIcIaL", // this should be case insensitive
    SPA_ID: "TEST-SPA-ID",
  },
};

// 10 days ago
let recentDate = new Date();
recentDate.setDate(recentDate.getDate() - 10);

const recentMmdlRecord = {
  PK: testPK,
  SK: testSK,
  payload: {
    SBMSSN_DATE: 1311638400000,
    SBMSSN_TYPE: "oFfIcIaL", // this should be case insensitive
    SPA_ID: "TEST-SPA-ID",
  },
};

describe("workflowStarter", () => {
  beforeEach(() => {
    vi.spyOn(console, "log");
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("throws an error if process.env.mmdlTableName is not set", async () => {
    await expect(handler.handler(event)).rejects.toThrowError(
      /^process.env.mmdlTableName needs to be defined.$/
    );
  });

  describe("with process.env.mmdlTableName set", () => {
    beforeAll(() => {
      process.env.mmdlTableName = "test-table-name";
    });

    it("logs the received event as expected", async () => {
      await handler.handler(event);
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
        await handler.handler(event);
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

      // No MMDL record
      describe("with no MMDL record found", () => {
        beforeEach(() => {
          vi.spyOn(libs, "getItem").mockImplementation(async () => null);
        });

        it("throws an error when no MMDL record is found", async () => {
          await expect(handler.handler(event)).rejects.toThrowError(
            "No mmdl record found"
          );
        });
      });

      // Valid MMDL record
      describe("with an old MMDL record found", () => {
        beforeEach(() => {
          vi.spyOn(libs, "getItem").mockImplementation(
            async () => oldMmdlRecord
          );
        });

        it("calls getItem as expected", async () => {
          await handler.handler(event);
          expect(libs.getItem).toHaveBeenCalledWith({
            tableName: "test-table-name",
            key: { PK: testPK, SK: testSK },
          });
        });

        it("does not throw an error when an MMDL record is found", async () => {
          await expect(handler.handler(event)).resolves.not.toThrowError();
        });

        it("logs a message if the record is > 200 days old", async () => {
          await handler.handler(event);
          expect(console.log).toHaveBeenCalledWith(
            `MMDL Record clock not started, ignoring.`
          );
        });
      });

      describe("with an MMDL record < 200 days old", async () => {
        beforeEach(() => {
          vi.spyOn(libs, "getItem").mockImplementation(
            async () => recentMmdlRecord
          );
        });

        it("calls getItem as expected", async () => {
          await handler.handler(event);
          expect(libs.getItem).toHaveBeenCalledWith({
            tableName: "test-table-name",
            key: { PK: testPK, SK: testSK },
          });
        });

        it("does not throw an error when an MMDL record is found", async () => {
          await expect(handler.handler(event)).resolves.not.toThrowError();
        });
      });
    });
  });
});
