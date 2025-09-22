import * as ecs from "./ecs-lib";
import {
  ECSClient,
  DescribeTasksCommand,
  ListTasksCommand,
} from "@aws-sdk/client-ecs";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import * as http from "http";
import * as _ from "lodash";
import axios from "axios";

const resolver = (
  res: http.IncomingMessage,
  resolve: (statusCode: number | undefined) => void
) => {
  console.log("Finished");
  // Safely destroy socket if it exists
  if (res.socket && !res.socket.destroyed) {
    res.socket.destroy();
  }
  resolve(res.statusCode);
};

export async function connectRestApiWithRetry(params: {
  hostname: string;
  path: string;
  method: string;
  port?: number;
  headers?: any;
  body?: object;
}) {
  return new Promise((resolve) => {
    function retry(e: string) {
      console.log("Got error: " + e);
      setTimeout(async function () {
        return await connectRestApiWithRetry(params);
      }, 5000);
    }

    const options: http.RequestOptions = {
      hostname: params.hostname,
      port: params.port || 8083,
      path: params.path || "",
      method: params.method || "GET",
      headers: params.headers || {
        "Content-Type": "application/json",
      },
    };
    const req = http.request(options, (res) => {
      console.log(`STATUS: ${res.statusCode}`);
      res
        .on("data", (d: string) => {
          console.log("Data: ", d.toString());
        })
        .on("error", (error) => {
          console.error("Response Error: ", error.toString());
          retry(error.toString());
        })
        .on("end", () => {
          resolver(res, resolve);
        });
    });
    
    req.on("error", (error) => {
      console.error("Request Error: ", error.toString());
      retry(error.toString());
    });
    
    if (params.body) {
      req.write(JSON.stringify(params.body));
    }
    req.end();
  });
}

export async function restartConnectors(
  cluster: string | undefined,
  connectors: string | any[]
) {
  const workerIp = await ecs.findIpForEcsService(cluster);
  for (let i = 0; i < connectors.length; i++) {
    let connector = _.omit(connectors[i], "config");
    connector.tasks = connectors[i].config["tasks.max"];
    console.log(`Restarting connector: ${JSON.stringify(connector, null, 2)}`);
    //This won't account for multiple tasks with multiple interfaces
    await connectRestApiWithRetry({
      hostname: workerIp,
      path: `/connectors/${connectors[i].name}/restart?includeTasks=true?onlyFailed=true`,
      method: "POST",
    });
  }
}

export async function deleteConnector(ip: string, name: string) {
  return new Promise((resolve) => {
    function retry(e: string) {
      console.log("Got error: " + e);
      setTimeout(async function () {
        return await deleteConnector(ip, name);
      }, 5000);
    }

    const options = {
      hostname: ip,
      port: 8083,
      path: `/connectors/${name}`,
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    };

    const req = http.request(options, (res) => {
      console.log(`statusCode: ${res.statusCode}`);
      res
        .on("data", (d: string) => {
          console.log(d.toString());
          if (JSON.parse(d).message != `Connector ${name} not found`) {
            return retry(d.toString());
          }
        })
        .on("error", (error) => {
          console.error(error);
          return retry(error.toString());
        })
        .on("end", () => {
          resolver(res, resolve);
        });
    });
    req.on("error", (error) => {
      console.error("Request error:", error);
      retry(error.toString());
    });
    req.write(JSON.stringify({}));
    req.end();
  });
}

export async function deleteConnectors(
  cluster: string | undefined,
  connectors: string | any[]
) {
  const workerIp = await ecs.findIpForEcsService(cluster);
  for (let i = 0; i < connectors.length; i++) {
    console.log(`Deleting connector: ${connectors[i]}`);
    //This won't account for multiple tasks with multiple interfaces
    await deleteConnector(workerIp, connectors[i]);
  }
}

export async function testConnector(ip: string, config: { name: string }) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: ip,
      port: 8083,
      path: `/connectors/${config.name}/status`,
      headers: {
        "Content-Type": "application/json",
      },
    };

    console.log("Test Kafka-connect service", options);
    const req = http.request(options, (res) => {
      console.log(`statusCode: ${res.statusCode}`);
      res
        .on("data", (d: string) => {
          console.log(d.toString());
          resolve(JSON.parse(d));
        })
        .on("error", (error) => {
          console.error(error);
          reject(error);
        })
        .on("end", () => {
          // Don't call resolver here as it tries to destroy socket
          console.log("Finished");
          // Response already handled in 'data' event
        });
    });

    req.on("error", (error) => {
      console.error("Request error:", error);
      reject(error);
    });

    req.write(JSON.stringify({}));
    req.end();
  });
}

export async function testConnectors(
  cluster: string | undefined,
  connectors: {
    name: string;
    config: {
      "tasks.max": number;
      "connector.class": string;
      topics: string;
      "key.converter": string;
      "value.converter": string;
      "aws.region": string;
      "aws.lambda.function.arn": string;
      "aws.lambda.batch.enabled": boolean;
      "aws.credentials.provider.class": string;
    };
  }[]
): Promise<any> {
  const workerIp = await ecs.findIpForEcsService(cluster);
  if (connectors)
    return await Promise.all(
      connectors.map((connector) => {
        console.log(`Testing connector: ${connector.name}`);
        return testConnector(workerIp, connector);
      })
    );
  return;
}

export async function findTaskIp(cluster: string) {
  const client = new ECSClient({});
  const { taskArns } = await client.send(
    new ListTasksCommand({
      cluster,
      desiredStatus: "RUNNING",
    })
  );
  if (taskArns === undefined) {
    throw "taskArns undefined";
  }
  if (taskArns.length === 0) {
    throw `No task found for cluster ${cluster}`;
  }
  const tasks = (
    await client.send(
      new DescribeTasksCommand({
        cluster,
        tasks: [taskArns[0]],
      })
    )
  ).tasks;
  if (tasks && tasks.length) {
    const task = tasks[0];
    if (task.attachments) {
      const ip = _.filter(
        task.attachments[0].details,
        (x) => x.name === "privateIPv4Address"
      )[0].value;
      console.log(ip);
      return ip;
    }
  }
  return;
}

export async function checkIfConnectIsReady(ip: string) {
  let ready = false;
  try {
    const res = await axios.get(`http://${ip}:8083/`);
    if (res.status && res.status == 200) {
      console.log("Kafka Connect service is ready");
      ready = true;
    }
  } catch (error) {
    console.error(error);
    console.log(
      `Kafka Connect service is not ready; it responded with ${error}`
    );
  } finally {
    return ready;
  }
}

export async function createConnector(
  ip: string,
  connectorConfigSecret: string
) {
  const config = await fetchConnectorConfigFromSecretsManager(
    connectorConfigSecret
  );
  const results = {
    success: false,
  };
  try {
    console.log(`POSTing connector:  ${config.name}`);
    const res = await axios.put(
      `http://${ip}:8083/connectors/${config.name}/config`,
      config.config
    );
    console.log(res);
    console.log("Connector was successfully created.");
    results.success = true;
  } catch (error) {
    console.error(error);
    console.log("Connector was NOT successfully created.");
  } finally {
    return results;
  }
}

async function fetchConnectorConfigFromSecretsManager(
  connectorConfigSecret: string
) {
  console.log(
    `Fetching connector config from Secrets Manager at:  ${connectorConfigSecret}`
  );
  const client = new SecretsManagerClient({});
  const command = new GetSecretValueCommand({
    SecretId: connectorConfigSecret,
    VersionStage: "AWSCURRENT",
  });
  const response = await client.send(command);
  return JSON.parse(response.SecretString ?? "");
}
