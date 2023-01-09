import { getItem } from "../../../libs/dynamodb-lib";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));
  const data = { ...event.Payload, match: false };

  try {
    const mmdlRecord = await getItem(process.env.mmdlTableName, data.id);

    console.log("Record from MMDL:  " + mmdlRecord);

    if (!mmdlRecord) {
      console.log("No mmdl item found");
    }
    data.mmdlRecord = mmdlRecord;

    if (
      data.mmdlRecord.stMedDirSgnDt &&
      data.mmdlRecord.stMedDirSgnDt.FIELD_VALUE
    ) {
      data.mmdlSigDate = data.mmdlRecord.stMedDirSgnDt.FIELD_VALUE;
    }

    if (
      data.seatoolRecord &&
      data.seatoolRecord.STATE_PLAN &&
      data.seatoolRecord.STATE_PLAN.SUBMISSION_DATE
    ) {
      const rawDate = data.seatoolRecord.STATE_PLAN.SUBMISSION_DATE;
      const date = new Date(rawDate);
      const fullDate = date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      data.seatoolSigDate = fullDate;
      console.log(fullDate);
    }

    if (
      data.mmdlSigDate &&
      data.seatoolSigDate &&
      data.mmdlSigDate === data.seatoolSigDate
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
