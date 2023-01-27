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

export async function sendAttachment(content) {
  const todaysDate = new Date().toISOString().split("T")[0];
  const mailOptions = {
    from: "bpaige@gswell.com",
    subject: "This is an email sent from a Lambda function!",
    html: `<p>You got a contact message from: <b>ben</b></p>`,
    to: "bpaige@fearless.tech",
    attachments: [
      {
        filename: `MMDL SEA Tool Status - ${todaysDate}.csv`,
        content,
      },
    ],
  };

  const transporter = nodemailer.createTransport({
    SES: {
      ses: ses,
      aws: { SendRawEmailCommand },
    },
  });

  // send email
  const info = await transporter.sendMail(mailOptions);
  return info;
}
