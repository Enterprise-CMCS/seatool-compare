import { putItem, getItem } from "../../../libs/dynamodb-lib";
import { has } from "lodash";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const id = event.Context.Execution.Input.id;
  const data = { iterations: 0, id };

  // should we ignore records that arent signed?
  // should we ignore records that over 250 days old?
  // If so we could do that logic here

  try {
    const mmdlRecord = await getItem(process.env.mmdlTableName, data.id);
    data.mmdlRecord = mmdlRecord;

    // only one of these will exist otherwise it wouldnt have gotten this far
    // but for peace of mind just double check and use the defaults.
    if (has(mmdlRecord, ["mac179_transNbr", "FIELD_PROGRAM_TYPE_CODE"])) {
      data.programType =
        mmdlRecord.mac179_transNbr.FIELD_PROGRAM_TYPE_CODE || "MAC";
    } else if (
      has(mmdlRecord, ["chp179_transNbr", "FIELD_PROGRAM_TYPE_CODE"])
    ) {
      data.programType =
        mmdlRecord.chp179_transNbr.FIELD_PROGRAM_TYPE_CODE || "CHP";
    } else if (has(mmdlRecord, ["hhs_transNbr", "FIELD_PROGRAM_TYPE_CODE"])) {
      data.programType =
        mmdlRecord.hhs_transNbr.FIELD_PROGRAM_TYPE_CODE || "HHS";
    }

    await putItem({
      tableName: process.env.statusTableName,
      item: data,
    });
  } catch (error) {
    console.log(error);
  } finally {
    console.log(`data after putting item: ${JSON.stringify(data, null, 2)}`);

    callback(null, data);
  }
};
