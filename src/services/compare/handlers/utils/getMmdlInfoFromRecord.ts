import { has } from "lodash";

/**
 * It takes a MMDL record and returns an object with information about when it was signed
 * @param mmdlRecord - MMDL record
 * @returns An object with the following properties:
 *   mmdlSigned: boolean
 *   secSinceMmdlSigned: number
 *   mmdlSigDate: string
 */
export function getMmdlSigInfo(mmdlRecord) {
  const result = {
    mmdlSigned: false,
  };

  /* Checking to see if the record has been signed. */
  if (has(mmdlRecord, ["stMedDirSgnDt", "FIELD_VALUE"])) {
    const dateSigned = mmdlRecord.stMedDirSgnDt.FIELD_VALUE;

    /* Calculating the difference between the current date and the date MMDL was signed. */
    const today = new Date();
    const signedOn = new Date(dateSigned);

    const diffInSec = (today - signedOn) / 1000; // from ms to sec we div by 1000

    if (diffInSec < 0) {
      throw `Signed date is future date for MMDL record: ${mmdlRecord.id}`;
    }

    /* Returning the difference between the current date and the date MMDL was signed. */
    result.secSinceMmdlSigned = Math.floor(diffInSec);
    result.mmdlSigned = true;
    result.mmdlSigDate = dateSigned;
  }
  return result;
}

/**
 * It takes a record from the MMDL database and returns the program type
 * @param mmdlRecord - the record from the MMDL table
 */
export function getMmdlProgType(mmdlRecord) {
  const result = {
    programType: null,
  };

  /* Getting the program type code for the record. one and only of these will exists */
  if (has(mmdlRecord, ["mac179_transNbr", "FIELD_PROGRAM_TYPE_CODE"])) {
    result.programType =
      mmdlRecord.mac179_transNbr.FIELD_PROGRAM_TYPE_CODE || "MAC";
  } else if (has(mmdlRecord, ["chp179_transNbr", "FIELD_PROGRAM_TYPE_CODE"])) {
    result.programType =
      mmdlRecord.chp179_transNbr.FIELD_PROGRAM_TYPE_CODE || "CHP";
  } else if (has(mmdlRecord, ["hhs_transNbr", "FIELD_PROGRAM_TYPE_CODE"])) {
    result.programType =
      mmdlRecord.hhs_transNbr.FIELD_PROGRAM_TYPE_CODE || "HHS";
  }
  return result;
}
