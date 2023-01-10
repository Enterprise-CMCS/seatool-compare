import { getItem } from "../../../libs/dynamodb-lib";
import { getMmdlProgType, getMmdlSigInfo } from "./utils/getMmdlInfoFromRecord";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload };
  try {
    /* There may already be mmdl but we want to make sure we have the current data */
    const mmdlRecord = await getItem(process.env.mmdlTableName, data.id);
    data.mmdlRecord = mmdlRecord;

    const { programType } = getMmdlProgType(mmdlRecord);
    const sigInfo = getMmdlSigInfo(mmdlRecord);

    /* Adding the programType, secSinceMmdlSigned, mdlSigned, and mdlSigDate to the data object. */
    data.programType = programType;
    data.secSinceMmdlSigned = sigInfo.secSinceMmdlSigned;
    data.mmdlSigned = sigInfo.mmdlSigned;
    data.mmdlSigDate = sigInfo.mmdlSigDate;
  } catch (error) {
    console.log(error);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
