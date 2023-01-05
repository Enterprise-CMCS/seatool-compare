import { getItem } from "../../../libs/dynamodb-lib";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload };
  try {
    const item = await getItem(process.env.mmdlTableName, data.id);
    console.log("Received item:", JSON.stringify(item, null, 2));

    // see if there is a stMedDirSgnDt.FIELD_VALUE format: "MM/DD/YYYY"
    if (item && item.stMedDirSgnDt && item.stMedDirSgnDt.FIELD_VALUE) {
      // mmdl record was signed

      // Record is signed
      const dateSigned = item.stMedDirSgnDt.FIELD_VALUE;

      // get milliseconds since
      const today = new Date();
      const signedOn = new Date(dateSigned);

      const diffInSec = (today - signedOn) / 1000; // from ms to sec we div by 1000

      if (diffInSec < 0) {
        throw `Signed date is future date for MMDL record: ${data.id}`;
      }

      data.secSinceMmdlSigned = diffInSec;
      data.mmdlSigned = true;
      data.mmdlSigDate = dateSigned;
      data.mmdlItem = item;
    }
  } catch (error) {
    console.log(error);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
