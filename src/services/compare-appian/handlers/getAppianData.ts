import { getItem, trackError } from "../../../libs";
// import {
//   getAppianProgType,
//   getAppianSigInfo,
// } from "./utils/getAppianlInfoFromRecord";
// import { AppianRecord } from "./interfaces";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload };
  try {
    const appianRecord = await getItem({
      tableName: process.env.appianTableName,
      id: data.id,
    });
    data.appianRecord = appianRecord;
    console.log(data.appianRecord, appianRecord, event.Payload);

    // const { programType } = getAppianProgType(appianRecord as AppianRecord);
    // const sigInfo = getAppianSigInfo(appianRecord as AppianRecord);

    // data.programType = programType;
    // data.secSinceAppianSigned = sigInfo.secSinceAppianSigned;
    // data.appianSigned = sigInfo.appianSigned;
    //    data.appianSigDate = sigInfo.appianSigDate;
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(`Returning data `, JSON.stringify(data, null, 2));

    callback(null, data);
  }
};
