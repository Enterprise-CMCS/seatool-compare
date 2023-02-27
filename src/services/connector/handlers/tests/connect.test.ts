import { it, describe, expect, vi } from "vitest";
import { findTaskIp, checkIfConnectIsReady, createConnector } from "../connect";
import * as connect from "../../../../libs/connect-lib";

vi.mock("../../../../libs/connect-lib", () => {
  return {
    findTaskIp: vi.fn(),
    checkIfConnectIsReady: vi.fn(),
    createConnector: vi.fn(),
  };
});

describe("connect service function", () => {
  it("function tests finding an ip task", async () => {
    const event = {
      Context: { Execution: { Input: { cluster: "test-cluster" } } },
    };
    await findTaskIp(event);

    expect(connect.findTaskIp).toHaveBeenCalledWith("test-cluster");
  });

  it("function tests finding an ip task", async () => {
    const event = {
      Payload: { ip: "100" },
    };
    await checkIfConnectIsReady(event);

    expect(connect.checkIfConnectIsReady).toHaveBeenCalledWith("100");
  });

  it("function tests finding an ip task", async () => {
    const event = {
      Payload: { ip: "1000" },
      Context: { Execution: { Input: { connectorConfigSecret: "secret" } } }, // pragma: allowlist secret
    };
    await createConnector(event);

    expect(connect.createConnector).toHaveBeenCalledWith("1000", "secret");
  });
});
