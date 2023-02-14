import {
  SESClient,
  SendEmailCommand,
  SendTemplatedEmailCommand,
} from "@aws-sdk/client-ses";

const client = new SESClient({ region: process.env.region });

export async function sendAlert(params) {
  console.log("Sending email with params:", JSON.stringify(params, null, 2));
  try {
    const command = new SendEmailCommand(params);
    const result = await client.send(command);
    console.log("Result from sending alert:", JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    console.error(JSON.stringify(e, null, 2));
  }
}

export async function sendTemplatedEmail(params) {
  console.log("sendingEmail using templates params are as following:");
  console.table(params);

  try {
    const command = new SendTemplatedEmailCommand(params);
    const result = await client.send(command);
    console.log("Result from sending email template:", JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    console.error(JSON.stringify(e, null, 2));
  }
}
