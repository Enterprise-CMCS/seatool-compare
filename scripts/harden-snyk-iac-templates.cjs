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

  let contents;
  try {
    contents = fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    if (error && error.code === "ENOENT") {
      continue;
    }
    throw error;
  }
  const cloudFormation = JSON.parse(contents);
  const bucketResource = cloudFormation.Resources?.[template.bucket];
  const policyResource = cloudFormation.Resources?.[template.policy];

  if (!bucketResource?.Properties || !policyResource?.Properties?.PolicyDocument) {
    throw new Error(`Expected S3 bucket and policy resources in ${template.file}`);
  }

  bucketResource.Properties.VersioningConfiguration = {
    Status: "Enabled",
  };

  const statements = policyResource.Properties.PolicyDocument.Statement;
  if (!Array.isArray(statements)) {
    throw new Error(`Expected bucket policy statements array in ${template.file}`);
  }

  // Do not configure a generated deployment/state bucket to log to itself.
  // That creates a CloudFormation cycle between the bucket and its policy.
  const logDeliverySid = "AllowS3ServerAccessLogDelivery";
  delete bucketResource.Properties.LoggingConfiguration;
  policyResource.Properties.PolicyDocument.Statement = statements.filter(
    (statement) => statement.Sid !== logDeliverySid,
  );

  fs.writeFileSync(templatePath, `${JSON.stringify(cloudFormation, null, 2)}\n`);
  patchedCount += 1;
}

console.log(`Hardened ${patchedCount} Snyk-scanned IaC template(s).`);
