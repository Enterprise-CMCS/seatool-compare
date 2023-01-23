import * as aws from "@aws-sdk/client-ses";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import nodemailer from "nodemailer";

const client = new aws.SESClient({ region: process.env.region });

const ses = new aws.SES({
  apiVersion: "2010-12-01",
  region: process.env.region,
  defaultProvider,
});

export async function sendAlert(params) {
  console.log("Sending email with params:", JSON.stringify(params, null, 2));
  try {
    const command = new aws.SendEmailCommand(params);
    const result = await client.send(command);
    console.log("Result from sending alert:", JSON.stringify(result, null, 2));
    return result;
  } catch (e) {
    console.error(JSON.stringify(e, null, 2));
  }
}

export async function sendAttachment() {
  const mailOptions = {
    from: "bpaige@gswell.com",
    subject: "This is an email sent from a Lambda function!",
    html: `<p>You got a contact message from: <b>ben</b></p>`,
    to: "bpaige@gswell.com",
    // bcc: Any BCC address you want here in an array,
    // attachments: [
    //   {
    //     filename: "An Attachment.txt",
    //     content: "hello world",
    //   },
    // ],
  };

  console.log("Creating SES transporter");
  // create Nodemailer SES transporter
  const transporter = nodemailer.createTransport({
    SES: { ses, aws },
  });

  // send email
  const info = await transporter.sendMail(mailOptions);
  console.log("Result", JSON.stringify(info, null, 2));

  return info;
}
