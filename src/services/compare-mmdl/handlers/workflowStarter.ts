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

// const mmdl = {
//   PK: "TX-17340-ABP",
//   SK: "TX-17340-ABP",
//   isStatusSubmitted: true,
//   mmdlSigDate: "02/21/2023",
//   mmdlSigned: true,
//   programType: "MAC",
//   secSinceMmdlSigned: 1459557,
//   statuses: [
//     {
//       APLCTN_LAST_LIFE_CYC_STUS_CD: 0,
//       APLCTN_LIFE_CYC_STUS_CD: 1,
//       APLCTN_LIFE_CYC_STUS_TYPE_CD: 1,
//       APLCTN_WRKFLW_STUS_ID: 25131,
//       APLCTN_WRKFLW_STUS_TS: 1676989429000,
//       PLAN_WVR_RVSN_ID: 31649,
//       PLAN_WVR_RVSN_VRSN_ID: 16007,
//       PLAN_WVR_SRC_TYPE_CD: "USER",
//       PLAN_WVR_SRC_TYPE_ID: 6182,
//       REPLICA_ID: 16213,
//       REPLICA_TIMESTAMP: 1676989429000,
//     },
//     {
//       APLCTN_LAST_LIFE_CYC_STUS_CD: null,
//       APLCTN_LIFE_CYC_STUS_CD: 0,
//       APLCTN_LIFE_CYC_STUS_TYPE_CD: 1,
//       APLCTN_WRKFLW_STUS_ID: 25127,
//       APLCTN_WRKFLW_STUS_TS: 1676987050000,
//       PLAN_WVR_RVSN_ID: 31649,
//       PLAN_WVR_RVSN_VRSN_ID: 16007,
//       PLAN_WVR_SRC_TYPE_CD: "USER",
//       PLAN_WVR_SRC_TYPE_ID: 14040,
//       REPLICA_ID: 16209,
//       REPLICA_TIMESTAMP: 1676987050000,
//     },
//     {
//       APLCTN_LAST_LIFE_CYC_STUS_CD: null,
//       APLCTN_LIFE_CYC_STUS_CD: 0,
//       APLCTN_LIFE_CYC_STUS_TYPE_CD: 1,
//       APLCTN_WRKFLW_STUS_ID: 25127,
//       APLCTN_WRKFLW_STUS_TS: 1676987050000,
//       PLAN_WVR_RVSN_ID: 31649,
//       PLAN_WVR_RVSN_VRSN_ID: 16007,
//       PLAN_WVR_SRC_TYPE_CD: "USER",
//       PLAN_WVR_SRC_TYPE_ID: 14040,
//       REPLICA_ID: 16209,
//       REPLICA_TIMESTAMP: 1676987050000,
//     },
//   ],
//   TN: "TX-23-1112",
// };

// const seatool = {
//   PK: "TX-23-1112",
//   SK: "TX-23-1112",
// };
