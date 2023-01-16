import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: process.env.region });

export async function trackError(e) {
  console.error("ERROR:", JSON.stringify(e, null, 2));
  const params = {
    Message: JSON.stringify(e, null, 2),
    TopicArn: process.env.errorsTopicArn,
  };
  try {
    const data = await snsClient.send(new PublishCommand(params));
    return data; // For unit tests.
  } catch (err) {
    console.error(
      "Error tracking the error - a meta error",
      JSON.stringify(err, null, 2)
    );
  }
}
