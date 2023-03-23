import { findIpForEcsService } from "../ecs-lib";
import { it, describe, expect } from "vitest";
import { mockClient } from "aws-sdk-client-mock";

import {
  ECSClient,
  DescribeTasksCommand,
  ListTasksCommand,
} from "@aws-sdk/client-ecs";

const ecsClientMock = mockClient(ECSClient);

describe("ecs lib tests", () => {
  it("should successfully return an ip for an ecs service", async () => {
    const listStacksCommandResponse = { taskArns: ["test"] };
    const describeTasksCommandResponse = {
      tasks: [
        {
          taskArn: "test",
          attachments: [
            {
              name: "test",
              value: "test",
              details: [{ name: "privateIPv4Address", value: "700" }],
            },
          ],
        },
      ],
    };
    ecsClientMock.on(ListTasksCommand).resolves(listStacksCommandResponse);
    ecsClientMock
      .on(DescribeTasksCommand)
      .resolves(describeTasksCommandResponse);

    const response = await findIpForEcsService("test-cluster");

    expect(response).toEqual("700");
  });

  it("should throw when task arns are undefined", async () => {
    const listStacksCommandResponse = { taskArns: undefined };
    ecsClientMock.on(ListTasksCommand).resolves(listStacksCommandResponse);

    const response = await findIpForEcsService("test-cluster");

    expect(response.message).toEqual("taskArns undefined");
  });
});
