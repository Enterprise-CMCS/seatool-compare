import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { getItem, trackError } from "../../../libs";
import * as Types from "../../../types";

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

  if (!process.env.mmdlTableName) {
    throw "process.env.mmdlTableName needs to be defined.";
  }

  if (process.env.workflowsStatus !== "ON") {
    console.log(
      'Workflows status is currently not "ON". not starting workflow'
    );
    return;
  }

  /* Retrieving the record from the DynamoDB table. */
  const mmdlRecord = (await getItem({
    tableName: process.env.mmdlTableName,
    key,
  })) as Types.MmdlRecord;

  if (!mmdlRecord) {
    throw "No mmdl record found";
  }

  if (mmdlRecord.clockStarted) {
    const params = {
      input: JSON.stringify(key),
      name: `v1-${PK}`,
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
    } catch (e: any) {
      if (e.name === "ExecutionAlreadyExists") {
        console.log(
          `Execution already exists for key: ${JSON.stringify(
            key
          )}. Taking no action.`
        );
      } else {
        await trackError(e);
      }
    } finally {
      console.log("finally");
    }
  } else {
    console.log("MMDL Record clock not started, ignoring.");
  }
};
