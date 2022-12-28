import { getItem } from "../../../libs/dynamodb-lib";

// check to see how long ago record was submitted
exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const result = { ...event.Payload };
  try {
    const item = await getItem(process.env.mmdlTableName, result.id);
    console.log("Received item:", JSON.stringify(item, null, 2));

    // see if there is a stMedDirSgnDt.FIELD_VALUE format: "MM/DD/YYYY"
    if (item && item.stMedDirSgnDt && item.stMedDirSgnDt.FIELD_VALUE) {
      // mmdl record was signed
      // Record is signed
      const dateSigned = item.stMedDirSgnDt.FIELD_VALUE;

      // get days since
      const today = new Date();
      const signedOn = new Date(dateSigned);
      const msInDay = 24 * 60 * 60 * 1000;

      const diff = (+today - +signedOn) / msInDay;
      result.daysSinceMmdlSigned = Math.floor(diff);
      result.mmdlSigned = true;
      result.mmdlSigDate = dateSigned;
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.log(`Returning result `, JSON.stringify(result, null, 2));

    callback(null, result);
  }
};
