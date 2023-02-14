import { getItem, trackError } from "../../../libs";
import { getMmdlProgType, getMmdlSigInfo } from "./utils/getMmdlInfoFromRecord";
import * as Types from "../../../types";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data: Types.MmdlSeatoolCompareData = { ...event.Payload };
  try {
    const mmdlRecord = await getItem({
      tableName: process.env.mmdlTableName,
      id: data.id,
    });
    data.mmdlRecord = mmdlRecord as Types.MmdlRecord;
    data.transmittalNumber = mmdlRecord?.transmittalNumber;

    const { programType } = getMmdlProgType(mmdlRecord as Types.MmdlRecord);
    const sigInfo = getMmdlSigInfo(mmdlRecord as Types.MmdlRecord);

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
