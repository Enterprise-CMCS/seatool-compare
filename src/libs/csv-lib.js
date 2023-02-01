import { Parser } from "@json2csv/plainjs";

export function getCsvFromJson(json) {
  try {
    // options available here: https://juanjodiaz.github.io/json2csv/#/parsers/parser?id=options
    const opts = {};
    const parser = new Parser(opts);
    const csv = parser.parse(json);
    return csv;
  } catch (err) {
    console.error(err);
  }
}
