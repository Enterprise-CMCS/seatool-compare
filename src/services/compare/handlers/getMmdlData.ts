import { getItem, trackError } from "../../../libs";
import { getMmdlProgType, getMmdlSigInfo } from "./utils/getMmdlInfoFromRecord";
import { MmdlRecord } from "./interfaces";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload };
  try {
    const mmdlRecord = await getItem({
      tableName: process.env.mmdlTableName,
      id: data.id,
    });
    data.mmdlRecord = mmdlRecord;

    const { programType } = getMmdlProgType(mmdlRecord as MmdlRecord);
    const sigInfo = getMmdlSigInfo(mmdlRecord as MmdlRecord);

    data.programType = programType;
    if ("secSinceMmdlSigned" in sigInfo)
      // TODO: note, tsc checking seems to think secSinceMmdlSigned will never exist in sigInfo.
      data.secSinceMmdlSigned = sigInfo.secSinceMmdlSigned;
    data.mmdlSigned = sigInfo.mmdlSigned;
    if ("mmdlSigDate" in sigInfo) data.mmdlSigDate = sigInfo.mmdlSigDate; // TODO: note, tsc checking seems to think mmdlSigDate will never exist in sigInfo.
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
