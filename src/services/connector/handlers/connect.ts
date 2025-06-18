import * as connect from "../../../libs/connect-lib.js";

export async function findTaskIp(event: {
  Context: { Execution: { Input: { cluster: string } } };
}) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  try {
    const ip = await connect.findTaskIp(event.Context.Execution.Input.cluster);
    console.log("Found task IP:", ip);
    return {
      ip,
      success: true
    };
  } catch (error) {
    console.error("Error finding task IP:", error);
    throw new Error(`Failed to find task IP: ${error}`);
  }
}

export async function checkIfConnectIsReady(event: {
  Payload: { ip: string };
}) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  try {
    const ready = await connect.checkIfConnectIsReady(event.Payload.ip);
    console.log("Connect ready status:", ready);
    return {
      ip: event.Payload.ip,
      ready,
      success: true
    };
  } catch (error) {
    console.error("Error checking if connect is ready:", error);
    return {
      ip: event.Payload.ip,
      ready: false,
      success: false,
      error: error.message
    };
  }
}

export async function createConnector(event: {
  Payload: { ip: string };
  Context: { Execution: { Input: { connectorConfigSecret: string } } };
}) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  try {
    const result = await connect.createConnector(
      event.Payload.ip,
      event.Context.Execution.Input.connectorConfigSecret
    );
    console.log("Connector creation result:", result);
    return result;
  } catch (error) {
    console.error("Error creating connector:", error);
    return {
      success: false,
      error: error.message
    };
  }
}
