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
        '{"FORM_FIELDS":{"mac179_transNbr":{"FIELD_NAME":"abp_AssuranceThree","FIELD_DESCRIPTION":"The American Recovery and Reinvestment Act of 2009.","FIELD_VALUE":"false","FIELD_MAPPING_DATA_TYPE":"cb","FIELD_CHANGE_TYPE_CODE":"MOD","FIELD_MAPPING_NOTE_TEXT":null,"FIELD_PROGRAM_TYPE_CODE":"ABP","REVISION_ID":30143}}}',
    };

    await mmdlSink.handler(event);

    expect(dynamodb.putItem).toHaveBeenCalledWith({
      tableName: "mmdl-table",
      item: {
        id: "ZZ-16358-ABP",
        mac179_transNbr: {
          FIELD_CHANGE_TYPE_CODE: "MOD",
          FIELD_DESCRIPTION:
            "The American Recovery and Reinvestment Act of 2009.",
          FIELD_MAPPING_DATA_TYPE: "cb",
          FIELD_MAPPING_NOTE_TEXT: null,
          FIELD_NAME: "abp_AssuranceThree",
          FIELD_PROGRAM_TYPE_CODE: "ABP",
          FIELD_VALUE: "false",
          REVISION_ID: 30143,
        },
        statuses: undefined,
        TN: "FALSE",
      },
    });
  });
});
