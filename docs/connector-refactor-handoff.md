# Connector Refactor Handoff Plan

> **Note:** Environment-specific values (IDs, ARNs, endpoints) are shown as placeholders.
> Actual values for each environment are stored in AWS Secrets Manager.
> For master environment reference, see `docs/private/` (gitignored).

## Project Overview

This project refactors the seatool-compare connector service from a complex ECS-based Kafka Connect architecture to AWS Lambda's native MSK Event Source Mapping.

**Note:** MMDL comparison functionality has been completely removed from this application. The `src/services/mmdl` and `src/services/compare-mmdl` directories have been deleted, and all references removed from `serverless-compose.yml`. The application now only performs Appian-to-Seatool comparisons.

### How Compare-Appian Works

The compare-appian service monitors the Appian DynamoDB table for new records via DynamoDB Streams. **A workflow is only triggered when a record does NOT already exist in the Seatool DynamoDB table.** If the record already exists in Seatool, no comparison workflow is started.

## Current State (Dec 9, 2025)

### Status: COMPLETE AND WORKING

The connector refactor is complete. Both ESMs are enabled and processing messages successfully.

### What Was Done

1. **Code Changes Complete:**
   - `src/services/connector/serverless.yml` - Simplified from ~694 lines to ~253 lines, using Self-Managed Kafka ESM pattern
   - `src/services/connector/handlers/sinkAppianData.ts` - Updated for Lambda ESM event format (base64 decoding, batch processing)
   - `src/services/connector/handlers/sinkSeatoolData.ts` - Updated for Lambda ESM event format
   - `serverless-compose.yml` - Removed mmdl and compare-mmdl services entirely
   - **Deleted:** `connect.ts`, `testConnectors.ts`, `connect-lib.ts`, `connect-lib-v2.ts`
   - **Deleted:** `src/services/mmdl/` and `src/services/compare-mmdl/` directories (MMDL comparison removed)

2. **Deployed to Master:**
   - Lambda functions deployed successfully
   - Self-Managed Kafka Event Source Mappings created and working (State: Enabled, LastProcessing: OK)
   - Security group created for Lambda-to-MSK connectivity

3. **MSK Security Group Updated:**
   - Added ingress rule to MSK security group allowing our Lambda SG on port 9094

4. **SSM Parameters Created:**
   - `/compare/default/bootstrapBrokers` (StringList) - Bootstrap broker endpoints
   - `/compare/default/kafkaSubnets` (StringList) - VPC subnet IDs for ESM access

### Key Solution

**Self-Managed Kafka ESM** (using bootstrap broker strings) works reliably, while Amazon MSK ESM (using cluster ARN) does not work with our MSK cluster configuration.

The template uses CloudFormation Parameters with `AWS::SSM::Parameter::Value<List<String>>` to resolve SSM StringList parameters at deploy time, avoiding the limitation where Serverless Framework cannot use `Fn::Split` or properly resolve arrays from Secrets Manager.

## Environment Details

```bash
export PROJECT=compare
export REGION_A=us-east-1

# MSK Cluster
MSK_CLUSTER_ARN="<MSK_CLUSTER_ARN>"
MSK_SECURITY_GROUP="<MSK_SECURITY_GROUP>"

# Lambda Security Group (created by our deployment)
LAMBDA_SG="<LAMBDA_SECURITY_GROUP>"

# Private Subnets (same as MSK)
PRIVATE_SUBNETS="<SUBNET_1>,<SUBNET_2>,<SUBNET_3>"

# ESM UUIDs
APPIAN_ESM_UUID="<APPIAN_ESM_UUID>"
SEATOOL_ESM_UUID="<SEATOOL_ESM_UUID>"

# Topics
APPIAN_TOPIC="aws.appian.cmcs.MCP_SPA_PCKG"
SEATOOL_TOPIC="aws.ksqldb.seatool.agg.State_Plan"

# Consumer Group (CRITICAL - must maintain to avoid reprocessing)
CONSUMER_GROUP="mgmt.connect.compare-connector-master"
```

---

## Required Configuration

### Secrets Manager (via SSM Parameter Store references)

| Secret Path | Type | Description |
|-------------|------|-------------|
| `compare/{stage}/vpc` or `compare/default/vpc` | JSON | `{"id": "vpc-xxx", "privateSubnets": ["subnet-a", "subnet-b", "subnet-c"]}` |
| `compare/{stage}/mskClusterArn` or `compare/default/mskClusterArn` | String | MSK cluster ARN |

### SSM Parameter Store (StringList type)

The following parameters are stored directly in SSM Parameter Store as **StringList** type. This approach was adopted because Serverless Framework cannot properly resolve arrays from Secrets Manager for CloudFormation's `KafkaBootstrapServers` property, and `Fn::Split` is not usable in Serverless templates.

| Parameter Path | Type | Description |
|----------------|------|-------------|
| `/compare/default/bootstrapBrokers` | StringList | Comma-separated broker endpoints (e.g., `b-1.msk.com:9094,b-2.msk.com:9094,b-3.msk.com:9094`) |
| `/compare/default/kafkaSubnets` | StringList | Comma-separated subnet IDs (e.g., `subnet-aaa,subnet-bbb,subnet-ccc`) |

**Note:** These parameters must be created manually in each AWS environment (master, val, production) before deployment.

### How It Works

The serverless.yml uses CloudFormation Parameters with `AWS::SSM::Parameter::Value<List<String>>` type to resolve the SSM StringList values at deploy time:

```yaml
resources:
  Parameters:
    BootstrapBrokersParam:
      Type: "AWS::SSM::Parameter::Value<List<String>>"
      Default: "/compare/default/bootstrapBrokers"
    KafkaSubnetsParam:
      Type: "AWS::SSM::Parameter::Value<List<String>>"
      Default: "/compare/default/kafkaSubnets"
```

These are then used in the EventSourceMapping resources:
```yaml
SelfManagedEventSource:
  Endpoints:
    KafkaBootstrapServers: !Ref BootstrapBrokersParam
SourceAccessConfigurations:
  - Type: VPC_SUBNET
    URI: !Select [0, !Ref KafkaSubnetsParam]
  - Type: VPC_SUBNET
    URI: !Select [1, !Ref KafkaSubnetsParam]
  - Type: VPC_SUBNET
    URI: !Select [2, !Ref KafkaSubnetsParam]
```

---

## Deployment Instructions

### Prerequisites

Before deploying to any environment, ensure these SSM StringList parameters exist:

1. `/compare/default/bootstrapBrokers` - Bootstrap broker endpoints for the MSK cluster
2. `/compare/default/kafkaSubnets` - VPC subnet IDs for ESM connectivity

### Deploy Command

```bash
cd /path/to/seatool-compare
export PROJECT=compare && export REGION_A=us-east-1
./run deploy --stage <stage> --service connector
```

Replace `<stage>` with `master`, `val`, or `production`.

## Verification Steps

After fixing the ESM:

```bash
# 1. Check ESM status
aws lambda list-event-source-mappings --region us-east-1 \
  --query 'EventSourceMappings[?contains(FunctionArn, `compare-connector-master`)].{State:State,LastProcessing:LastProcessingResult}'

# 2. Check for Lambda invocations
aws logs tail /aws/lambda/compare-connector-master-sinkAppianData --since 10m --region us-east-1
aws logs tail /aws/lambda/compare-connector-master-sinkSeatoolData --since 10m --region us-east-1

# 3. Check DynamoDB for new records (compare counts before/after)
aws dynamodb describe-table --table-name compare-appian-master --region us-east-1 --query 'Table.ItemCount'
aws dynamodb describe-table --table-name compare-seatool-master --region us-east-1 --query 'Table.ItemCount'
```

## Files Changed (Summary)

| File | Status |
|------|--------|
| `src/services/connector/serverless.yml` | Complete - Uses Self-Managed Kafka ESM with SSM StringList parameters |
| `src/services/connector/handlers/sinkAppianData.ts` | Complete |
| `src/services/connector/handlers/sinkSeatoolData.ts` | Complete |
| `serverless-compose.yml` | Complete - Removed mmdl and compare-mmdl services |
| `src/services/connector/handlers/connect.ts` | Deleted |
| `src/services/connector/handlers/testConnectors.ts` | Deleted |
| `src/libs/connect-lib.ts` | Deleted |
| `src/libs/connect-lib-v2.ts` | Deleted |
| `src/libs/index.ts` | Updated (removed connect-lib export) |
| `src/services/mmdl/` | Deleted (entire directory) |
| `src/services/compare-mmdl/` | Deleted (entire directory) |

## Testing Plan

1. **Immediate (no wait):** Verify ESM shows "OK" or "No records to process" instead of connection error
2. **Short-term (minutes):** Check CloudWatch logs for Lambda invocations when Kafka topics have messages
3. **End-to-end:** Verify records appear in DynamoDB and trigger the Appian comparison Step Function

## Key Decisions Made

1. **SSL authentication only** - No SASL needed for MSK
2. **Private subnets** - Lambda must be in same subnets as MSK for connectivity
3. **Same consumer group ID** - Critical to avoid reprocessing: `mgmt.connect.compare-connector-master`
4. **MSK (not self-managed Kafka)** - Discovered the Kafka cluster is actually Amazon MSK

## Rollback

If needed, revert to the ECS-based connector by:
1. `git checkout` the original serverless.yml
2. Redeploy: `./run deploy --stage master --service connector`
