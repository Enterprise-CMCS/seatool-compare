export interface AppianRecord {
  PK: string;
  SK: string;
}

export interface AppianStreamRecord {
  payload: FormFields;
}

interface FormFields {
  [key: string]: AppianFormField;
}

export interface AppianFormField {
  APPRVL_TS: number;
  AUTHRTY_CD: string;
  AUTHRTY_TYPE_CD: string;
  CLK_EXPRTN_FLAG: string;
  CLK_STUS: string;
  CNVRTD_FLAG: string;
  CREAT_TS: number;
  CREAT_USER_ID: string;
  CRNT_STUS: string;
  DLTD_FLAG: string;
  EFF_DATE: string;
  HLC_ID: string;
  HLC_LVL_ID: string;
  IS_CRNT_VRSN: string;
  IS_SBMTD: string;
  LOCK_BY: string;
  LOCK_FLAG: 0;
  PCKG_DAYS_ALLWD: string;
  PCKG_DAYS_ELPSD: string;
  PCKG_DRFT: string;
  PCKG_DSPSTN: string;
  PCKG_ID: number;
  PCKG_VRSN: 1;
  PEEK_FLAG: string;
  PGM_CD: string;
  PKG_YR: string;
  PRFL_ID: string;
  PRGRM_NAME: string;
  PRRTY_CD: string;
  PRVNT_SUBMSN_FLAG: string;
  RAI_FLAG: string;
  RGN_CD: string;
  ROUTG_INSTR: string;
  RVW_SQNC: string;
  SBMSSN_DATE: number;
  SBMSSN_PKG_TYPE: string;
  SBMSSN_TYPE: string;
  SBMSSN_TYPE_PKG_ID: string;
  SPA_ID: string;
  SPA_PCKG_ID: string;
  SRC_DRAFT_PKG_ID: string;
  SRM_MLSTN_DATE: string;
  SRT_MLSTN_DATE: number;
  STATE_CD: string;
  SUB_STUS: string;
  UPDT_TS: number;
  UPDT_USER_ID: string;
  VWD_BY_OTHR_STATES: string;
}

export interface ReportData extends AppianFormField {
  seatoolExist: boolean;
  seatoolSubmissionDate?: number;
}

export interface CSVData {
  "SPA ID": string;
  "Submission Date": string;
  "Seatool Record Exist": boolean;
  "Seatool Signed Date": string;
}

export interface AppianSeatoolCompareData {
  appianRecord: AppianRecord;
  PK: string;
  SK: string;
  SPA_ID: string;
  secSinceAppianSubmitted: number;
  isAppianInSubmittedStatus: boolean;
  appianSubmittedDate: number;
  seatoolExist: boolean;
}

export interface AppianReportData {
  PK: string;
  SK: string;
  isAppianInSubmittedStatus: boolean;
  SPA_ID: string;
  secSinceAppianSubmitted: number;
  appianSubmittedDate: number;
  seatoolExist: boolean;
  seatoolSubmissionDate?: string;
  match?: boolean;
  startAtTimeStamp?: string;
}

interface CcAddress {
  email: string;
  alertIfGreaterThanSeconds: number;
}

interface Recipients {
  ToAddresses: string[];
  CcAddresses: CcAddress[];
}

export interface AppianSecret {
  emailRecipients: Recipients;
  sourceEmail: string;
}
