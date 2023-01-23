import { getItem, trackError } from "../../../libs";
import { getMmdlProgType, getMmdlSigInfo } from "./utils/getMmdlInfoFromRecord";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload };
  try {
    const mmdlRecord = await getItem({
      tableName: process.env.mmdlTableName,
      id: data.id,
    });
    data.mmdlRecord = mmdlRecord;

    const { programType } = getMmdlProgType(mmdlRecord);
    const sigInfo = getMmdlSigInfo(mmdlRecord);

    data.programType = programType;
    data.secSinceMmdlSigned = sigInfo.secSinceMmdlSigned;
    data.mmdlSigned = sigInfo.mmdlSigned;
    data.mmdlSigDate = sigInfo.mmdlSigDate;
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
