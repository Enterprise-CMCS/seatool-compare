import {
  SendRawEmailCommand,
  SES,
  SESClient,
  SendEmailCommand,
} from "@aws-sdk/client-ses";
import nodemailer from "nodemailer";

const client = new SESClient({ region: process.env.region });

const ses = new SES({
  region: process.env.region,
});

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

export async function sendAttachment(mailOptions) {
  const transporter = nodemailer.createTransport({
    SES: {
      ses: ses,
      aws: { SendRawEmailCommand },
    },
  });

  try {
    const info = await transporter.sendMail(mailOptions);
    return info;
  } catch (e) {
    console.error("Error sending mail:", JSON.stringify(info, null, 2));
  }
}
