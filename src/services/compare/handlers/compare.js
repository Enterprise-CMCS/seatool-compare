import { getItem } from "../../../libs/dynamodb-lib";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload, match: false };

  try {
    const mmdlItem = await getItem(process.env.mmdlTableName, data.id);

    console.log("Item from MMDL:  " + mmdlItem);

    if (!mmdlItem) {
      console.log("No mmdl item found");
    }
    data.mmdlRecord = mmdlItem;

    if (
      data.mmdlItem.stMedDirSgnDt &&
      data.mmdlItem.stMedDirSgnDt.FIELD_VALUE
    ) {
      data.mmdlSignedDate = mmdlItem.stMedDirSgnDt.FIELD_VALUE;
    }

    if (
      data.seatoolItem &&
      data.seatoolItem.STATE_PLAN &&
      data.seatoolItem.STATE_PLAN.SUBMISSION_DATE
    ) {
      const rawDate = data.seatoolItem.STATE_PLAN.SUBMISSION_DATE;
      const date = new Date(rawDate);
      const fullDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
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
  } catch (error) {
    console.log("Eror comparing records:", error);
  } finally {
    console.log("Data after compare task:", JSON.stringify(data, null, 2));
    callback(null, data);
  }
};
