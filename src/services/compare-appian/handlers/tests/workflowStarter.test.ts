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

const oldAppianRecord = {
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

const recentAppianRecord = {
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

  it("throws an error if process.env.appianTableName is not set", async () => {
    await expect(handler.handler(event)).rejects.toThrowError(
      /^process.env.appianTableName needs to be defined.$/
    );
  });

  describe("with process.env.appianTableName set", () => {
    beforeAll(() => {
      process.env.appianTableName = "test-table-name";
      // process.env.region = "test-region";
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

      // No Appian record
      describe("with no Appian record found", () => {
        beforeEach(() => {
          vi.spyOn(libs, "getItem").mockImplementation(async () => null);
        });

        it("throws an error when no Appian record is found", async () => {
          await expect(handler.handler(event)).rejects.toThrowError(
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
          await handler.handler(event);
          expect(libs.getItem).toHaveBeenCalledWith({
            tableName: "test-table-name",
            key: { PK: testPK, SK: testSK },
          });
        });

        it("does not throw an error when an Appian record is found", async () => {
          await expect(handler.handler(event)).resolves.not.toThrowError();
        });

        it("logs a message if the record is > 200 days old", async () => {
          await handler.handler(event);
          expect(console.log).toHaveBeenCalledWith(
            `Record ${testPK} not submitted within last 200 days. Ignoring...`
          );
        });
      });

      describe("with an Appian record < 200 days old", async () => {
        beforeEach(() => {
          vi.spyOn(libs, "getItem").mockImplementation(
            async () => recentAppianRecord
          );
        });

        it("calls getItem as expected", async () => {
          await handler.handler(event);
          expect(libs.getItem).toHaveBeenCalledWith({
            tableName: "test-table-name",
            key: { PK: testPK, SK: testSK },
          });
        });

        it("does not throw an error when an Appian record is found", async () => {
          await expect(handler.handler(event)).resolves.not.toThrowError();
        });
      });
    });
  });
});
