import { putItem, getItem, deleteItem, scanTable } from "../dynamodb-lib";
import { it, describe, expect, beforeEach } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import {
  DynamoDBClient,
  PutItemCommand,
  GetItemCommand,
  ScanCommand,
  DeleteItemCommand,
} from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

const dynamoClientMock = mockClient(DynamoDBClient);

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

  it("should successfully scan a table", async () => {
    const dynamoDBScanClientMock = mockClient(DynamoDBDocumentClient);

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

    const response = await scanTable("test-tables");
    const item = response?.[0] as { id: string };
    const id = item.id;
    expect(id).toEqual("2000");
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

    expect(() =>
      deleteItem({
        tableName: "test-table",
        key: deleteItemParam,
      })
    ).not.toThrow();
  });
});
