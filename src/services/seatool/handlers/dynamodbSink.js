import { update } from "../../../libs/dynamodb-lib";

exports.handler = async function (event, context, callback) {
  console.log(`Received event for item:`, JSON.stringify(event, null, 2));
  console.log(
    `Received event for records:`,
    JSON.stringify(Object.keys(event.records), null, 2)
  );
  const records = [];

  Object.keys(event.records).forEach((key) => {
    records.push(...event.records[key]);
  });

  await Promise.all(
    records.map((record) => {
      const id = Buffer.from(record.key, "base64").toString();
      const item = Buffer.from(record.value, "base64").toString();
      console.log(
        `Received event for item ${id}:`,
        JSON.stringify(item, null, 2)
      );

      return update({
        region: process.env.region,
        tableName: process.env.tableName,
        item: { id: JSON.parse(event.key), ...JSON.parse(event.value) },
      });
    })
  )
    .then((res) => {
      console.log(
        `Response after updating the records`,
        JSON.stringify(res, null, 2)
      );
    })
    .catch((error) => {
      console.log(
        `ERROR from updating the records`,
        JSON.stringify(error, null, 2)
      );
    });
};
