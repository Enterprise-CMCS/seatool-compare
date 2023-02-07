import { has } from "lodash";

/**
 * It takes a Appian record and returns an object with information about when it was signed
 * @param appianRecord - Appian record
 * @returns An object with the following properties:
 *   appianSigned: boolean
 *   secSinceAppianSigned: number
 *   appianSigDate: string
 */
export function getAppianSigInfo(appianRecord: {
  stMedDirSgnDt: { FIELD_VALUE: any };
  id: any;
}) {
  const result: {
    appianSigned: boolean;
    secSinceAppianSigned?: number;
    appianSigDate?: Date;
  } = {
    appianSigned: false,
  };

  /* Checking to see if the record has been signed. */
  if (has(appianRecord, ["stMedDirSgnDt", "FIELD_VALUE"])) {
    const dateSigned = appianRecord.stMedDirSgnDt.FIELD_VALUE;

    /* Calculating the difference between the current date and the date Appian was signed. */
    const today = new Date().getTime();
    const signedOn = new Date(dateSigned).getTime();

    const diffInSec = (today - signedOn) / 1000; // from ms to sec we div by 1000

    if (diffInSec < 0) {
      throw `Signed date is future date for Appian record: ${appianRecord.id}`;
    }

    /* Returning the difference between the current date and the date Appian was signed. */
    result.secSinceAppianSigned = Math.floor(diffInSec);
    result.appianSigned = true;
    result.appianSigDate = dateSigned;
  }
  return result;
}

/**
 * It takes a record from the Appian database and returns the program type
 * @param appianRecord - the record from the Appian table
 */
export function getAppianProgType(appianRecord: {
  mac179_transNbr: { FIELD_PROGRAM_TYPE_CODE: string };
  chp179_transNbr: { FIELD_PROGRAM_TYPE_CODE: string };
  hhs_transNbr: { FIELD_PROGRAM_TYPE_CODE: string };
}) {
  const result: {
    programType?: string;
  } = {};

  /* Getting the program type code for the record. one and only of these will exists */
  if (has(appianRecord, ["mac179_transNbr", "FIELD_PROGRAM_TYPE_CODE"])) {
    result.programType =
      appianRecord.mac179_transNbr.FIELD_PROGRAM_TYPE_CODE || "MAC";
  } else if (has(appianRecord, ["chp179_transNbr", "FIELD_PROGRAM_TYPE_CODE"])) {
    result.programType =
      appianRecord.chp179_transNbr.FIELD_PROGRAM_TYPE_CODE || "CHP";
  } else if (has(appianRecord, ["hhs_transNbr", "FIELD_PROGRAM_TYPE_CODE"])) {
    result.programType =
      appianRecord.hhs_transNbr.FIELD_PROGRAM_TYPE_CODE || "HHS";
  }
  return result;
}
