# Confluent AWS Lambda Sink Connector Migration Runbook

## Overview

This runbook documents the migration from the Nordstrom `kafka-connect-lambda` connector to the Confluent `kafka-connect-aws-lambda` connector. The Nordstrom connector became unavailable in November 2025, requiring this migration.

**Migration Date**: November 2025
**Affected Service**: connector
**Environments**: master (completed), val (pending), production (pending)

---

## Summary of Changes

### Code Changes Made

| File | Change Description |
|------|-------------------|
| `src/run.ts` | Fixed ES module import: `./runner` → `./runner.js` |
| `src/services/connector/serverless.yml` | Multiple changes (see detailed list below) |
| `src/services/connector/handlers/connect.ts` | Added `deleteConnector` handler function |

### Detailed serverless.yml Changes

1. **ECS Task Command** (lines ~374-386):
   - Added Confluent Hub client installation
   - Added `confluentinc/kafka-connect-aws-lambda:latest` plugin installation

2. **CONNECT_PLUGIN_PATH** (line ~410):
   - Added `/usr/share/confluent-hub-components` to include Confluent Hub installed plugins

3. **IAM Permissions** (lines ~353-359):
   - Added `lambda:GetFunction` permission to the ECS task role

4. **Connector Configurations** (lines ~638-681):
   - Changed `connector.class` from `com.nordstrom.kafka.connect.lambda.LambdaSinkConnector` to `io.confluent.connect.aws.lambda.AwsLambdaSinkConnector`
   - Replaced `aws.lambda.function.arn` with `aws.lambda.function.name` and `aws.lambda.region`
   - Added `confluent.topic.bootstrap.servers` property
   - Added `reporter.bootstrap.servers` property
   - Removed CloudFormation `!Sub` from SecretString blocks

5. **New Lambda Function** (lines ~136-144):
   - Added `deleteConnector` Lambda function for connector lifecycle management

---

## Pre-Deployment Checklist

Before deploying to any environment, verify:

- [ ] Branch contains all migration changes
- [ ] AWS credentials are configured for target environment
- [ ] Access to AWS CloudWatch Logs for monitoring
- [ ] Access to ECS console for task management
- [ ] Understand the rollback procedure

---

## Deployment Procedure

### Step 1: Deploy the Connector Service

Deploy the connector service to the target stage:

```bash
# Set environment variables
export PROJECT=compare
export REGION_A=us-east-1

# Deploy (replace <stage> with val or production)
./run deploy --stage <stage> --service connector
```

**Expected Duration**: 5-10 minutes

**Success Indicators**:
- Deployment completes without errors
- CloudFormation stack updates successfully
- New Lambda functions are created (including `deleteConnector`)

### Step 2: Force ECS Task Replacement

The ECS task must be replaced to pick up the new IAM permissions and container configuration:

```bash
# Force new deployment
aws ecs update-service \
  --cluster compare-connector-<stage>-connect \
  --service kafka-connect \
  --force-new-deployment \
  --region us-east-1
```

**Expected Duration**: 2-5 minutes for new task to start

**Monitoring**:
```bash
# Watch task status
aws ecs list-tasks --cluster compare-connector-<stage>-connect --region us-east-1

# Check task details
aws ecs describe-tasks \
  --cluster compare-connector-<stage>-connect \
  --tasks <task-arn> \
  --region us-east-1 \
  --query 'tasks[0].lastStatus'
```

### Step 3: Wait for Kafka Connect to Initialize

The new ECS task needs time to:
1. Download and install the Confluent Hub client
2. Install the Confluent Lambda connector plugin
3. Start Kafka Connect and connect to MSK

**Wait Time**: 2-3 minutes after task reaches RUNNING status

**Verify Kafka Connect is Ready**:
```bash
# Get the task IP
aws lambda invoke \
  --function-name compare-connector-<stage>-findTaskIp \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"Context": {"Execution": {"Input": {"cluster": "compare-connector-<stage>-connect"}}}}' \
  /tmp/ip.json && cat /tmp/ip.json

# Check if Connect is ready
aws lambda invoke \
  --function-name compare-connector-<stage>-checkIfConnectIsReady \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"Payload": {"ip": "<IP_FROM_ABOVE>"}}' \
  /tmp/ready.json && cat /tmp/ready.json
```

Expected output: `{"ip":"<ip>","ready":true,"success":true}`

### Step 4: Delete Old Connectors

The old connector configurations stored in Kafka Connect's internal topics must be deleted:

```bash
# Delete Seatool connector
aws lambda invoke \
  --function-name compare-connector-<stage>-deleteConnector \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"cluster": "compare-connector-<stage>-connect", "connectorName": "compare-connector-<stage>.lambda.seatoolData"}' \
  /tmp/delete-seatool.json && cat /tmp/delete-seatool.json

# Delete Appian connector
aws lambda invoke \
  --function-name compare-connector-<stage>-deleteConnector \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"cluster": "compare-connector-<stage>-connect", "connectorName": "compare-connector-<stage>.lambda.appianData"}' \
  /tmp/delete-appian.json && cat /tmp/delete-appian.json
```

Expected output: `{"success":true,"message":"Connector <name> deleted"}`

### Step 5: Create New Connectors

Create the connectors using the updated configurations from Secrets Manager:

```bash
# Get the current task IP
aws lambda invoke \
  --function-name compare-connector-<stage>-findTaskIp \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"Context": {"Execution": {"Input": {"cluster": "compare-connector-<stage>-connect"}}}}' \
  /tmp/ip.json && cat /tmp/ip.json

# Note the IP address from the output, then create connectors:

# Create Seatool connector
aws lambda invoke \
  --function-name compare-connector-<stage>-createConnector \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"Payload": {"ip": "<IP_ADDRESS>"}, "Context": {"Execution": {"Input": {"connectorConfigSecret": "compare/<stage>/compare-connector/connectorconfig/compare-connector-<stage>.lambda.seatoolData"}}}}' \  # pragma: allowlist secret
  /tmp/create-seatool.json && cat /tmp/create-seatool.json

# Create Appian connector
aws lambda invoke \
  --function-name compare-connector-<stage>-createConnector \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"Payload": {"ip": "<IP_ADDRESS>"}, "Context": {"Execution": {"Input": {"connectorConfigSecret": "compare/<stage>/compare-connector/connectorconfig/compare-connector-<stage>.lambda.appianData"}}}}' \  # pragma: allowlist secret
  /tmp/create-appian.json && cat /tmp/create-appian.json
```

Expected output: `{"success":true}`

### Step 6: Verify Connector Status

Verify both connectors are running:

```bash
# Test all connectors
aws lambda invoke \
  --function-name compare-connector-<stage>-testConnectors \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"cluster": "compare-connector-<stage>-connect"}' \
  /tmp/test.json && cat /tmp/test.json
```

**Check Kafka Connect logs for successful startup**:
```bash
aws logs tail /aws/fargate/compare-connector-<stage>-kafka-connect \
  --since 10m \
  --region us-east-1 \
  | grep -E "(ERROR|Starting AWS Lambda Sink Connector|Instantiated connector)"
```

**Success Indicators**:
- `Starting AWS Lambda Sink Connector` messages for both connectors
- `Instantiated connector ... with version 3.0.1` messages
- No ERROR messages related to connector configuration

---

## Post-Deployment Validation

### Functional Testing

1. **Verify data flow from Seatool topic**:
   - Check CloudWatch metrics for `sinkSeatoolData` Lambda invocations
   - Verify records are being written to the Seatool DynamoDB table

2. **Verify data flow from Appian topic**:
   - Check CloudWatch metrics for `sinkAppianData` Lambda invocations
   - Verify records are being written to the Appian DynamoDB table

3. **Monitor for 15-30 minutes**:
   - Watch for any connector failures in CloudWatch Logs
   - Verify the testConnectors Lambda reports healthy status

---

## Testing Scripts

Use these scripts to verify connectors are actively processing data.

### Check Seatool Connector Activity

```bash
# Replace <stage> with your environment (val, production)
STAGE=<stage>

# Check recent sinkSeatoolData Lambda invocations
echo "=== Seatool Sink Lambda Invocations (last hour) ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=compare-connector-${STAGE}-sinkSeatoolData \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum \
  --region us-east-1 \
  --output table

# View recent Lambda logs
echo ""
echo "=== Recent Seatool Sink Lambda Logs ==="
aws logs tail /aws/lambda/compare-connector-${STAGE}-sinkSeatoolData \
  --since 30m \
  --region us-east-1 \
  --format short \
  | head -50
```

### Check Appian Connector Activity

```bash
# Replace <stage> with your environment (val, production)
STAGE=<stage>

# Check recent sinkAppianData Lambda invocations
echo "=== Appian Sink Lambda Invocations (last hour) ==="
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=compare-connector-${STAGE}-sinkAppianData \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Sum \
  --region us-east-1 \
  --output table

# View recent Lambda logs
echo ""
echo "=== Recent Appian Sink Lambda Logs ==="
aws logs tail /aws/lambda/compare-connector-${STAGE}-sinkAppianData \
  --since 30m \
  --region us-east-1 \
  --format short \
  | head -50
```

### Full Connector Health Check Script

```bash
#!/bin/bash
# Connector Health Check Script
# Usage: ./check-connectors.sh <stage>

STAGE=${1:-master}
REGION=us-east-1

echo "======================================"
echo "Connector Health Check - Stage: $STAGE"
echo "======================================"
echo ""

# 1. Test connector status via Lambda
echo "=== Connector Status ==="
aws lambda invoke \
  --function-name compare-connector-${STAGE}-testConnectors \
  --region $REGION \
  --cli-binary-format raw-in-base64-out \
  --payload "{\"cluster\": \"compare-connector-${STAGE}-connect\"}" \
  /tmp/connector-status.json 2>/dev/null && cat /tmp/connector-status.json | python3 -m json.tool 2>/dev/null || cat /tmp/connector-status.json
echo ""

# 2. Check ECS task status
echo "=== ECS Task Status ==="
TASK_ARN=$(aws ecs list-tasks --cluster compare-connector-${STAGE}-connect --region $REGION --query 'taskArns[0]' --output text)
if [ "$TASK_ARN" != "None" ] && [ -n "$TASK_ARN" ]; then
  aws ecs describe-tasks \
    --cluster compare-connector-${STAGE}-connect \
    --tasks $TASK_ARN \
    --region $REGION \
    --query 'tasks[0].{status:lastStatus,health:healthStatus,startedAt:startedAt}' \
    --output table
else
  echo "No running tasks found"
fi
echo ""

# 3. Check for recent errors in Kafka Connect logs
echo "=== Recent Kafka Connect Errors (last 10 min) ==="
aws logs filter-log-events \
  --log-group-name /aws/fargate/compare-connector-${STAGE}-kafka-connect \
  --start-time $(($(date +%s) - 600))000 \
  --filter-pattern "ERROR" \
  --region $REGION \
  --query 'events[*].message' \
  --output text 2>/dev/null | head -20 || echo "No recent errors found"
echo ""

# 4. Check sink Lambda invocations
echo "=== Sink Lambda Invocations (last hour) ==="
for FUNC in sinkSeatoolData sinkAppianData; do
  INVOCATIONS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Invocations \
    --dimensions Name=FunctionName,Value=compare-connector-${STAGE}-${FUNC} \
    --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --period 3600 \
    --statistics Sum \
    --region $REGION \
    --query 'Datapoints[0].Sum' \
    --output text 2>/dev/null)
  echo "  $FUNC: ${INVOCATIONS:-0} invocations"
done
echo ""

# 5. Check sink Lambda errors
echo "=== Sink Lambda Errors (last hour) ==="
for FUNC in sinkSeatoolData sinkAppianData; do
  ERRORS=$(aws cloudwatch get-metric-statistics \
    --namespace AWS/Lambda \
    --metric-name Errors \
    --dimensions Name=FunctionName,Value=compare-connector-${STAGE}-${FUNC} \
    --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
    --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
    --period 3600 \
    --statistics Sum \
    --region $REGION \
    --query 'Datapoints[0].Sum' \
    --output text 2>/dev/null)
  echo "  $FUNC: ${ERRORS:-0} errors"
done
echo ""

echo "======================================"
echo "Health check complete"
echo "======================================"
```

### Quick One-Liner Tests

```bash
# Quick test: Are connectors running? (replace <stage>)
aws lambda invoke --function-name compare-connector-<stage>-testConnectors --region us-east-1 --cli-binary-format raw-in-base64-out --payload '{"cluster":"compare-connector-<stage>-connect"}' /tmp/t.json && cat /tmp/t.json

# Quick test: Recent Kafka Connect logs (replace <stage>)
aws logs tail /aws/fargate/compare-connector-<stage>-kafka-connect --since 5m --region us-east-1

# Quick test: Recent sink Lambda activity (replace <stage>)
aws logs tail /aws/lambda/compare-connector-<stage>-sinkSeatoolData --since 10m --region us-east-1 --format short | head -20
```

---

## Rollback Procedure

If issues are encountered, you can rollback by:

1. **Revert the code changes** to the previous commit
2. **Redeploy the connector service**:
   ```bash
   ./run deploy --stage <stage> --service connector
   ```
3. **Force ECS task replacement**:
   ```bash
   aws ecs update-service \
     --cluster compare-connector-<stage>-connect \
     --service kafka-connect \
     --force-new-deployment \
     --region us-east-1
   ```

**Note**: Rollback is NOT recommended as the Nordstrom connector is no longer available. Issues should be debugged and fixed forward.

---

## Troubleshooting

### Common Issues

#### Issue: Connector fails with "Insufficient Permissions"

**Cause**: ECS task is using cached credentials without `lambda:GetFunction` permission.

**Solution**: Force ECS task replacement:
```bash
aws ecs update-service \
  --cluster compare-connector-<stage>-connect \
  --service kafka-connect \
  --force-new-deployment \
  --region us-east-1
```

#### Issue: Connector fails with "Empty bootstrap.servers"

**Cause**: Serverless Framework variables not resolving in `!Sub` blocks.

**Solution**: Verify the SecretString in serverless.yml does NOT use `!Sub`. Use plain YAML multi-line string with Serverless variables.

#### Issue: Connector class not found

**Cause**: Confluent Hub plugin not installed or CONNECT_PLUGIN_PATH incorrect.

**Solution**:
1. Check ECS task logs for Confluent Hub installation errors
2. Verify `CONNECT_PLUGIN_PATH` includes `/usr/share/confluent-hub-components`

#### Issue: testConnectors returns null

**Cause**: Connectors may not be created yet, or Kafka Connect is not ready.

**Solution**:
1. Wait for Kafka Connect to fully initialize
2. Create connectors using the createConnector Lambda
3. Check Kafka Connect logs for errors

#### Issue: No Lambda invocations showing up

**Cause**: Connectors may be running but no new messages on the Kafka topics.

**Solution**:
1. Check connector status with `testConnectors` Lambda
2. Verify connector tasks are RUNNING (not just the connector)
3. Check if there's data flowing through the Kafka topics

---

## Environment-Specific Notes

### Val Environment

- Stage name: `val`
- Cluster: `compare-connector-val-connect`
- Service: `kafka-connect`

### Production Environment

- Stage name: `production`
- Cluster: `compare-connector-production-connect`
- Service: `kafka-connect`

---

## Change Log

| Date | Environment | Status | Notes |
|------|-------------|--------|-------|
| 2025-11-28 | master | Complete | Initial migration and testing |
| TBD | val | Pending | |
| TBD | production | Pending | |

---

## Contact

For issues or questions regarding this migration, contact the platform team.
