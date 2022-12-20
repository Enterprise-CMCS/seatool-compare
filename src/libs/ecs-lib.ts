import * as _ from "lodash";
import {
  ECSClient,
  DescribeTasksCommand,
  ListTasksCommand,
  waitUntilTasksRunning,
} from "@aws-sdk/client-ecs";

export async function findIpForEcsService(cluster: string) {
  const client = new ECSClient({});
  const listStacksCommandResponse = await client.send(
    new ListTasksCommand({
      cluster,
      desiredStatus: "RUNNING",
    })
  );
  const taskArns = listStacksCommandResponse.taskArns;
  if (!taskArns || taskArns.length == 0) {
    console.log("NEED ERROR HANDLING");
    return;
  } else {
    waitUntilTasksRunning(
      {
        client,
        maxWaitTime: 2000, // ask Mike about this
        // cluster: cluster, // ask Mike about this
      },
      { tasks: taskArns }
    );

    const describeTasksCommandResponse = await client.send(
      new DescribeTasksCommand({
        cluster: cluster,
        tasks: [taskArns[0]],
      })
    );
    const task = describeTasksCommandResponse?.tasks?.[0];
    const ip = _.filter(
      task?.attachments?.[0].details,
      (x) => x.name === "privateIPv4Address"
    )[0].value;
    return ip;
  }
}
