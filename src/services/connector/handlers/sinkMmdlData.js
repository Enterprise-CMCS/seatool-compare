import * as dynamodb from "../../../libs/dynamodb-lib";

async function myHandler(event, _context, _callback) {
  try {
    const recordValueObject = JSON.parse(event.value);

    // Typically the PROGRAM_TYPE_CODE will match this _transNbr key
    //   MAC: "mac179_transNbr",
    //   CHP: "chp179_transNbr",
    //   HHS: "hhs_transNbr",

    // But the PROGRAM_TYPE_CODE might not match the expected transmittal number.
    // As such we should use whichever _transNbr is available in the record
    const possibleTransmittalNumberKeys = Object.keys(recordValueObject).filter(
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

    let id;

    if (recordValueObject[transmittalNumberKey].FIELD_VALUE) {
      id = recordValueObject[transmittalNumberKey].FIELD_VALUE;
    }

    if (!id) {
      console.error(
        "Error - No valid transmittal ID value for this record",
        event
      );
      return;
    }

    await dynamodb.putItem({
      tableName: process.env.tableName,
      item: { id, ...recordValueObject },
    });
  } catch (error) {
    console.log("Error updading mmdl table", event);
    console.error(error);
  }
}

exports.handler = myHandler;
