import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

export const getSecretsValue = async ({ region, secretId }) => {
  const client = new SecretsManagerClient({ region: region });
  const input = { SecretId: secretId };
  const command = new GetSecretValueCommand(input);
  try {
    const response = await client.send(command);
    const result = JSON.parse(response.SecretString);
    return result;
  } catch (e) {
    console.log("ERROR", JSON.stringify(e, null, 2));
  }
};
