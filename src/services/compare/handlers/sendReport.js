import { sendAttachment, trackError } from "../../../libs";

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    await sendAttachment();
  } catch (e) {
    await trackError(e);
  }
};
