import { putItem, getItem, deleteItem, scanTable } from "../dynamodb-lib";
import { it, describe, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
  DeleteItemCommand,
  DeleteItemCommandOutput,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const dynamoClientMock = mockClient(DynamoDBClient);
const dynamoDBScanClientMock = mockClient(DynamoDBDocumentClient);
describe("dynamoDB tests", () => {
  beforeEach(() => {
    process.env.region = "test-region";
    process.env.namespace = "namespace";
  });

  it("should successfully put an item", async () => {
    const putItemParam = { id: "2000" };
    const putItemResponse = {
      $metadata: {
        httpStatusCode: 200,
        requestId: "d8680883-37ca-49e4-8619-e43d1e3a391b",
        attempts: 1,
        totalRetryDelay: 0,
      },
    };
    dynamoClientMock.on(PutItemCommand).resolves(putItemResponse);

    const response = await putItem({
      tableName: "test-table",
      item: putItemParam,
    });

    expect(response?.$metadata.httpStatusCode).toEqual(200);
  });

  it("should unsuccessfully put an item", async () => {
    const putItemParam = { id: "2000" };

    dynamoClientMock.on(PutItemCommand).rejects;

    const response = await putItem({
      tableName: "test-table",
      item: putItemParam,
    });

    expect(response).toBeUndefined();
  });

  it("should successfully get an item", async () => {
    const getItemParam = { id: "2000" };
    const getItemResponse = {
      $metadata: {
        httpStatusCode: 200,
        requestId: "d8680883-37ca-49e4-8619-e43d1e3a391b",
        attempts: 1,
        totalRetryDelay: 0,
      },
      Item: { id: { S: "2000" } },
    };
    dynamoClientMock.on(GetItemCommand).resolves(getItemResponse);

    const response = await getItem({
      tableName: "test-table",
      key: getItemParam,
    });

    expect(response?.id).toEqual("2000");
  });

  it("should unsuccessfully get an item", async () => {
    const getItemParam = { id: "2000" };

    dynamoClientMock.on(GetItemCommand).rejects("error");

    const response = await getItem({
      tableName: "test-table",
      key: getItemParam,
    });

    expect(response).toBeNull();
  });

  it("should successfully scan a table", async () => {
    const scanItemResponse = {
      $metadata: {
        httpStatusCode: 200,
        requestId: "d8680883-37ca-49e4-8619-e43d1e3a391b",
        attempts: 1,
        totalRetryDelay: 0,
      },
      Items: [{ id: { S: "2000" } }],
    };
    dynamoDBScanClientMock.on(ScanCommand).resolves(scanItemResponse);

    const response = await scanTable({ TableName: "test-tables" });
    const item = response?.[0] as { id: string };
    const id = item.id;
    expect(id).toEqual("2000");
  });

  it("should unsuccessfully scan a table", async () => {
    dynamoDBScanClientMock.on(ScanCommand).rejects("error");

    const response = await scanTable({ TableName: "test-tables" });
    expect(response).toBeUndefined();
  });

  it("should successfully delete a table item", async () => {
    const deleteItemParam = { id: "2000" };
    const deleteItemResponse = {
      $metadata: {
        httpStatusCode: 200,
        requestId: "d8680883-37ca-49e4-8619-e43d1e3a391b",
        attempts: 1,
        totalRetryDelay: 0,
      },
    };
    dynamoClientMock.on(DeleteItemCommand).resolves(deleteItemResponse);
    const results = (await deleteItem({
      tableName: "test-table",
      key: deleteItemParam,
    })) as DeleteItemCommandOutput;
    expect(results?.$metadata.httpStatusCode).toEqual(200);
  });

  it("should unsuccessfully delete a table item", async () => {
    dynamoClientMock.on(DeleteItemCommand).rejects("error");
    const results = (await deleteItem({
      tableName: "test-table",
      key: { id: "2000" },
    })) as { message: string };
    expect(results.message).toBe("error");
  });
});
