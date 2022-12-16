import * as dynamodb from "../../../libs/dynamodb-lib";

async function myHandler(event, _context, _callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  // determine the type of record ex: chp | mac | hhs

  const mapOfProgramTypeToTransmittalNumberKey = {
    MAC: "mac179_transNbr",
    CHP: "chp179_transNbr",
    HHS: "hhs_transNbr",
  };

  const recordKeyObject = JSON.parse(event.key);

  const typeOfRecord = recordKeyObject.PROGRAM_TYPE_CODE;

  // All records have a PROGRAM_TYPE_CODE but if they are not MAC/CHP/HHS they are not relevant
  if (!mapOfProgramTypeToTransmittalNumberKey[typeOfRecord]) {
    console.log(
      "MMDL Record is not of relevent program type. PROGRAM_TYPE_CODE:",
      typeOfRecord
    );
    return;
  }

  // get the transmittal number based on the record type

  const recordValueObject = JSON.parse(event.value);

  try {
    const id =
      recordValueObject[mapOfProgramTypeToTransmittalNumberKey[typeOfRecord]]
        .FIELD_VALUE;

    await dynamodb.update({
      tableName: process.env.tableName,
      item: { id, ...recordValueObject },
    });
  } catch (error) {
    console.log("Error updading mmdl table", JSON.stringify(event, null, 2));
    console.error(error);
  }
}

exports.handler = myHandler;
