# Kafka to Lambda Event Source Mapping Patterns

**Date:** December 5, 2025  
**Status:** Implemented and Working  
**Related Files:** `src/services/connector/serverless.yml`, `serverless-compose.yml`

## Executive Summary

This document captures critical findings about connecting AWS Lambda functions to Apache Kafka (MSK) clusters using Event Source Mappings (ESM). These findings are essential for any future development involving Kafka-Lambda integrations in this codebase.

**Key Discovery:** There are two types of Kafka ESM, and they behave very differently:
1. **Amazon MSK ESM** (using cluster ARN) - **Does NOT work** with our MSK cluster
2. **Self-Managed Kafka ESM** (using bootstrap broker strings) - **Works perfectly**

---

## Background

### The Problem

The seatool-compare connector service was being refactored from ECS-based Kafka Connect (using the now-unavailable Nordstrom kafka-connect-lambda connector) to AWS Lambda's native MSK Event Source Mapping.

Despite correct VPC, security group, and IAM configurations, the Amazon MSK ESM approach persistently showed "Connection error" status.

### The Investigation

We discovered that:
- **1,220 ESMs** had been created for the master-msk cluster over time
- **ZERO** of them ever successfully connected using the Amazon MSK ESM type
- However, **64 ESMs in the onemac-dev account** were working perfectly - using **Self-Managed Kafka ESM**

---

## The Two ESM Types (Event Source Mapping)

### 1. Amazon MSK ESM (Does NOT Work)

Uses the MSK cluster ARN as the event source:

```yaml
# THIS APPROACH DOES NOT WORK WITH OUR MSK CLUSTER
EventSourceArn: arn:aws:kafka:us-east-1:ACCOUNT:cluster/master-msk/UUID
AmazonManagedKafkaEventSourceConfig:
  ConsumerGroupId: my-consumer-group
```

**How it works internally:**
- Lambda creates "hyperplane ENIs" in the MSK cluster's subnets using the MSK cluster's security group
- This is an "inside the VPC" connection approach

**Why it fails:**
- The hyperplane ENI creation appears to fail silently for our MSK cluster configuration
- The MSK cluster has `ClientAuthentication: null` (unauthenticated TLS on port 9094)
- No detailed error information is provided beyond "Connection error"

### 2. Self-Managed Kafka ESM (WORKS)

Uses bootstrap broker strings with explicit VPC configuration:

```yaml
# THIS APPROACH WORKS
SelfManagedEventSource:
  Endpoints:
    KafkaBootstrapServers:
      - b-1.master-msk.example.com:9094
      - b-2.master-msk.example.com:9094
      - b-3.master-msk.example.com:9094
SourceAccessConfigurations:
  - Type: VPC_SUBNET
    URI: subnet-xxxxx
  - Type: VPC_SECURITY_GROUP
    URI: security_group:sg-xxxxx
SelfManagedKafkaEventSourceConfig:
  ConsumerGroupId: my-consumer-group
```

**How it works internally:**
- Lambda creates ENIs in YOUR specified subnets with YOUR specified security group
- This is an "external connection" approach using explicit networking
- Works even for cross-account connections via VPC peering

---

## Current Implementation

### Bootstrap Brokers (master-msk cluster)

```yaml
bootstrapBrokers:
  - b-1.master-msk.zf7e0q.c7.kafka.us-east-1.amazonaws.com:9094
  - b-2.master-msk.zf7e0q.c7.kafka.us-east-1.amazonaws.com:9094
  - b-3.master-msk.zf7e0q.c7.kafka.us-east-1.amazonaws.com:9094
```

### VPC Subnets (private subnets in MSK VPC)

```yaml
kafkaSubnets:
  - subnet-03bbabd1d3fb9c46e
  - subnet-0bbc0152eb9ed753a  
  - subnet-085cb700629763306
```

### Topics

| Topic | Lambda Function | Purpose |
|-------|-----------------|---------|
| `aws.appian.cmcs.MCP_SPA_PCKG` | sinkAppianData | Appian data sync to DynamoDB |
| `aws.ksqldb.seatool.agg.State_Plan` | sinkSeatoolData | Seatool data sync to DynamoDB |

### Consumer Group

- **Pattern:** `esm.compare-connector-{stage}`
- **Note:** Changed from `mgmt.connect.` prefix to avoid conflicts with old Kafka Connect consumer groups

---

## CloudFormation Template Pattern

Here's the working CloudFormation resource pattern for Self-Managed Kafka ESM:

```yaml
MyKafkaEventSourceMapping:
  Type: AWS::Lambda::EventSourceMapping
  Properties:
    FunctionName: !GetAtt MyLambdaFunction.Arn
    SelfManagedEventSource:
      Endpoints:
        KafkaBootstrapServers:
          - broker1.example.com:9094
          - broker2.example.com:9094
          - broker3.example.com:9094
    SourceAccessConfigurations:
      - Type: VPC_SUBNET
        URI: subnet-xxxxx
      - Type: VPC_SUBNET
        URI: subnet-yyyyy
      - Type: VPC_SUBNET
        URI: subnet-zzzzz
      - Type: VPC_SECURITY_GROUP
        URI: !Sub "security_group:${MySecurityGroup}"
    Topics:
      - my-kafka-topic
    BatchSize: 100
    MaximumBatchingWindowInSeconds: 5
    StartingPosition: LATEST
    Enabled: true
    SelfManagedKafkaEventSourceConfig:
      ConsumerGroupId: my-consumer-group
```

### Important CloudFormation Notes

1. **Key name:** Use `KafkaBootstrapServers` (PascalCase), NOT `KAFKA_BOOTSTRAP_SERVERS`
2. **Security group format:** Must include prefix: `security_group:sg-xxxxx`
3. **Subnets:** Each subnet needs its own `VPC_SUBNET` entry
4. **No Fn::Split:** Don't use CloudFormation intrinsic functions to split comma-separated subnet strings - define subnets explicitly

---

## SSM StringList Parameter Pattern (Recommended)

To avoid hardcoding broker strings and subnet IDs in templates, use **SSM Parameter Store StringList** parameters with CloudFormation Parameter resolution.

### Required SSM Parameters

Create these as **StringList** type in each AWS environment:

| Parameter Path | Type | Example Value |
|----------------|------|---------------|
| `/compare/default/bootstrapBrokers` | StringList | `b-1.msk.com:9094,b-2.msk.com:9094,b-3.msk.com:9094` |
| `/compare/default/kafkaSubnets` | StringList | `subnet-aaa,subnet-bbb,subnet-ccc` |

### CloudFormation Parameters Section

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

### Using in EventSourceMapping

```yaml
AppianKafkaEventSourceMapping:
  Type: AWS::Lambda::EventSourceMapping
  Properties:
    FunctionName: !GetAtt SinkAppianDataLambdaFunction.Arn
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
      - Type: VPC_SECURITY_GROUP
        URI: !Sub "security_group:${LambdaKafkaSecurityGroup}"
    # ... rest of config
```

### Why This Approach?

1. **Serverless Framework limitation:** Cannot properly resolve arrays from Secrets Manager for CloudFormation properties
2. **No Fn::Split in Serverless:** The `Fn::Split` intrinsic function cannot be used reliably in Serverless templates
3. **CloudFormation native resolution:** `AWS::SSM::Parameter::Value<List<String>>` resolves StringList parameters as proper arrays at deploy time
4. **Environment flexibility:** Different environments can have different broker/subnet values without template changes

---

## Verification Commands

### Check ESM Status

```bash
# Check specific Lambda's ESMs
aws lambda list-event-source-mappings \
  --function-name compare-connector-master-sinkAppianData \
  --region us-east-1 \
  --query 'EventSourceMappings[*].{UUID:UUID,State:State,LastProcessingResult:LastProcessingResult}'

# Expected output for working ESM:
# {
#   "UUID": "xxx",
#   "State": "Enabled", 
#   "LastProcessingResult": "OK"
# }
```

### Check ESM Details

```bash
aws lambda get-event-source-mapping --uuid <ESM-UUID> --region us-east-1
```

---

## Troubleshooting

### ESM Shows "Connection error"

If using Amazon MSK ESM type, **switch to Self-Managed Kafka ESM type**. This is the only reliable solution for this MSK cluster.

### ESM Shows "Enabled" but Never "OK"

1. Verify bootstrap brokers are correct and reachable
2. Verify security group allows outbound to port 9094
3. Verify Lambda execution role has `kafka-cluster:*` permissions
4. Check if topic exists on the cluster

### ESM Not Processing Messages

1. Check `StartingPosition` - use `LATEST` to skip historical data
2. Verify consumer group ID is unique (not conflicting with other consumers)
3. Check if there are actually new messages on the topic

---

## Reference: Working onemac-dev Configuration

The onemac-dev account successfully connects to master-msk using this exact pattern. Example working ESM from that account:

```json
{
  "UUID": "cc08e1cb-9584-4ec1-ac42-e8d1ddc2a4ca",
  "State": "Enabled",
  "LastProcessingResult": "OK",
  "Topics": ["aws.seatool.debezium.changed_date.SEA.dbo.State_Plan"],
  "SelfManagedEventSource": {
    "Endpoints": {
      "KAFKA_BOOTSTRAP_SERVERS": [
        "b-1.master-msk.zf7e0q.c7.kafka.us-east-1.amazonaws.com:9094",
        "b-2.master-msk.zf7e0q.c7.kafka.us-east-1.amazonaws.com:9094",
        "b-3.master-msk.zf7e0q.c7.kafka.us-east-1.amazonaws.com:9094"
      ]
    }
  },
  "SourceAccessConfigurations": [
    {"Type": "VPC_SUBNET", "URI": "subnet-07ca48bb103046a5b"},
    {"Type": "VPC_SUBNET", "URI": "subnet-0cee007f27050b08e"},
    {"Type": "VPC_SUBNET", "URI": "subnet-0f1c6a898f3166023"},
    {"Type": "VPC_SECURITY_GROUP", "URI": "security_group:sg-069e480f33835b95b"}
  ]
}
```

---

## MSK Cluster Details (for reference)

| Property | Value |
|----------|-------|
| Cluster Name | master-msk |
| Cluster ARN | `arn:aws:kafka:us-east-1:677829493285:cluster/master-msk/7590fbdf-00ae-492a-b1a1-ab47e2398f81-7` |
| Kafka Version | 3.8.x |
| Authentication | Unauthenticated TLS (port 9094) |
| VPC ID | vpc-06eef0c4d8f259d8f |
| Security Group | sg-06d2aff534111b586 |

---

## Important Constraints

1. **DO NOT modify the MSK cluster** - Other services depend on it
2. **DO NOT change MSK authentication settings** - Would break existing consumers
3. **Use fresh consumer group IDs** - Avoid conflicts with old Kafka Connect groups
4. **Use StartingPosition: LATEST** - Unless you specifically need historical data

---

## Related Documentation

- [MSK ESM Investigation Handoff](./msk-esm-investigation-handoff.md) - Detailed investigation notes
- [Connector Refactor Handoff](./connector-refactor-handoff.md) - Original refactor plan
- [AWS Lambda Self-Managed Kafka Docs](https://docs.aws.amazon.com/lambda/latest/dg/with-kafka.html)
