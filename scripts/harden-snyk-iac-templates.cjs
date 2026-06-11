"use strict";

const fs = require("fs");
const path = require("path");

const templates = [
  {
    file: "node_modules/@osls/compose/src/state/utils/remote-state-cloudformation-template.json",
    bucket: "ServerlessComposeRemoteStateBucket",
    policy: "ServerlessComposeRemoteStateBucketPolicy",
  },
  {
    file: "node_modules/@serverless/compose/src/state/utils/remote-state-cloudformation-template.json",
    bucket: "ServerlessComposeRemoteStateBucket",
    policy: "ServerlessComposeRemoteStateBucketPolicy",
  },
  {
    file: "node_modules/serverless/lib/plugins/aws/package/lib/core-cloudformation-template.json",
    bucket: "ServerlessDeploymentBucket",
    policy: "ServerlessDeploymentBucketPolicy",
  },
];

const repoRoot = path.resolve(__dirname, "..");
let patchedCount = 0;

for (const template of templates) {
  const templatePath = path.join(repoRoot, template.file);

  if (!fs.existsSync(templatePath)) {
    continue;
  }

  const contents = fs.readFileSync(templatePath, "utf8");
  const cloudFormation = JSON.parse(contents);
  const bucketResource = cloudFormation.Resources?.[template.bucket];
  const policyResource = cloudFormation.Resources?.[template.policy];

  if (!bucketResource?.Properties || !policyResource?.Properties?.PolicyDocument) {
    throw new Error(`Expected S3 bucket and policy resources in ${template.file}`);
  }

  bucketResource.Properties.VersioningConfiguration = {
    Status: "Enabled",
  };
  bucketResource.Properties.LoggingConfiguration = {
    DestinationBucketName: {
      Ref: template.bucket,
    },
    LogFilePrefix: "server-access-logs/",
  };

  const statements = policyResource.Properties.PolicyDocument.Statement;
  if (!Array.isArray(statements)) {
    throw new Error(`Expected bucket policy statements array in ${template.file}`);
  }

  const logDeliverySid = "AllowS3ServerAccessLogDelivery";
  const existingIndex = statements.findIndex(
    (statement) => statement.Sid === logDeliverySid,
  );
  const logDeliveryStatement = createLogDeliveryStatement(template.bucket);

  if (existingIndex === -1) {
    statements.push(logDeliveryStatement);
  } else {
    statements[existingIndex] = logDeliveryStatement;
  }

  fs.writeFileSync(templatePath, `${JSON.stringify(cloudFormation, null, 2)}\n`);
  patchedCount += 1;
}

console.log(`Hardened ${patchedCount} Snyk-scanned IaC template(s).`);

function createLogDeliveryStatement(bucketLogicalId) {
  return {
    Sid: "AllowS3ServerAccessLogDelivery",
    Action: "s3:PutObject",
    Effect: "Allow",
    Principal: {
      Service: "logging.s3.amazonaws.com",
    },
    Resource: [
      {
        "Fn::Join": [
          "",
          [
            "arn:",
            {
              Ref: "AWS::Partition",
            },
            ":s3:::",
            {
              Ref: bucketLogicalId,
            },
            "/server-access-logs/*",
          ],
        ],
      },
    ],
    Condition: {
      ArnLike: {
        "aws:SourceArn": {
          "Fn::Join": [
            "",
            [
              "arn:",
              {
                Ref: "AWS::Partition",
              },
              ":s3:::",
              {
                Ref: bucketLogicalId,
              },
            ],
          ],
        },
      },
      StringEquals: {
        "aws:SourceAccount": {
          Ref: "AWS::AccountId",
        },
      },
    },
  };
}
