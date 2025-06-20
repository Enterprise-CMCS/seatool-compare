import { SFNClient, StartExecutionCommand } from "@aws-sdk/client-sfn";
import { getItem, trackError } from "../../../libs";
import { secondsBetweenDates } from "./utils/timeHelper";

/* This is the Lambda function that is triggered by the DynamoDB stream. It is responsible for starting
the Step Function execution. */
async function workflowStarter(event: {
  Records: { dynamodb: { Keys: { PK: { S: string }; SK: { S: string } } } }[];
}) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const client = new SFNClient({ region: process.env.region });
  const PK = event.Records[0].dynamodb.Keys.PK.S;
  const SK = event.Records[0].dynamodb.Keys.SK.S;
  const key = { PK, SK };

  if (!process.env.appianTableName) {
    throw "process.env.appianTableName needs to be defined.";
  }

  if (process.env.workflowsStatus !== "ON") {
    console.log(
      'Workflows status is currently not "ON". not starting workflow'
    );
    return;
  }

  /* Retrieving the record from the DynamoDB table. */
  const appianRecord = await getItem({
    tableName: process.env.appianTableName,
    key,
  });

  if (!appianRecord) {
    throw "No appian record found";
  }

  /* Checking if the appian record was submitted within the last 200 days. */
  const submissionDate = appianRecord.payload?.SBMSSN_DATE;
  const diffInSec = secondsBetweenDates(submissionDate);

  if (
    appianRecord.payload?.SBMSSN_TYPE?.toLowerCase() === "official" &&
    appianRecord.payload?.SPA_PCKG_ID?.toLowerCase()?.at(-1) === "o" &&
    diffInSec < 17366000 // 201 days
  ) {
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
    console.log(`Record ${PK} not submitted within last 200 days. Ignoring...`);
  }
}

export { workflowStarter as handler };