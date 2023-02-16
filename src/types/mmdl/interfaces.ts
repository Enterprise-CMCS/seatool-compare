export interface MmdlRecord {
  mac179_transNbr?: { FIELD_PROGRAM_TYPE_CODE: string };
  chp179_transNbr?: { FIELD_PROGRAM_TYPE_CODE: string };
  hhs_transNbr?: { FIELD_PROGRAM_TYPE_CODE: string };
  stMedDirSgnDt?: { FIELD_VALUE: any };
  statuses: ApplicationWorkflowStatus[];
  id: any;
  transmittalNumber: string;
}

export interface MmdlStreamRecord {
  FORM_FIELDS: FormFields;
  APPLICATION_WORKFLOW_STATUSES: ApplicationWorkflowStatus[];
}

interface FormFields {
  [key: string]: MmdlFormField;
}

export interface MmdlFormField {
  FIELD_NAME: string;
  FIELD_DESCRIPTION: string;
  FIELD_VALUE: string;
  FIELD_MAPPING_DATA_TYPE: string;
  FIELD_CHANGE_TYPE_CODE: string;
  FIELD_MAPPING_NOTE_TEXT: any;
  FIELD_PROGRAM_TYPE_CODE: string;
  REVISION_ID: number;
  REVISION_TITLE_DESCRIPTION: any;
  REVISION_REQUEST_TYPE_CODE: string;
  REVISION_APPROVED_EFFECTIVE_DATE: number;
  REVISION_VERSION_ID: number;
  REVISION_VERSION_WAIVER_DESCIPTION: string;
  REVISION_VERSION_MODEL_TYPE_CODE: string;
  WAIVER_TYPE_CODE: string;
  WAIVER_REVISION_TITLE_TEXT: any;
  WAIVER_REVISION_APPROVED_DATE: number;
  WAIVER_REVISION_EXPIRATION_DATE: number;
  WAVIER_REVISION_CLOCK_START_DATE: number;
}

/* APLCTN_[LAST_]LIFE_CYC_STUS_CD */

/*
  C_PLACEHOLDER   = -3
  C_INACTIVE      = -2
  C_INCIPIENT     = -1 - DRAFT
  C_INCOMPLETE    =  0
  C_PENDING       =  1 - SUBMITTED
  C_UNSUBMITTED   =  2
  C_WITHDRAWN     =  3
  C_REJECTED      =  4
  C_APPROVED      =  5
  C_EXPIRED       =  6
  C_TERMINATED    =  7
  C_WAITING_RAI   =  9
  C_WAITING_IRAI  =  10
*/

interface ApplicationWorkflowStatus {
  APLCTN_WRKFLW_STUS_ID: number;
  PLAN_WVR_RVSN_VRSN_ID: number;
  PLAN_WVR_RVSN_ID: number;
  APLCTN_LIFE_CYC_STUS_CD: number;
  APLCTN_LAST_LIFE_CYC_STUS_CD?: number;
  APLCTN_WRKFLW_STUS_TS: number;
  PLAN_WVR_SRC_TYPE_CD: string;
  PLAN_WVR_SRC_TYPE_ID: number;
  APLCTN_LIFE_CYC_STUS_TYPE_CD: number;
  REPLICA_TIMESTAMP: number;
  REPLICA_ID: number;
}

export interface MmdlSeatoolCompareData {
  mmdlSigned: boolean;
  secSinceMmdlSigned?: number;
  mmdlSigDate?: Date;
  status?: number;
  lastStatus?: number;
  mmdlRecord: MmdlRecord;
  id: string;
  transmittalNumber: string;
  programType?: string;
  isStatusSubmitted?: boolean;
}

export interface MmdlRecordKeyObject {
  AGGREGATED_FORM_FIELDS_WAIVER_ID: number;
  STATE_CODE: string;
  GROUP_CODE: string;
  PROGRAM_TYPE_CODE: string;
}

export interface MmdlSigInfo {
  secSinceMmdlSigned?: number;
  mmdlSigned: boolean;
  mmdlSigDate?: Date;
  status?: number;
  lastStatus?: number;
}

export interface MmdlReportData {
  id: string;
  iterations: number;
  programType: string;
  mmdlSigDate: string;
  seatoolExist: boolean;
  seatoolSigDate?: string;
  match?: boolean;
  isStatusSubmitted?: boolean;
}
