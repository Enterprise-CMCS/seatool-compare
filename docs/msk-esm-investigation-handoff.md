# MSK Event Source Mapping Investigation Handoff

> **Note:** Environment-specific values (IDs, ARNs, endpoints) are shown as placeholders.
> Actual values for each environment are stored in AWS Secrets Manager.
> For master environment reference, see `docs/private/` (gitignored).

**Date:** December 5, 2025  
**Status:** Investigation Paused - Connection Error Unresolved

## Executive Summary

The seatool-compare connector service was being refactored from ECS-based Kafka Connect (using Nordstrom's kafka-connect-lambda) to AWS Lambda's native MSK Event Source Mapping. The Nordstrom connector repository (https://github.com/Nordstrom/kafka-connect-lambda) is **no longer available** (returns 404), necessitating this migration.

Despite configuring MSK ESM with Provisioned Mode per AWS documentation, the ESMs persistently show "Connection error". This document captures all investigation findings for continuation.

---

## Current State

### What Was Implemented

1. **serverless.yml Changes** (`src/services/connector/serverless.yml`):
   - Removed Serverless Framework `msk` events from functions
   - Added CloudFormation `AWS::Lambda::EventSourceMapping` resources with `ProvisionedPollerConfig`
   - ESMs configured with MinimumPollers: 1, MaximumPollers: 10
   - Consumer Group ID: `mgmt.connect.compare-connector-master`

2. **VPC Endpoints Created** (during troubleshooting):
   - Lambda: `<LAMBDA_VPC_ENDPOINT>`
   - STS: `<STS_VPC_ENDPOINT>`
   - Both have Private DNS enabled

3. **serverless-compose.yml Changes** (NEEDS FIX):
   - Incorrectly removed `appianTableStreamArn` parameter
   - Incorrectly removed `compare-appian` from dependsOn
   - MMDL removals were intentional

### ESM UUIDs (Current)
```
Appian ESM: <APPIAN_ESM_UUID>
Seatool ESM: <SEATOOL_ESM_UUID>
```

### The Error
```
PROBLEM: Connection error. Please check your event source connection configuration. 
If your event source lives in a VPC, try setting up a new Lambda function or EC2 
instance with the same VPC, Subnet, and Security Group settings. Connect the new 
device to the Kafka cluster and consume messages to ensure that the issue is not 
related to VPC or Endpoint configuration.
```

---

## Environment Details

```bash
# Project
export PROJECT=compare
export REGION_A=us-east-1

# MSK Cluster
MSK_CLUSTER_ARN="<MSK_CLUSTER_ARN>"
MSK_SECURITY_GROUP="<MSK_SECURITY_GROUP>"
KAFKA_VERSION="3.8.x"

# Bootstrap Brokers (TLS only - port 9094)
BOOTSTRAP_BROKERS="<BOOTSTRAP_BROKER_1>:9094,<BOOTSTRAP_BROKER_2>:9094,<BOOTSTRAP_BROKER_3>:9094"

# VPC
VPC_ID="<VPC_ID>"
PRIVATE_SUBNETS="<SUBNET_1>,<SUBNET_2>,<SUBNET_3>"

# Lambda Security Group (created by deployment)
LAMBDA_SG="<LAMBDA_SECURITY_GROUP>"

# Topics
APPIAN_TOPIC="aws.appian.cmcs.MCP_SPA_PCKG"
SEATOOL_TOPIC="aws.ksqldb.seatool.agg.State_Plan"

# Consumer Group
CONSUMER_GROUP="mgmt.connect.compare-connector-master"
```

---

## MSK Cluster Configuration Analysis

### Authentication
- `ClientAuthentication`: null (no explicit auth configured)
- Only `BootstrapBrokerStringTls` available (port 9094)
- No IAM (9098), SCRAM (9096), or plaintext (9092) brokers
- **Lambda should use "Unauthenticated TLS"** per AWS auth selection logic

### Encryption
- `EncryptionInTransit.ClientBroker`: TLS (required)
- `EncryptionInTransit.InCluster`: true

### VPC Connectivity Auth (for multi-VPC)
- SASL IAM: Disabled
- SASL SCRAM: Disabled  
- TLS: Disabled

### Custom Configuration
- Uses: `bigmac-master-config` (custom MSK configuration)
- **This may have settings affecting Lambda connectivity - needs investigation**

---

## What We Verified Works

| Component | Status | Details |
|-----------|--------|---------|
| MSK Cluster State | ✅ ACTIVE | Running Kafka 3.8.x |
| Security Groups | ✅ Configured | MSK SG has self-referencing rule allowing all traffic |
| Lambda SG in MSK Ingress | ✅ Added | Lambda SG allowed on port 9094 |
| IAM Permissions | ✅ Complete | All kafka:* and kafka-cluster:* permissions |
| VPC DNS | ✅ Enabled | DNS hostnames and support enabled |
| NACLs | ✅ Allow All | Rule 100 allows all traffic |
| Provisioned Mode | ✅ Applied | MinimumPollers: 1, MaximumPollers: 10 |
| VPC Endpoints | ✅ Created | Lambda and STS endpoints with Private DNS |
| Lambda Subnets | ✅ Same as MSK | All 3 private subnets |

---

## What Still Fails

Despite all correct configuration per AWS documentation:
- ESMs show "Connection error" persistently
- Error doesn't change with/without VPC endpoints
- Disable/re-enable ESMs doesn't help
- ESMs have been enabled for 15+ minutes (beyond typical connection time)

---

## Root Causes to Investigate

### 1. MSK Custom Configuration
The cluster uses custom config `bigmac-master-config`. This may have:
- Specific listener configurations
- ACL settings
- Other restrictions

**Action:** Review the MSK configuration in AWS Console or via CLI

### 2. Topic Existence
Verify topics actually exist on the cluster:
- `aws.appian.cmcs.MCP_SPA_PCKG`
- `aws.ksqldb.seatool.agg.State_Plan`

**Action:** Connect from EC2 and list topics

### 3. Consumer Group State
The consumer group `mgmt.connect.compare-connector-master` was used by the old Kafka Connect. May have stale state or conflicts.

**Action:** Check consumer group status or try a new consumer group ID

### 4. Hyperplane ENI Creation
Lambda creates hyperplane ENIs using MSK's subnet/SG for the poll path. These may not be creating properly.

**Action:** Check for Lambda-created ENIs in MSK subnets with MSK's SG

### 5. EC2 Connectivity Test
The error message suggests testing from EC2 in the same VPC/subnet/SG.

**Action:** 
```bash
# From EC2 instance in MSK's subnet with MSK's SG
telnet <BOOTSTRAP_BROKER_1> 9094
```

### 6. AWS Support
If all else fails, the error message suggests contacting Lambda support.

---

## AWS Documentation References

Key documentation reviewed:
1. [MSK Cluster Network Configuration](https://docs.aws.amazon.com/lambda/latest/dg/with-msk-cluster-network.html)
2. [MSK Authentication Methods](https://docs.aws.amazon.com/lambda/latest/dg/msk-cluster-auth.html)
3. [MSK Permissions](https://docs.aws.amazon.com/lambda/latest/dg/with-msk-permissions.html)
4. [Kafka Troubleshooting](https://docs.aws.amazon.com/lambda/latest/dg/with-kafka-troubleshoot.html)
5. [ProvisionedPollerConfig CloudFormation](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lambda-eventsourcemapping-provisionedpollerconfig.html)

### Key Insight from Docs
> "In provisioned mode, Lambda automatically handles the connection between the event source mapping VPC and the function VPC. So, you don't need any additional networking components to successfully invoke your function."

This should mean NAT/PrivateLink are NOT required for provisioned mode, yet connection errors persist.

---

## Immediate Actions Needed

### 1. Fix serverless-compose.yml
Restore incorrectly removed Appian references:
```yaml
connector:
  dependsOn:
    - alerts
    - compare-appian  # <-- RESTORE THIS
    - appian
    - seatool
  params:
    appianTableStreamArn: ${appian.TableStreamArn}  # <-- RESTORE THIS
    # ... rest of params
```

### 2. Update Handoff Documentation
Update `docs/connector-refactor-handoff.md` with these findings.

### 3. Decide on VPC Endpoints
The Lambda and STS VPC endpoints were created during troubleshooting. Decide:
- Keep them for future testing?
- Delete to avoid costs?

---

## Alternative Approaches

If MSK ESM continues to fail:

1. **Confluent AWS Lambda Sink Connector**
   - Actively maintained by Confluent
   - https://docs.confluent.io/kafka-connectors/aws-lambda/current/

2. **Self-hosted Kafka Connect**
   - Run Kafka Connect without the Nordstrom dependency
   - Use generic sink connector

3. **AWS Support Case**
   - Open support case with detailed error info
   - Lambda team may have insights on MSK ESM issues

---

## Files Modified in This Session

| File | Change |
|------|--------|
| `src/services/connector/serverless.yml` | Replaced msk events with CloudFormation ESM resources |
| `serverless-compose.yml` | Removed MMDL refs (intentional), removed Appian refs (ERROR - needs fix) |
| `src/libs/connect-lib.ts` | Deleted |
| `src/libs/connect-lib-v2.ts` | Deleted |
| `src/services/connector/handlers/connect.ts` | Deleted |
| `src/services/connector/handlers/testConnectors.ts` | Deleted |

---

## Commands for Quick Status Check

```bash
# Check ESM status
aws lambda list-event-source-mappings --region us-east-1 \
  --query 'EventSourceMappings[?contains(FunctionArn, `compare-connector-master`)].{State:State,LastProcessing:LastProcessingResult}'

# Check MSK cluster state
aws kafka describe-cluster --cluster-arn "<MSK_CLUSTER_ARN>" \
  --region us-east-1 --query 'ClusterInfo.State'

# Check VPC endpoints
aws ec2 describe-vpc-endpoints --vpc-endpoint-ids <LAMBDA_VPC_ENDPOINT> <STS_VPC_ENDPOINT> \
  --region us-east-1 --query 'VpcEndpoints[*].{Service:ServiceName,State:State}'

# Deploy connector service
cd /path/to/seatool-compare
export PROJECT=compare && export REGION_A=us-east-1
./run deploy --stage master --service connector
```

---

## Git Status at Pause

```
On branch master (up to date with origin)

Changes staged for commit:
- new file: docs/connector-refactor-handoff.md
- modified: serverless-compose.yml (NEEDS FIX for Appian refs)
- deleted: src/libs/connect-lib-v2.ts
- deleted: src/libs/connect-lib.ts
- modified: src/libs/index.ts
- deleted: src/services/connector/handlers/connect.ts
- modified: src/services/connector/handlers/sinkAppianData.ts
- modified: src/services/connector/handlers/sinkSeatoolData.ts
- deleted: src/services/connector/handlers/testConnectors.ts
- deleted: src/services/connector/handlers/tests/connect.test.ts
- modified: src/services/connector/serverless.yml
```

**DO NOT COMMIT** until serverless-compose.yml is fixed to restore Appian references.

---

## Contact/Resources

- **Nordstrom Connector (UNAVAILABLE):** https://github.com/Nordstrom/kafka-connect-lambda (404)
- **Confluent Alternative:** https://docs.confluent.io/kafka-connectors/aws-lambda/current/
- **AWS Lambda MSK Docs:** https://docs.aws.amazon.com/lambda/latest/dg/with-msk.html
