import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const client = new SESClient({ region: process.env.region });

export async function sendAlert(params) {
  console.log("Sending email with params:", JSON.stringify(params, null, 2));
  const command = new SendEmailCommand(params);

  return await client.send(command);
}
