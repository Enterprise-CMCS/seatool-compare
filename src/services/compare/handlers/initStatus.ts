import { putItem, trackError } from "../../../libs";

exports.handler = async function (
  event: { Context: { Execution: { Input: { id: string } } } },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const id = event.Context.Execution.Input.id;
  const data = { iterations: 0, id };

  if (!process.env.statusTableName) {
    throw "process.env.statusTableName needs to be defined.";
  }
  try {
    await putItem({
      tableName: process.env.statusTableName,
      item: data,
    });
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`data after putting item: ${JSON.stringify(data, null, 2)}`);
    callback(null, data);
  }
};
