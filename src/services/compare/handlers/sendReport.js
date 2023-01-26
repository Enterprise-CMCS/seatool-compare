import { sendAttachment, trackError, scanTable } from "../../../libs";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    const results = await scanTable(process.env.statusTable);
    console.log("Results:", JSON.stringify(results, null, 2));

    await sendAttachment();
  } catch (e) {
    await trackError(e);
  }
};
