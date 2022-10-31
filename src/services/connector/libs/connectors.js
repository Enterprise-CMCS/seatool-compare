export const connectors = [
  {
    name: `${process.env.connectorPrefix}-sink.lambda.seatoolData`,
    config: {
      "tasks.max": "1",
      "connector.class":
        "com.nordstrom.kafka.connect.lambda.LambdaSinkConnector",
      topics: "aws.ksqldb.seatool.agg.State_Plan",
      "key.converter": "org.apache.kafka.connect.storage.StringConverter",
      "value.converter": "org.apache.kafka.connect.storage.StringConverter",
      "aws.region": process.env.region,
      "aws.lambda.function.arn": process.env.seatoolSinkFunctionArn,
      "aws.lambda.batch.enabled": "false",
      "aws.credentials.provider.class":
        " com.amazonaws.auth.DefaultAWSCredentialsProviderChain",
    },
  },
];
