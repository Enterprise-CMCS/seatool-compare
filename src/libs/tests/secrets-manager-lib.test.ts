import { getSecretsValue, doesSecretExist } from "../secrets-manager-lib";
import { it, describe, expect } from "vitest";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
  ListSecretsCommand,
} from "@aws-sdk/client-secrets-manager";
import { mockClient } from "aws-sdk-client-mock";

const secretClientMock = mockClient(SecretsManagerClient);

describe("secrets manager lib", () => {
  it("should successfully return secret value", async () => {
    const secret = { Name: "Secret", SecretString: JSON.stringify("test") };
    secretClientMock.on(GetSecretValueCommand).resolves(secret);

    const response = await getSecretsValue("test-region", "email");

    expect(response).toEqual("test");
  });

  it("should return undefined when there is an error getting a response", async () => {
    secretClientMock.on(GetSecretValueCommand).rejects("error");

    const response = await getSecretsValue("test-region", "email");

    expect(response).toBeUndefined();
  });

  it("should successfully return if secret exist", async () => {
    secretClientMock
      .on(ListSecretsCommand)
      .resolves({ SecretList: [{ Name: "email" }] });

    const response = await doesSecretExist("test-region", "email");

    expect(response).toEqual(true);
  });
});
