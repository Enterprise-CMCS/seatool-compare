import { it, beforeAll, describe, expect, vi } from "vitest";
import * as sink from "../sinkMmdlData";
import * as dynamodb from "../../../../libs/dynamodb-lib";

const mmdlSink = sink as { handler: Function };

vi.mock("../../../../libs/dynamodb-lib", () => {
  return {
    putItem: vi.fn(),
  };
});

describe("mmdl sink service tests", () => {
  beforeAll(() => {
    process.env.tableName = "mmdl-table";
  });

  it("function tests putting an item to mmdl table", async () => {
    const event = {
      key: '{"AGGREGATED_FORM_FIELDS_WAIVER_ID":16358,"STATE_CODE":"ZZ","GROUP_CODE":"HCBS","PROGRAM_TYPE_CODE":"ABP" }',
      value:
        '{"FORM_FIELDS":{"mac179_transNbr":{"FIELD_NAME":"abp_AssuranceThree","FIELD_DESCRIPTION":"The American Recovery and Reinvestment Act of 2009.","FIELD_VALUE":"false","FIELD_MAPPING_DATA_TYPE":"cb","FIELD_CHANGE_TYPE_CODE":"MOD","FIELD_MAPPING_NOTE_TEXT":null,"FIELD_PROGRAM_TYPE_CODE":"ABP","REVISION_ID":30143, "WAVIER_REVISION_CLOCK_START_DATE": 12345678}, "stMedDirSgnDt": { "FIELD_CHANGE_TYPE_CODE": "MOD","FIELD_DESCRIPTION": "State Medicaid Director: Date of Signature","FIELD_MAPPING_DATA_TYPE": "dt","FIELD_MAPPING_NOTE_TEXT": null,"FIELD_NAME": "stMedDirSgnDt","FIELD_PROGRAM_TYPE_CODE": null,"FIELD_VALUE": "01/31/2019","REVISION_APPROVED_EFFECTIVE_DATE": null,"REVISION_ID": 18429,"REVISION_REQUEST_TYPE_CODE": "new","REVISION_TITLE_DESCRIPTION": null,"REVISION_VERSION_ID": 12797,"REVISION_VERSION_MODEL_TYPE_CODE": "regular","REVISION_VERSION_WAIVER_DESCIPTION": "KS CHP MAGI Eligibility & Methods FPL Update 2019","WAIVER_REVISION_APPROVED_DATE": null,"WAIVER_REVISION_EXPIRATION_DATE": null,"WAIVER_REVISION_TITLE_TEXT": null,"WAIVER_TYPE_CODE": "WRID","WAVIER_REVISION_CLOCK_START_DATE": 1548892800000}}}',
    };

    await mmdlSink.handler(event);

    expect(dynamodb.putItem).toHaveBeenCalledWith({
      tableName: "mmdl-table",
      item: {
        PK: "ZZ-16358-ABP",
        SK: "ZZ-16358-ABP",
        TN: "FALSE",
        mac179_transNbr: {
          FIELD_NAME: "abp_AssuranceThree",
          FIELD_DESCRIPTION:
            "The American Recovery and Reinvestment Act of 2009.",
          FIELD_VALUE: "false",
          FIELD_MAPPING_DATA_TYPE: "cb",
          FIELD_CHANGE_TYPE_CODE: "MOD",
          FIELD_MAPPING_NOTE_TEXT: null,
          FIELD_PROGRAM_TYPE_CODE: "ABP",
          REVISION_ID: 30143,
          WAVIER_REVISION_CLOCK_START_DATE: 12345678,
        },
        stMedDirSgnDt: {
          FIELD_CHANGE_TYPE_CODE: "MOD",
          FIELD_DESCRIPTION: "State Medicaid Director: Date of Signature",
          FIELD_MAPPING_DATA_TYPE: "dt",
          FIELD_MAPPING_NOTE_TEXT: null,
          FIELD_NAME: "stMedDirSgnDt",
          FIELD_PROGRAM_TYPE_CODE: null,
          FIELD_VALUE: "01/31/2019",
          REVISION_APPROVED_EFFECTIVE_DATE: null,
          REVISION_ID: 18429,
          REVISION_REQUEST_TYPE_CODE: "new",
          REVISION_TITLE_DESCRIPTION: null,
          REVISION_VERSION_ID: 12797,
          REVISION_VERSION_MODEL_TYPE_CODE: "regular",
          REVISION_VERSION_WAIVER_DESCIPTION:
            "KS CHP MAGI Eligibility & Methods FPL Update 2019",
          WAIVER_REVISION_APPROVED_DATE: null,
          WAIVER_REVISION_EXPIRATION_DATE: null,
          WAIVER_REVISION_TITLE_TEXT: null,
          WAIVER_TYPE_CODE: "WRID",
          WAVIER_REVISION_CLOCK_START_DATE: 1548892800000,
        },
        status: 99,
        statuses: undefined,
        clockStartDate: 12345678,
        clockStarted: true,
        programType: "ABP",
        mmdlSigned: true,
        mmdlSigDate: "01/31/2019",
        isStatusSubmitted: false,
      },
    });
  });
});
