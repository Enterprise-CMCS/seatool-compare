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
import * as _ from "lodash";
import axios, { AxiosError } from "axios";

/**
 * Make HTTP request with retry logic using axios
 */
export async function connectRestApiWithRetry(params: {
  hostname: string;
  path: string;
  method: string;
  port?: number;
  headers?: any;
  body?: object;
  maxRetries?: number;
  retryDelay?: number;
}): Promise<number | undefined> {
  const maxRetries = params.maxRetries || 3;
  const retryDelay = params.retryDelay || 5000;
  
  const url = `http://${params.hostname}:${params.port || 8083}${params.path || ""}`;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries} - ${params.method} ${url}`);
      
      const response = await axios({
        method: params.method || "GET",
        url,
        headers: params.headers || { "Content-Type": "application/json" },
        data: params.body,
        timeout: 30000, // 30 second timeout
        validateStatus: () => true, // Don't throw on any status code
      });
      
      console.log(`STATUS: ${response.status}`);
      console.log("Data: ", JSON.stringify(response.data));
      
      return response.status;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error(`Request failed (attempt ${attempt}/${maxRetries}):`, axiosError.message);
      
      if (attempt < maxRetries) {
        console.log(`Retrying in ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        console.error("Max retries reached, giving up");
        throw error;
      }
    }
  }
}

export async function restartConnectors(
  cluster: string | undefined,
  connectors: string | any[]
) {
  const workerIp = await ecs.findIpForEcsService(cluster);

  console.log(`Restarting ${connectors.length} connectors...`);
  for (let i = 0; i < connectors.length; i++) {
    const connector = connectors[i];
    console.log(`Restarting connector: ${JSON.stringify(connector, null, 2)}`);
    
    await connectRestApiWithRetry({
      hostname: workerIp,
      path: `/connectors/${connectors[i].name}/restart?includeTasks=true&onlyFailed=true`,
      port: 8083,
      method: "POST",
    });
  }
  console.log("Completed restarting connectors");
}

export async function createConnector(
  workerIp: string,
  connectorConfigSecretPath: string
) {
  console.log("Getting connector config from Secrets Manager:", connectorConfigSecretPath);
  const client = new SecretsManagerClient({});
  const response = await client.send(
    new GetSecretValueCommand({
      SecretId: connectorConfigSecretPath,
      VersionStage: "AWSCURRENT",
    })
  );

  if (!response.SecretString) {
    throw new Error("No connector config found in secret");
  }

  const connectorConfig = JSON.parse(response.SecretString);
  console.log("Creating connector with config:", JSON.stringify(connectorConfig, null, 2));

  try {
    const statusCode = await connectRestApiWithRetry({
      hostname: workerIp,
      path: `/connectors`,
      port: 8083,
      method: "POST",
      body: connectorConfig,
    });

    return {
      success: statusCode === 200 || statusCode === 201,
      statusCode,
      connectorName: connectorConfig.name,
    };
  } catch (error) {
    console.error("Failed to create connector:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function checkIfConnectIsReady(ip: string): Promise<boolean> {
  try {
    console.log(`Checking if Kafka Connect is ready at ${ip}:8083`);
    
    const response = await axios.get(`http://${ip}:8083/`, {
      timeout: 5000,
      validateStatus: () => true,
    });
    
    const isReady = response.status === 200;
    console.log(`Kafka Connect ready status: ${isReady} (status: ${response.status})`);
    
    return isReady;
  } catch (error) {
    console.error("Error checking Kafka Connect readiness:", error);
    return false;
  }
}

export async function findTaskIp(cluster: string | undefined): Promise<string> {
  if (!cluster) {
    throw new Error("Cluster parameter is required");
  }

  console.log(`Finding task IP for cluster: ${cluster}`);
  const client = new ECSClient({});
  
  const listResponse = await client.send(
    new ListTasksCommand({
      cluster,
      desiredStatus: "RUNNING",
    })
  );

  if (!listResponse.taskArns || listResponse.taskArns.length === 0) {
    throw new Error(`No running tasks found in cluster ${cluster}`);
  }

  console.log(`Found ${listResponse.taskArns.length} running tasks`);
  
  const describeResponse = await client.send(
    new DescribeTasksCommand({
      cluster,
      tasks: listResponse.taskArns,
    })
  );

  if (!describeResponse.tasks || describeResponse.tasks.length === 0) {
    throw new Error("No task details found");
  }

  const task = describeResponse.tasks[0];
  
  // Find the network interface with a private IP
  const attachment = task.attachments?.find(a => a.type === "ElasticNetworkInterface");
  const privateIpDetail = attachment?.details?.find(d => d.name === "privateIPv4Address");
  
  if (!privateIpDetail?.value) {
    // Fallback to container instance IP if available
    const container = task.containers?.[0];
    const networkInterface = container?.networkInterfaces?.[0];
    const ip = networkInterface?.privateIpv4Address;
    
    if (!ip) {
      throw new Error("No IP address found for task");
    }
    
    console.log(`Found task IP from container: ${ip}`);
    return ip;
  }
  
  console.log(`Found task IP from attachment: ${privateIpDetail.value}`);
  return privateIpDetail.value;
}

export async function testConnectors(
  cluster: string | undefined,
  connectorConfigs: any[]
): Promise<{ name: string; tasks: any[]; connector: any }[] | undefined> {
  if (!cluster) {
    console.log("No cluster specified, skipping connector test");
    return undefined;
  }

  try {
    const workerIp = await findTaskIp(cluster);
    console.log(`Testing connectors at ${workerIp}:8083`);
    
    const results = [];
    
    for (const config of connectorConfigs) {
      try {
        console.log(`Testing connector: ${config.name}`);
        
        // Get connector status
        const statusResponse = await axios.get(
          `http://${workerIp}:8083/connectors/${config.name}/status`,
          {
            timeout: 10000,
            validateStatus: () => true,
          }
        );
        
        if (statusResponse.status === 404) {
          console.log(`Connector ${config.name} not found`);
          results.push({
            name: config.name,
            connector: { state: "NOT_FOUND" },
            tasks: [],
          });
        } else if (statusResponse.status === 200) {
          const status = statusResponse.data;
          results.push({
            name: config.name,
            connector: status.connector || { state: "UNKNOWN" },
            tasks: status.tasks || [],
          });
        } else {
          console.error(`Unexpected status ${statusResponse.status} for connector ${config.name}`);
          results.push({
            name: config.name,
            connector: { state: "ERROR" },
            tasks: [],
          });
        }
      } catch (error) {
        console.error(`Error testing connector ${config.name}:`, error);
        results.push({
          name: config.name,
          connector: { state: "ERROR" },
          tasks: [],
        });
      }
    }
    
    return results;
  } catch (error) {
    console.error("Error testing connectors:", error);
    throw error;
  }
}