import { putItem, trackError } from "../../../libs";
import { MmdlSeatoolCompareData } from "../../../types";

exports.handler = async function (
  event: { Context: { Execution: { Input: { PK: string; SK: string } } } },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const PK = event.Context.Execution.Input.PK;
  const SK = event.Context.Execution.Input.SK;
  const data: MmdlSeatoolCompareData = { iterations: 0, PK, SK };

  if (!process.env.statusTableName) {
    throw "process.env.statusTableName needs to be defined.";
  }

  try {
    await putItem({ tableName: process.env.statusTableName, item: data });
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`data after putting item: ${JSON.stringify(data, null, 2)}`);
    callback(null, data);
  }
};
