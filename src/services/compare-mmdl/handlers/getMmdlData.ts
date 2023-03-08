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

  if (!process.env.mmdlTableName) {
    throw "process.env.mmdlTableName needs to be defined.";
  }

  try {
    const mmdlRecord = await getItem({
      tableName: process.env.mmdlTableName,
      key: {
        PK: data.PK,
        SK: data.SK,
      },
    });

    data.mmdlRecord = mmdlRecord as Types.MmdlRecord;
    data.TN = mmdlRecord?.TN;

    const { programType } = getMmdlProgType(mmdlRecord as Types.MmdlRecord);
    const sigInfo = getMmdlSigInfo(mmdlRecord as Types.MmdlRecord);

    const isStatusSubmitted = sigInfo.status === 1;

    data.programType = programType;
    data.secSinceMmdlSigned = sigInfo.secSinceMmdlSigned;
    data.mmdlSigned = sigInfo.mmdlSigned;
    data.mmdlSigDate = sigInfo.mmdlSigDate;
    data.isStatusSubmitted = isStatusSubmitted;
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
