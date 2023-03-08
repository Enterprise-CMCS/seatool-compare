import * as dynamodb from "../../../libs/dynamodb-lib";
import * as Types from "../../../types";

async function myHandler(
  event: { value: string; key: string },
  _context: any,
  _callback: Function
) {
  console.log("EVENT:", JSON.stringify(event, null, 2));
  // ex. event.key: "{\"WAIVER_ID\":13576,\"STATE_CODE\":\"WI\",\"GROUP_CODE\":\"HCBS\",\"PROGRAM_TYPE_CODE\":\"CHP\"}"

  if (!process.env.tableName) {
    throw "process.env.tableName needs to be defined.";
  }

  try {
    const recordKeyObject = JSON.parse(event.key) as Types.MmdlRecordKeyObject;
    const recordValueObject = JSON.parse(event.value) as Types.MmdlStreamRecord;

    const id = `${recordKeyObject.STATE_CODE}-${recordKeyObject.AGGREGATED_FORM_FIELDS_WAIVER_ID}-${recordKeyObject.PROGRAM_TYPE_CODE}`;
    const key = { PK: id, SK: id };

    // Typically the PROGRAM_TYPE_CODE will match this _transNbr key
    //   MAC: "mac179_transNbr",
    //   CHP: "chp179_transNbr",
    //   HHS: "hhs_transNbr",

    // But the PROGRAM_TYPE_CODE might not match the expected transmittal number.
    // As such we should use whichever _transNbr is available in the record
    const possibleTransmittalNumberKeys = Object.keys(
      recordValueObject.FORM_FIELDS
    ).filter(
      (k) =>
        k === "mac179_transNbr" ||
        k === "chp179_transNbr" ||
        k === "hhs_transNbr"
    );

    if (possibleTransmittalNumberKeys.length === 0) {
      console.log("No transmittal id available for the record", event);
      return;
    }

    if (possibleTransmittalNumberKeys.length > 1) {
      console.error(
        "Error - Multiple transmittal ids found. Outputting event and possible transmittal numbers:",
        JSON.stringify({ possibleTransmittalNumberKeys, event }, null, 2)
      );
      return;
    }

    const transmittalNumberKey = possibleTransmittalNumberKeys[0];

    let transmittalNumber;

    if (recordValueObject.FORM_FIELDS[transmittalNumberKey].FIELD_VALUE) {
      transmittalNumber =
        recordValueObject.FORM_FIELDS[transmittalNumberKey].FIELD_VALUE;
    }

    if (!transmittalNumber) {
      console.error(
        "Error - No valid transmittal ID value for this record",
        event
      );
      return;
    }

    const item: Types.MmdlRecord = {
      ...key,
      TN: transmittalNumber.trim().toUpperCase(),
      ...recordValueObject.FORM_FIELDS,
      statuses: recordValueObject.APPLICATION_WORKFLOW_STATUSES,
    };

    await dynamodb.putItem({
      tableName: process.env.tableName,
      item,
    });
  } catch (error) {
    console.log("Error updading mmdl table", event);
    console.error(error);
  }
}

exports.handler = myHandler;
