import { getItem, trackError } from "../../../libs";
import * as Types from "../../../types";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data: Types.MmdlReportData = {
    ...event.Payload,
    seatoolExist: false,
  };

  if (!process.env.seatoolTableName) {
    throw "process.env.seatoolTableName needs to be defined.";
  }

  try {
    const item = await getItem({
      tableName: process.env.seatoolTableName,
      key: {
        PK: data.TN,
        SK: data.TN,
      },
    });

    if (item) {
      data.seatoolExist = true;
    } else {
      console.log(
        `No Seatool record found for mmdl record id: ${data.PK}, Transmittal Number: ${data.TN}`
      );
    }
  } catch (e) {
    await trackError(e);
  } finally {
    console.log(
      `data after finding seatool item: ${JSON.stringify(data, null, 2)}`
    );

    callback(null, data);
  }
};
