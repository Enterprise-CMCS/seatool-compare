import * as ecs from "./ecs-lib.js";
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

const resolver = (req, resolve) => {
  console.log("Finished");
  req.socket.destroy();
  resolve(req.statusCode);
};

export async function connectRestApiWithRetry(params: {
  hostname: string;
  path: string;
  method: string;
  port?: number;
  headers?: any;
  body?: any;
}) {
  return new Promise((resolve, _reject) => {
    function retry(e: string) {
      console.log("Got error: " + e);
      setTimeout(async function () {
        return await connectRestApiWithRetry(params);
      }, 5000);
    }

    const options = {
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
        .on("data", (data) => {
          console.log("Data: ", data.toString());
        })
        .on("error", (error) => {
          console.error("Error: ", error.toString());
          retry(`${error}`);
        })
        .on("end", () => {
          resolver(req, resolve);
        });
    });

    if (params.body) {
      req.write(JSON.stringify(params.body));
    }
    req.end();
  });
}

export async function restartConnectors(cluster: string, connectors: any[]) {
  const workerIp = await ecs.findIpForEcsService(cluster);
  for (let i = 0; i < connectors.length; i++) {
    let connector = _.omit(connectors[i], "config");
    connector.tasks = connectors[i].config["tasks.max"];
    console.log(`Restarting connector: ${JSON.stringify(connector, null, 2)}`);
    //This won't account for multiple tasks with multiple interfaces
    await connectRestApiWithRetry({
      hostname: workerIp!,
      path: `/connectors/${connectors[i].name}/restart?includeTasks=true?onlyFailed=true`,
      method: "POST",
    });
  }
}

export async function deleteConnector(ip: string, name: string) {
  return new Promise((resolve, _reject) => {
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
        .on("data", (d) => {
          console.log(d.toString("utf-8"));
          if (JSON.parse(d).message != `Connector ${name} not found`) {
            return retry(d);
          }
        })
        .on("error", (error) => {
          console.error(error);
          return retry(`${error}`);
        })
        .on("end", () => {
          resolver(req, resolve);
        });
    });
    req.write(JSON.stringify({}));
    req.end();
  });
}

export async function deleteConnectors(cluster: string, connectors: any[]) {
  const workerIp = await ecs.findIpForEcsService(cluster);
  for (let i = 0; i < connectors.length; i++) {
    console.log(`Deleting connector: ${connectors[i]}`);
    //This won't account for multiple tasks with multiple interfaces
    await deleteConnector(workerIp!, connectors[i]);
  }
}

export async function testConnector(ip: string, config: any) {
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
        .on("data", (d) => {
          console.log(d.toString("utf-8"));
          resolve(JSON.parse(d));
        })
        .on("error", (error) => {
          console.error(error);
          reject(error);
        })
        .on("end", () => {
          resolver(req, resolve);
        });
    });

    req.write(JSON.stringify({}));
    req.end();
  });
}

export async function testConnectors(cluster: string, connectors: any[]) {
  const workerIp = await ecs.findIpForEcsService(cluster);
  return await Promise.all(
    connectors.map((connector) => {
      console.log(`Testing connector: ${connector.name}`);
      return testConnector(workerIp!, connector);
    })
  );
}

export async function findTaskIp(cluster: string) {
  const client = new ECSClient({});
  const { taskArns } = await client.send(
    new ListTasksCommand({
      cluster: cluster,
      desiredStatus: "RUNNING",
    })
  );
  if (!taskArns || taskArns.length === 0) {
    throw `No task found for cluster ${cluster}`;
  } else {
    const tasks = (
      await client.send(
        new DescribeTasksCommand({
          cluster: cluster,
          tasks: [taskArns[0]],
        })
      )
    ).tasks;
    const task = tasks?.[0];
    const ip = _.filter(
      task?.attachments?.[0].details,
      (x) => x.name === "privateIPv4Address"
    )[0].value;
    console.log(ip);
    return ip;
  }
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

  return JSON.parse(response?.SecretString ?? "");
}
