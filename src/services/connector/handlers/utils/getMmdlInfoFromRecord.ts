import * as Types from "../../../../types";
/**
 * It takes a MMDL record and returns an object with information about when it was signed
 * @param mmdlRecord - MMDL record
 * @returns An object with the following properties:
 *   mmdlSigned: boolean
 *   secSinceMmdlSigned: number
 *   mmdlSigDate: string
 */
export function getMmdlSigInfo(
  mmdlRecord: Types.MmdlRecord
): Types.MmdlSigInfo {
  let result: Types.MmdlSigInfo = {
    mmdlSigned: false,
  };

  /* Checking to see if the record has been signed. */
  if (!!mmdlRecord?.stMedDirSgnDt?.FIELD_VALUE) {
    const dateSigned = mmdlRecord.stMedDirSgnDt?.FIELD_VALUE;

    result.mmdlSigned = true;
    result.mmdlSigDate = dateSigned;
  }

  let statuses: any[] = [];
  if (mmdlRecord.statuses) {
    statuses = mmdlRecord.statuses.sort(
      (a, b) => b.APLCTN_LIFE_CYC_STUS_CD - a.APLCTN_LIFE_CYC_STUS_CD
    );
  }

  // we add a default here so there is allways a number value
  const status = statuses[0]?.APLCTN_LIFE_CYC_STUS_CD ?? 99;
  const lastStatus = statuses[1]?.APLCTN_LAST_LIFE_CYC_STUS_CD ?? 99;

  const isStatusSubmitted = status === 1;
  result.status = status;
  result.lastStatus = lastStatus;
  result.isStatusSubmitted = isStatusSubmitted;

  return result;
}

/**
 * It takes a record from the MMDL database and returns the program type
 * @param mmdlRecord - the record from the MMDL table
 */
export function getMmdlProgType(mmdlRecord: Types.MmdlRecord): {
  programType?: string;
} {
  const result: {
    programType?: string;
  } = {};

  /* Getting the program type code for the record. one and only of these will exists */
  if (!!mmdlRecord?.mac179_transNbr?.FIELD_PROGRAM_TYPE_CODE) {
    result.programType =
      mmdlRecord.mac179_transNbr?.FIELD_PROGRAM_TYPE_CODE || "MAC";
  } else if (!!mmdlRecord?.chp179_transNbr?.FIELD_PROGRAM_TYPE_CODE) {
    result.programType =
      mmdlRecord.chp179_transNbr?.FIELD_PROGRAM_TYPE_CODE || "CHP";
  } else if (!!mmdlRecord?.hhs_transNbr?.FIELD_PROGRAM_TYPE_CODE) {
    result.programType =
      mmdlRecord.hhs_transNbr?.FIELD_PROGRAM_TYPE_CODE || "HHS";
  }
  return result;
}
