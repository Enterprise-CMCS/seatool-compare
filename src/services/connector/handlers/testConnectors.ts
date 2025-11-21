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
  const RUNNING = "RUNNING";
  const connectors: {
    name: string;
    config: Record<string, any>;
  }[] = [];

  if (!process.env.connectorConfigPrefix) {
    throw "Need process.env.connectorConfigPrefix to be defined.";
  }
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
  if (listSecretsCommandResponse.SecretList) {
    for (var i = 0; i < listSecretsCommandResponse.SecretList.length; i++) {
      const getSecretValueCommandResponse = await client.send(
        new GetSecretValueCommand({
          SecretId: listSecretsCommandResponse.SecretList[i].Name,
          VersionStage: "AWSCURRENT",
        })
      );
      if (getSecretValueCommandResponse.SecretString)
        connectors.push(JSON.parse(getSecretValueCommandResponse.SecretString));
    }
  }

  try {
    const results: {
      name: string;
      tasks: { state: string }[];
      connector: { state: string };
    }[] = (await connect.testConnectors(cluster, connectors)) ?? [];
    console.log("Kafka connector status results", JSON.stringify(results));

    // send a metric for each connector status - 0 = ✅ or 1 = ⛔️
    if (results)
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
    if (results) {
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
          tasks.some((task: { state: string }) => task.state !== RUNNING)
        );
      });

      // if any of the results are ⛔️ restart only the failing connectors/tasks
      if (connectors && failingResults.length > 0) {
        const connectorsToRestart = connectors.filter((connector) =>
          failingResults.some((result) => result.name === connector.name)
        );

        await connect.restartConnectors(cluster, connectorsToRestart);
      }
    }
  } catch (e) {
    console.log("Error caught while testing connectors", JSON.stringify(e));

    // for unknown errors send a metric value for each connector indicating failure
    if (connectors) {
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
}

exports.handler = myHandler;
