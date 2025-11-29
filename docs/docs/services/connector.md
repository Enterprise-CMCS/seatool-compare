---
layout: default
title: connector
parent: Services
nav_order: 2
---

# connector

{: .no_toc }

#### Summary

This service runs an ECS Fargate Kafka Connect cluster to stream data from the relevant Seatool, Appian, and MMDL topics into sink Lambda functions. The connector service uses the **Confluent AWS Lambda Sink Connector** to invoke Lambda functions for each message consumed from Kafka topics.

### Kafka Connect Architecture

The connector service runs a single ECS Fargate task with Kafka Connect in distributed mode. On startup, the container:
1. Downloads and installs the Confluent Hub client
2. Installs the `confluentinc/kafka-connect-aws-lambda` connector plugin
3. Starts Kafka Connect with the configured worker properties

### Connector Plugin

**Plugin**: [Confluent AWS Lambda Sink Connector](https://www.confluent.io/hub/confluentinc/kafka-connect-aws-lambda)
- **Connector Class**: `io.confluent.connect.aws.lambda.AwsLambdaSinkConnector`
- **Version**: Latest (dynamically installed from Confluent Hub)

> **Note**: This connector replaced the previously used Nordstrom kafka-connect-lambda connector which became unavailable in November 2025.

### Topics

The service configures sink connectors for the following topics:

| Topic | Lambda Function | DynamoDB Table |
|-------|-----------------|----------------|
| `aws.ksqldb.seatool.agg.State_Plan` | sinkSeatoolData | seatool |
| `aws.appian.cmcs.MCP_SPA_PCKG` | sinkAppianData | appian |

Records are upserted (overwritten) as they represent the most current representation of the data.

### Connector Configuration

Each connector is configured via AWS Secrets Manager. The configuration includes:

```json
{
  "name": "<connector-name>",
  "config": {
    "tasks.max": "1",
    "connector.class": "io.confluent.connect.aws.lambda.AwsLambdaSinkConnector",
    "topics": "<kafka-topic>",
    "key.converter": "org.apache.kafka.connect.storage.StringConverter",
    "value.converter": "org.apache.kafka.connect.storage.StringConverter",
    "aws.lambda.function.name": "<lambda-function-name>",
    "aws.lambda.region": "<aws-region>",
    "aws.lambda.invocation.type": "sync",
    "behavior.on.error": "fail",
    "confluent.topic.bootstrap.servers": "<broker-string>",
    "reporter.bootstrap.servers": "<broker-string>"
  }
}
```

### Alarms

Several metrics and alarms monitor this connector service:

- **ECS Failure alarm** - Monitors the general health of the ECS container. If the instance reports a status of 'STOPPED' it will be reported to the alerts SNS topic.
- **Connector Health** - Checked every minute by the testConnectors Lambda
- **Connector Task Health** - Checked every minute by the testConnectors Lambda
- **Seatool/Appian data sink metric alarm** - Triggered if the sink function ever fails

### Functions

There are several functions that facilitate this service:

| Function | Description |
|----------|-------------|
| `findTaskIp` | Finds the private IP of the running ECS task for Kafka Connect REST API access |
| `checkIfConnectIsReady` | Verifies Kafka Connect is ready to accept connector configurations |
| `createConnector` | Creates a connector from configuration stored in Secrets Manager |
| `deleteConnector` | Deletes a connector from the Kafka Connect cluster |
| `testConnectors` | Tests connector and task health; runs every minute on a cron schedule |
| `sinkSeatoolData` | Receives events from the Seatool topic and updates the DynamoDB table |
| `sinkAppianData` | Receives events from the Appian topic and updates the DynamoDB table |

### IAM Permissions

The ECS task role requires the following Lambda permissions:

```yaml
- Effect: Allow
  Action:
    - lambda:InvokeFunction
    - lambda:GetFunction
  Resource:
    - <sinkAppianData Lambda ARN>
    - <sinkSeatoolData Lambda ARN>
```

> **Note**: The `lambda:GetFunction` permission is required by the Confluent connector to validate that the target Lambda function exists during connector creation.

### Environment Variables

The Kafka Connect worker is configured with the following key environment variables:

| Variable | Description |
|----------|-------------|
| `CONNECT_BOOTSTRAP_SERVERS` | MSK broker connection string |
| `CONNECT_PLUGIN_PATH` | `/usr/share/java,/usr/local/share/kafka/plugins,/usr/share/confluent-hub-components` |
| `CONNECT_GROUP_ID` | Kafka Connect cluster group ID |
| `CONNECT_CONFIG_STORAGE_TOPIC` | Topic for storing connector configs |
| `CONNECT_OFFSET_STORAGE_TOPIC` | Topic for storing connector offsets |
| `CONNECT_STATUS_STORAGE_TOPIC` | Topic for storing connector status |

### Troubleshooting

#### Checking Connector Status

Use the testConnectors Lambda to check connector health:

```bash
aws lambda invoke --function-name <project>-connector-<stage>-testConnectors \
  --payload '{"cluster": "<project>-connector-<stage>-connect"}' \
  /tmp/result.json && cat /tmp/result.json
```

#### Viewing Kafka Connect Logs

```bash
aws logs tail /aws/fargate/<project>-connector-<stage>-kafka-connect --since 10m
```

#### Restarting a Connector

1. Delete the connector:
```bash
aws lambda invoke --function-name <project>-connector-<stage>-deleteConnector \
  --payload '{"cluster": "<cluster>", "connectorName": "<connector-name>"}' \
  /tmp/result.json
```

2. Recreate from Secrets Manager config:
```bash
# First get the task IP
aws lambda invoke --function-name <project>-connector-<stage>-findTaskIp \
  --payload '{"Context": {"Execution": {"Input": {"cluster": "<cluster>"}}}}' \
  /tmp/ip.json

# Then create the connector
aws lambda invoke --function-name <project>-connector-<stage>-createConnector \
  --payload '{"Payload": {"ip": "<ip>"}, "Context": {"Execution": {"Input": {"connectorConfigSecret": "<secret-path>"}}}}' \
  /tmp/result.json
```

#### Force ECS Task Replacement

If the ECS task needs fresh credentials after IAM changes:

```bash
aws ecs update-service --cluster <cluster-name> --service kafka-connect --force-new-deployment
```
