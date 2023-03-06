import { getItem, trackError } from "../../../libs";
import * as Types from "../../../types";

exports.handler = async function (
  event: { Payload: any },
  _context: any,
  callback: Function
) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data: Types.MmdlSeatoolCompareData = {
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
        id: data.TN,
      },
    });

    if (item) {
      data.seatoolExist = true;
      data.seatoolRecord = item;
    } else {
      console.log(
        `No Seatool record found for mmdl record id: ${data.PK}, Tranmittal Number: ${data.TN}`
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
