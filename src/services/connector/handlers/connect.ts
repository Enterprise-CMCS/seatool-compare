import * as connect from "../../../libs/connect-lib";

export async function findTaskIp(event: {
  Context: { Execution: { Input: { cluster: string } } };
}) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return {
    ip: await connect.findTaskIp(event.Context.Execution.Input.cluster),
  };
}

export async function checkIfConnectIsReady(event: {
  Payload: { ip: string };
}) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return {
    ip: event.Payload.ip,
    ready: await connect.checkIfConnectIsReady(event.Payload.ip),
  };
}

export async function createConnector(event: {
  Payload: { ip: string };
  Context: { Execution: { Input: { connectorConfigSecret: string } } };
}) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  return await connect.createConnector(
    event.Payload.ip,
    event.Context.Execution.Input.connectorConfigSecret
  );
}
