import * as connect from "../../../libs/connect-lib";
import { sendMetricData } from "../../../libs/cloudwatch-lib";
import {
  SecretsManagerClient,
  ListSecretsCommand,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

// test the connector status
async function myHandler() {
  const cluster = process.env.cluster;
  const service = process.env.service;
  const RUNNING = "RUNNING";

  const client = new SecretsManagerClient({});
  const listSecretsCommandResponse = await client.send(
    new ListSecretsCommand({
      Filters: [
        {
          Key: "name",
          Values: [process.env.connectorConfigPrefix],
        },
      ],
    })
  );
  var connectors = [];
  for (var i = 0; i < listSecretsCommandResponse.SecretList.length; i++) {
    const getSecretValueCommandResponse = await client.send(
      new GetSecretValueCommand({
        SecretId: listSecretsCommandResponse.SecretList[i].Name,
        VersionStage: "AWSCURRENT",
      })
    );
    connectors.push(JSON.parse(getSecretValueCommandResponse.SecretString));
  }

  try {
    const results = await connect.testConnectors(cluster, connectors);
    console.log("Kafka connector status results", JSON.stringify(results));

    // send a metric for each connector status - 0 = ✅ or 1 = ⛔️
    await Promise.all(
      results.map(({ name, connector }) => {
        sendMetricData({
          Namespace: process.env.namespace,
          MetricData: [
            {
              MetricName: name,
              Value: connector.state === RUNNING ? 0 : 1,
            },
          ],
        });
      })
    );

    // send a metric for connectors tasks status.
    // 0 = all tasks for a connector ✅ or 1 = some taks for a connector ⛔️
    await Promise.all(
      results.map(({ name, tasks }) => {
        const tasksRunning = tasks.every((task) => task.state === RUNNING);
        sendMetricData({
          Namespace: process.env.namespace,
          MetricData: [
            {
              MetricName: `${name}_task`,
              Value: tasksRunning ? 0 : 1,
            },
          ],
        });
      })
    );

    // get any failing results
    const failingResults = results.filter(({ tasks, connector }) => {
      return (
        connector.state !== RUNNING ||
        tasks.some((task) => task.state !== RUNNING)
      );
    });

    // if any of the results are ⛔️ restart only the failing connectors/tasks
    if (failingResults.length > 0) {
      const connectorsToRestart = connectors.filter((connector) =>
        failingResults.some((result) => result.name === connector.name)
      );

      await connect.restartConnectors(cluster, connectorsToRestart);
    }
  } catch (e) {
    console.log("Error caught while testing connectors", JSON.stringify(e));

    // for unknown errors send a metric value for each connector indicating failure
    await Promise.all(
      connectors.map((connector) => {
        sendMetricData({
          Namespace: process.env.namespace,
          MetricData: [
            {
              MetricName: connector.name,
              Value: 1,
            },
          ],
        });
      })
    );
  }
}

exports.handler = myHandler;
