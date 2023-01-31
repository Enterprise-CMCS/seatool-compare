import {
  PutMetricDataCommand,
  CloudWatchClient,
} from "@aws-sdk/client-cloudwatch";
import {
  CloudWatchLogsClient,
  PutLogEventsCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

/**
 * Sends metric data to CloudWatch
 * @param params - {
 * @returns The response from the PutMetricDataCommand.
 */
export async function sendMetricData(params) {
  console.log("Sending metric data: ", JSON.stringify(params));
  const client = new CloudWatchClient();
  const command = new PutMetricDataCommand(params);
  try {
    const response = await client.send(command);
    console.log("Response from sending metric data", JSON.stringify(response));
    return response;
  } catch (e) {
    console.log("Error from sending metric data", e);
  }
}

/**
 * We log an event for each email that is (or would be) sent.
 * There are two log streams 'NOMATCH' | 'NOTFOUND'
 */
export async function putLogsEvent({ type, message }) {
  const client = new CloudWatchLogsClient({ region: process.env.region });
  const input = {
    logEvents: [{ message, timestamp: new Date().getTime() }],
    logGroupName: process.env.sesLogGroupName,
    logStreamName: type,
  };
  const command = new PutLogEventsCommand(input);

  try {
    const response = await client.send(command);
    console.log(
      "Response from sending log event:",
      JSON.stringify(response, null, 2)
    );
  } catch (e) {
    console.log("Error from sending log event", e);
  }
}
/**
 * this is to get a record that is loged when we send each email.
 * There are two log streams 'NOMATCH' | 'NOTFOUND'
 */
export async function getLogsEvent({ type, id }) {
  console.log("type", type, "id", id);
  const client = new CloudWatchLogsClient({ region: process.env.region });
  const input = {
    logGroupName: process.env.sesLogGroupName,
    logStreamNames: [type],
    limit: 1,
    filterPattern: `{ $.message = *${id}* || $.message like *${id}* }`,
  };
  const command = new FilterLogEventsCommand(input);

  try {
    const response = await client.send(command);
    console.log(
      "Response from getting log event:",
      JSON.stringify(response, null, 2)
    );
    return response;
  } catch (e) {
    console.log("Error from getting log event", e);
  }
}
