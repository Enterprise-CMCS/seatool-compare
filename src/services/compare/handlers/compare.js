import { getItem } from "../../../libs/dynamodb-lib";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload, match: false };

  try {
    const mmdlItem = await getItem(process.env.mmdlTableName, data.id);
    const seatoolItem = await getItem(process.env.seatoolTableName, data.id);

    console.log("Item from MMDL:  " + mmdlItem);
    console.log("Item from SEA Tool:  " + seatoolItem);

    if (!mmdlItem) {
      console.log("No mmdl item found");
    }
    if (!seatoolItem) {
      console.log("No seatool item found");
    }

    // get the signature date from mmdl - this is provided in DD/MM/YYYY
    if (
      mmdlItem &&
      mmdlItem.stMedDirSgnDt &&
      mmdlItem.stMedDirSgnDt.FIELD_VALUE
    ) {
      data.mmdlSignedDate = mmdlItem.stMedDirSgnDt.FIELD_VALUE;
    }

    if (
      seatoolItem &&
      seatoolItem.STATE_PLAN &&
      seatoolItem.STATE_PLAN.SUBMISSION_DATE
    ) {
      const rawDate = seatoolItem.STATE_PLAN.SUBMISSION_DATE;
      const date = new Date(rawDate);
      const day = date.getDate();
      const month = date.getMonth();
      const year = date.getFullYear();
      const fullDate = day + "/" + (month + 1) + "/" + year;
      data.seatoolSignedDate = fullDate;
      console.log(fullDate);
    }

    if (
      data.mmdlSignedDate &&
      data.seatoolSignedDate &&
      data.mmdlSignedDate === data.seatoolSignedDate
    ) {
      console.log("DATES MATCH!!");
      data.match = true;
    }

    // get the submitted date from seatool - this is epic time x 1000 - turn it into a readable date to compare with mmdl date
  } catch (error) {
    console.log("Eror comparing records:", error);
  } finally {
    console.log("Data after compare task:", JSON.stringify(data, null, 2));
    callback(null, data);
  }
};
