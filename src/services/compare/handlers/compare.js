import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
const client = new DynamoDBClient({
  region: process.env.region,
});

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const id = event.Context.Execution.Input.id;
  var response = {
    statusCode: 200,
    match: false,
  };
  try {
    const mmdlItem = await getItem(process.env.mmdlTableName, id);
    const seatoolItem = await getItem(process.env.seatoolTableName, id);
    console.log("Item from MMDL:  " + mmdlItem);
    console.log("Item from SEA Tool:  " + seatoolItem);
    console.log(
      "Here is where you can do a comparison of the items gotten from mmdl and seatool tables.  For testing simplicity, I'm just going to randomly return match=true about 30 percent of the time."
    );
    if (Math.random() < 0.3) {
      response.match = true;
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.log(`Responding with match set to:  ${response.match}`);
    callback(null, response);
  }
};

async function getItem(tableName, id) {
  const item = (
    await client.send(
      new GetItemCommand({
        TableName: tableName,
        Key: {
          id: {
            S: id,
          },
        },
      })
    )
  ).Item;
  return item;
}
