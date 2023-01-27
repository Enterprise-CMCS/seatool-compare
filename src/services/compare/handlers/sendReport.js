import {
  sendAttachment,
  trackError,
  scanTable,
  getCsvFromJson,
} from "../../../libs";

function formatReportData(data) {
  return data.map((i) => {
    return {
      "Transmittal ID": i.id,
      "Iterations ": i.iterations,
      "Program Type": i.programType,
      "Clock Start Date": i.mmdlSigDate,
      "Seatool Record Exist": i.seatoolExist,
      "Seatool Signed Date": i.seatoolSigDate || "N/A",
      "Records Match": i.match || false,
    };
  });
}

exports.handler = async function (event, context, callback) {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    const data = await scanTable(process.env.statusTable);
    const reportDataJson = formatReportData(data);
    const csv = getCsvFromJson(reportDataJson);

    await sendAttachment(csv);
  } catch (e) {
    await trackError(e);
  }
};
