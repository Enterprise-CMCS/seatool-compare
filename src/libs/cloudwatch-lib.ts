import {
  PutMetricDataCommand,
  CloudWatchClient,
} from "@aws-sdk/client-cloudwatch";

import type { PutMetricDataCommandInput } from "@aws-sdk/client-cloudwatch";

export async function sendMetricData(params: PutMetricDataCommandInput) {
  console.log("Sending metric data: ", JSON.stringify(params));
  const client = new CloudWatchClient({});
  const command = new PutMetricDataCommand(params);
  try {
    const response = await client.send(command);
    console.log("Response from sending metric data", JSON.stringify(response));
    return response;
  } catch (e) {
    console.log("Error from sending metric data", e);
    return;
  }
}
