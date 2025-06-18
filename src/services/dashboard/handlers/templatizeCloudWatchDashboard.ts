import { CloudWatch } from "@aws-sdk/client-cloudwatch";
import type {
  APIGatewayEvent,
  APIGatewayProxyCallback,
  Context,
} from "aws-lambda";

export const handler = async (
  _event: APIGatewayEvent,
  _context: Context,
  _callback: APIGatewayProxyCallback
) => {
  //environment variables passed to lambda from serverless.yml
  const service = process.env.service!;
  const accountId = process.env.accountId!;
  const stage = process.env.stage!;
  const region = process.env.region!;

  const client = new CloudWatch({});
  const dashboard = await client.getDashboard({
    DashboardName: `${service}-${stage}`,
  });
  const templateJson = dashboard
    .DashboardBody!.replace(new RegExp(accountId, 'g'), "${aws:accountId}")
    .replace(new RegExp(stage, 'g'), "${sls:stage}")
    .replace(new RegExp(region, 'g'), "${env:REGION_A}")
    .replace(new RegExp(service, 'g'), "${self:service}");

  return templateJson;
};
