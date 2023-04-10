import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CloudFormationCustomResourceEvent } from "aws-lambda";
import * as stopExecutions from "../stopExecutions";
import * as cfn from "cfn-response-async";

const oldEnv = process.env;

vi.mock("cfn-response-async");

const handler = stopExecutions as { handler: Function };

vi.mock("cfn-reponse-async", async () => {
  return {
    send: vi.fn(),
  };
});

vi.mock("@aws-sdk/client-sfn", async () => {
  return {
    ListExecutionsCommand: vi.fn(),
    SFNClient: vi.fn().mockImplementation(() => {
      return {
        send: vi.fn().mockImplementation(() => {
          return {
            executions: [],
          };
        }),
      };
    }),
  };
});

const event: CloudFormationCustomResourceEvent = {
  ServiceToken: "test-token",
  ResponseURL: "responseUrl",
  StackId: "1234",
  RequestId: "1234",
  LogicalResourceId: "1234",
  ResourceType: "test-resource",
  ResourceProperties: {
    ServiceToken: "1234",
  },
  RequestType: "Create",
};

describe("stopExecutions", () => {
  beforeEach(() => {
    vi.spyOn(console, "log");
    vi.spyOn(cfn, "send");

    process.env = {
      ...oldEnv,
      region: "test-region",
    };
  });

  afterEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env = oldEnv;
  });

  it("logs the request in the expected format", async () => {
    await handler.handler(event);
    expect(console.log).toHaveBeenCalledWith(
      "Request:",
      JSON.stringify(event, null, 2)
    );
  });

  it("logs a Create event", async () => {
    const createEvent = { RequestType: "Create" };

    await handler.handler(createEvent);
    expect(console.log).toHaveBeenCalledWith("create", createEvent);
    expect(console.log).toHaveBeenCalledWith(
      "This function does nothing on Create events"
    );
  });

  it("logs an Update event", async () => {
    const updateEvent = { RequestType: "Update" };

    await handler.handler(updateEvent);
    expect(console.log).toHaveBeenCalledWith("update", updateEvent);
    expect(console.log).toHaveBeenCalledWith(
      "This function does nothing on Update events"
    );
  });

  it("logs a Delete event", async () => {
    const deleteEvent = { RequestType: "Delete" };
    await handler.handler(deleteEvent);
    expect(console.log).toHaveBeenCalledWith("delete", deleteEvent);
  });

  it("sends the event", async () => {
    const deleteEvent = { RequestType: "Delete" };
    await handler.handler(deleteEvent);
    expect(cfn.send).toHaveBeenCalledOnce();
  });
});
