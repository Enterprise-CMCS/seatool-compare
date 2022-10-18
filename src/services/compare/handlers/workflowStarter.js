import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const client = new SFNClient({ region: process.env.region });
  const id = event.Records[0].dynamodb.Keys.id.S;
  const params = {
    input: JSON.stringify({
      id: id,
    }),
    name: id,
    stateMachineArn: process.env.stateMachineArn,
  };
  const command = new StartExecutionCommand(params);
  try {
    const data = await client.send(command);
    console.log(data);
  } catch (error) {
    console.log(error);
  } finally {
    console.log("finally");
  }
};
