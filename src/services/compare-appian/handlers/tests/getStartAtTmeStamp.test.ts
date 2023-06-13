import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import * as getStartAtTimeStamp from "../getStartAtTimeStamp";

const handler = getStartAtTimeStamp as { handler: Function };
const callback = vi.fn();
const event = { Payload: {} };
const testDate = new Date(1680790226131);
const originalEnv = process.env;

describe("getStartAtTimeStamp", () => {
  beforeAll(() => {
    // Mock new Date() to a fixed time
    vi.useFakeTimers();
    vi.setSystemTime(testDate);
  });

  beforeEach(() => {
    vi.spyOn(console, "log");

    vi.resetModules();
    process.env = {
      ...originalEnv,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
    process.env = originalEnv;
  });

  it("logs the received event", async () => {
    await handler.handler(event, null, callback);
    expect(console.log).toBeCalledWith(
      "Received event:",
      JSON.stringify(event, null, 2)
    );
  });

  it("logs the returning data", async () => {
    await handler.handler(event, null, callback);
    const callbackData = callback.mock.calls[0][1];

    expect(console.log).toBeCalledWith(
      "Returning data ",
      JSON.stringify(callbackData, null, 2)
    );
  });

  it("sets startAtTimeStamp to 12 UTC two days in the future", async () => {
    await handler.handler(event, null, callback);
    const timestamp = callback.mock.calls[0][1]["startAtTimeStamp"];
    const timestampDate = new Date(timestamp);

    // Uses the fixed time set above:
    const currentDate = new Date().getUTCDate();

    expect(timestampDate.getUTCHours()).toBe(12);
    expect(timestampDate.getUTCMinutes()).toBe(0);
    expect(timestampDate.getUTCSeconds()).toBe(0);
    expect(timestampDate.getUTCDate()).toBe(currentDate + 2);
  });

  it("sets startAtTimeStamp to ten minutes from now when process.env.skipWait is true", async () => {
    process.env.skipWait = "true";

    await handler.handler(event, null, callback);
    const timestamp = callback.mock.calls[0][1]["startAtTimeStamp"];
    const timestampDate = new Date(timestamp);

    // Uses the fixed time set above:
    const currentMinute = new Date().getUTCMinutes();

    expect(timestampDate.getUTCHours()).toBe(14);
    expect(timestampDate.getUTCMinutes()).toBe(currentMinute + 10);
    expect(timestampDate.getUTCSeconds()).toBe(26);
    expect(timestampDate.getUTCDate()).toBe(6);
  });
});
