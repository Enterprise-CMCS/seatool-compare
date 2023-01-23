var _ = require("lodash");
import {
  ECSClient,
  DescribeTasksCommand,
  ListTasksCommand,
  waitUntilTasksRunning,
} from "@aws-sdk/client-ecs";

export async function findIpForEcsService(cluster: string | undefined) {
  const client = new ECSClient({
    // cluster, // TODO: Prior to JS to TS conversion, this cluster parameter was provided here.  TS pointed out that its not accepted by this, I do not think it's needed.  This TODO is to confirm that commenting it out did not break anything.
  });
  const listStacksCommandResponse = await client.send(
    new ListTasksCommand({
      cluster,
      desiredStatus: "RUNNING",
    })
  );
  const taskArns = listStacksCommandResponse.taskArns;
  if (typeof taskArns === "undefined") {
    throw "taskArns undefined";
  }
  if (taskArns.length == 0) {
    throw "taskArns empty";
  }
  waitUntilTasksRunning(
    { client, maxWaitTime: 600 }, // TODO: confirm 600 is a good value for max wait time.
    {
      cluster,
      tasks: [taskArns[0]], // TODO: figure out why this is only waiting for the first task.
    }
  );
  const describeTasksCommandResponse = await client.send(
    new DescribeTasksCommand({
      cluster,
      tasks: [taskArns[0]],
    })
  );
  if (describeTasksCommandResponse.tasks) {
    const task = describeTasksCommandResponse.tasks[0];
    if (task.attachments && task.attachments.length) {
      const ip = _.filter(
        task.attachments[0].details,
        (x: { name: string }) => x.name === "privateIPv4Address"
      )[0].value;
      return ip;
    }
  }
}