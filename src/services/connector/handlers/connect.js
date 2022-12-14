import * as connect from "../../../libs/connect-lib";

export async function findTaskIp(event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return {
    ip: await connect.findTaskIp(event.Context.Execution.Input.cluster),
  };
}

export async function checkIfConnectIsReady(event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return {
    ip: event.Payload.ip,
    ready: await connect.checkIfConnectIsReady(event.Payload.ip),
  };
}

export async function createConnector(event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return await connect.createConnector(
    event.Payload.ip,
    event.Context.Execution.Input.connectorConfigSecret
  );
}
