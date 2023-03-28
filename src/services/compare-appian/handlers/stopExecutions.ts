import { send, SUCCESS, FAILED } from "cfn-response-async";
import { CloudFormationCustomResourceEvent } from "aws-lambda";
import {
  SFNClient,
  ListExecutionsCommand,
  ListExecutionsInput,
  StopExecutionCommand,
  StopExecutionCommandInput,
} from "@aws-sdk/client-sfn";

type ResponseStatus = typeof SUCCESS | typeof FAILED;

const client = new SFNClient({ region: process.env.region });

exports.handler = async function (
  event: CloudFormationCustomResourceEvent,
  _context: any
) {
  console.log("Request:", JSON.stringify(event, undefined, 2));
  const responseData = {};
  let responseStatus: ResponseStatus = SUCCESS;
  try {
    if (event.RequestType === "Create") {
      console.log("create", event);
      console.log("This function does nothing on Create events");
    } else if (event.RequestType === "Update") {
      console.log("update", event);
      console.log("This function does nothing on Update events");
    } else if (event.RequestType === "Delete") {
      console.log("delete", event);

      const ListExecutionsCommandInput: ListExecutionsInput = {
        maxResults: 1000,
        stateMachineArn: process.env.stateMachineArn,
        statusFilter: "RUNNING",
      };
      const listExecutionsCommand = new ListExecutionsCommand(
        ListExecutionsCommandInput
      );
      const { executions } = await client.send(listExecutionsCommand);
      console.log("Executions:", JSON.stringify(executions, null, 2));

      if (executions) {
        for await (const execution of executions) {
          const stopExecutionCommandInput: StopExecutionCommandInput = {
            executionArn: execution.executionArn,
          };
          const stopExecutionCommand = new StopExecutionCommand(
            stopExecutionCommandInput
          );
          const stopExecutionResponse = await client.send(stopExecutionCommand);
          console.log("Stop Execution Response: ", stopExecutionResponse);
        }
      }
    }
  } catch (error) {
    console.error(error);
    responseStatus = FAILED;
  } finally {
    await send(event, _context, responseStatus, responseData, "static");
  }
};
