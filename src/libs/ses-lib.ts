import {
  SendRawEmailCommand,
  SES,
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
  SendTemplatedEmailCommand,
  sendTemplatedEmail,
} from "@aws-sdk/client-ses";
import { createTransport } from "nodemailer";
import * as Mail from "nodemailer/lib/mailer";

const client = new SESClient({ region: process.env.region });

const ses = new SES({
  region: process.env.region,
});

export async function sendAlert(params: SendEmailCommandInput) {
  console.log("Sending email with params:", JSON.stringify(params, null, 2));
  try {
    const command = new SendEmailCommand(params);
    const result = await client.send(command);
    console.log("Result from sending alert:", JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    console.error(JSON.stringify(e, null, 2));
  }
  return;
}

export async function sendAttachment(mailOptions: Mail.Options) {
  const transporter = createTransport({
    SES: {
      ses: ses,
      aws: { SendRawEmailCommand },
    },
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (e) {
    console.error("Error sending mail:", JSON.stringify(e, null, 2));
    return e;
  }
}

export async function sendTemplatedEmail(params) {
  console.log("sendingEmail using templates params are as following:");
  console.table(params);

  try {
    const command = new SendTemplatedEmailCommand(params);
    const result = await client.send(command);
    console.log(
      "Result from sending email template:",
      JSON.stringify(result, null, 2)
    );
    return result;
  } catch (e) {
    console.error(JSON.stringify(e, null, 2));
  }
}
