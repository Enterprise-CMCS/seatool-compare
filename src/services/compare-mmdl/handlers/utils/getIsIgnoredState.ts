import * as Types from "../../../../types";

export const getIsIgnoredState = (data: Types.MmdlReportData) => {
  const ignoredStates = process.env.ignoredStates;
  if (!ignoredStates) {
    return false;
  }
  const testStatesList: string[] = [];
  ignoredStates
    .split(",")
    .forEach((state: string) => testStatesList.push(state));
  const isIgnoredState = testStatesList.indexOf(data.TN.slice(0, 2)) > -1;
  if (isIgnoredState) {
    console.log("TEST STATE - NO ALERTS WILL BE SENT");
    return true;
  } else {
    return false;
  }
};
