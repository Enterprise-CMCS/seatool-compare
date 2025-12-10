<h1 align="center" style="border-bottom: none;">seatool-compare</h1>
<h3 align="center">Service for comparing legacy/seatool data and sending notifications.</h3>
<p align="center">
  <a href="https://Enterprise-CMCS.github.io/seatool-compare/">
    <img alt="Docs" src="https://img.shields.io/badge/Docs-Pages-blue.svg">
  </a>
  <a href="https://cmsgov.slack.com/archives/C045M44HA0Y">
    <img alt="Slack" src="https://img.shields.io/badge/Slack-seatool--compare-purple.svg">
  </a>
  <a href="https://codeclimate.com/github/Enterprise-CMCS/seatool-compare/maintainability">
    <img src="https://api.codeclimate.com/v1/badges/80cdaddc034a103a8c3d/maintainability" />
  </a>
  <a href="https://dependabot.com/">
    <img alt="Dependabot" src="https://badgen.net/badge/Dependabot/enabled/green?icon=dependabot">
  </a>
  <a href="https://github.com/prettier/prettier">
    <img alt="code style: prettier" src="https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square">
  </a>
  <a href="https://github.com/semantic-release/semantic-release">
    <img alt="semantic-release: angular" src="https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release">
  </a>
</p>

---

### Please visit our [seatool-compare docs site](https://Enterprise-CMCS.github.io/seatool-compare/) for complete documentation.

---

## Overview

The seatool-compare project (oftened referenced in the context of this repository as just 'compare') is a microservice compares legacy data and seatool data and sends notifications when certain conditions exist.

![Architecture Diagram](docs/assets/architecture.svg)

## Contributing

Work items for seatool-compare are tracked in CMS' Jira. If you have access to our Jira, you can view seatool-compare related work there. While there's no dedicated seatool-compare product view in Jira yet, the [Platform Team board](https://qmacbis.atlassian.net/jira/software/c/projects/OY2/boards/216/backlog?selectedIssue=OY2-17657&epics=visible&issueLimit=100) is a good stand in.

If you don't have access to Jira, would like access to Jira, or would like to discuss any enhancement, bug, idea, or question, please visit the [seatool-compare Slack channel](https://cmsgov.slack.com/archives/C045M44HA0Y). This is a public channel open to anyone in CMS Slack, and all input is welcome!

## License

[![License](https://img.shields.io/badge/License-CC0--1.0--Universal-blue.svg)](https://creativecommons.org/publicdomain/zero/1.0/legalcode)

See [LICENSE](LICENSE) for full details.

## Authentication

### AWS Authentication
To work with this project, you'll need AWS credentials configured. The recommended way is to use AWS SSO:

1. Install the AWS CLI v2
2. Configure AWS SSO:
   ```bash
   aws configure sso
   ```
3. Enter the following when prompted:
   - SSO start URL: `https://cmsgov.awsapps.com/start`
   - SSO Region: `us-east-1`
   - Choose your account and role
   - CLI profile name: `cmsgov`

### GitHub Authentication
For accessing private repositories and packages:

1. Create a GitHub Personal Access Token (PAT) with `read:packages` scope
2. Configure npm to use the token:
   ```bash
   npm login --registry=https://npm.pkg.github.com
   ```

## Local Development

### Prerequisites
- Node.js v20.17.0
- Yarn v1.22.19 or later
- AWS CLI v2
- AWS SSO configured

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Enterprise-CMCS/seatool-compare.git
   cd seatool-compare
   ```

2. Install dependencies:
   ```bash
   yarn install:all
   ```

### Available Commands

#### Workspace Commands
- `yarn install:all` - Install dependencies for all services
- `yarn build:all` - Build all services
- `yarn deploy:all` - Deploy all services
- `yarn test:all` - Run tests for all services

#### Individual Service Commands
To run commands for a specific service:
```bash
yarn workspace <service-name> <command>
```

Available services:
- `alerts` - Alert notification service
- `appian` - Appian integration service
- `compare-appian` - Appian comparison service
- `compare-mmdl` - MMDL comparison service
- `connector` - Data connector service
- `mmdl` - MMDL service
- `seatool` - Seatool service

Example:
```bash
# Build the alerts service
yarn workspace alerts build

# Run tests for the connector service
yarn workspace connector test
```

### Running Tests
Each service has its own test suite. To run tests for a specific service:
```bash
yarn workspace <service-name> test
```

For example:
```bash
yarn workspace alerts test
```

### Local Development Server
To run a service locally:
```bash
yarn workspace <service-name> start
```

This will start the service in development mode with hot reloading enabled.

## Connector Service

The connector service uses Kafka Connect to stream data from Kafka topics into Lambda sink functions.

### Kafka Connect Plugin

The service uses the **Confluent AWS Lambda Sink Connector** (`io.confluent.connect.aws.lambda.AwsLambdaSinkConnector`) to invoke Lambda functions for each message consumed from Kafka topics.

> **Note**: As of November 2025, the Confluent connector replaced the previously used Nordstrom kafka-connect-lambda connector which became unavailable.

### Migration Runbook

For deploying connector changes to val/production environments, see the [Confluent Connector Migration Runbook](docs/confluent-connector-migration-runbook.md).

### Quick Connector Health Check

```bash
# Check connector status (replace <stage> with master, val, or production)
aws lambda invoke \
  --function-name compare-connector-<stage>-testConnectors \
  --region us-east-1 \
  --cli-binary-format raw-in-base64-out \
  --payload '{"cluster": "compare-connector-<stage>-connect"}' \
  /tmp/test.json && cat /tmp/test.json

# View recent Kafka Connect logs
aws logs tail /aws/fargate/compare-connector-<stage>-kafka-connect --since 10m --region us-east-1
```
