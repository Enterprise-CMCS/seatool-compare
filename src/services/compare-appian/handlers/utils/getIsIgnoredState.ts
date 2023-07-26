import * as Types from "../../../../types";

export const getIsIgnoredState = (
  data: Types.AppianReportData | Types.ReportData
) => {
  const ignoredStates = process.env.ignoredStates;
  if (!ignoredStates) {
    return false;
  }
  const testStatesList: string[] = [];
  ignoredStates
    .split(",")
    .forEach((state: string) => testStatesList.push(state));
  const isIgnoredState =
    testStatesList.indexOf(
      data.SPA_ID
        ? data.SPA_ID.slice(0, 2).toUpperCase()
        : data.SPA_PCKG_ID.slice(0, 2).toUpperCase()
    ) > -1;
  if (isIgnoredState) {
    console.log("IGNORED STATE - NO ALERTS WILL BE SENT");
    return true;
  } else {
    return false;
  }
};
