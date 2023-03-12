import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { trackError } from "../../../libs";

/* This is the Lambda function that is triggered by the DynamoDB stream. It is responsible for starting
the Step Function execution. */
exports.handler = async function (event: {
  Records: { dynamodb: { Keys: { SK: { S: string }; PK: { S: string } } } }[];
}) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const client = new SFNClient({ region: process.env.region });
  const PK = event.Records[0].dynamodb.Keys.PK.S;
  const SK = event.Records[0].dynamodb.Keys.SK.S;
  const key = { PK, SK };

  if (process.env.workflowsStatus !== "ON") {
    console.log(
      'Workflows status is currently not "ON". not starting workflow'
    );
    return;
  }

  /* Creating an object that will be passed to the StartExecutionCommand. */
  const params = {
    input: JSON.stringify(key),
    name: PK,
    stateMachineArn: process.env.stateMachineArn,
  };

  /* Creating a new instance of the StartExecutionCommand class. */
  const command = new StartExecutionCommand(params);

  try {
    /* Sending the command to the Step Function service. */
    const result = await client.send(command);
    console.log(
      "Result from starting step function command",
      JSON.stringify(result, null, 2)
    );
  } catch (e) {
    await trackError(e);
  } finally {
    console.log("finally");
  }
};
