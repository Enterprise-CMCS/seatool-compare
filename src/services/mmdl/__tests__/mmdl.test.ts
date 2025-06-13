import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DynamoDBClient, GetItemCommand, PutItemCommand, AttributeValue } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

// Mock AWS SDK clients
vi.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: vi.fn(() => ({
    send: vi.fn().mockImplementation(async (command: GetItemCommand | PutItemCommand) => {
      if (command instanceof GetItemCommand) {
        return {
          Item: {
            PK: { S: 'test-pk' },
            SK: { S: 'test-sk' },
            data: { M: { test: { S: 'data' } } }
          }
        };
      }
      return {};
    })
  })),
  GetItemCommand: vi.fn(),
  PutItemCommand: vi.fn()
}));

vi.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: {
    from: vi.fn(() => ({
      get: vi.fn(),
      put: vi.fn()
    }))
  }
}));

describe('MMDL Service', () => {
  let dynamoClient: DynamoDBClient;
  let docClient: DynamoDBDocumentClient;

  beforeEach(() => {
    vi.clearAllMocks();
    dynamoClient = new DynamoDBClient({});
    docClient = DynamoDBDocumentClient.from(dynamoClient);
  });

  describe('DynamoDB Operations', () => {
    it('should get item from DynamoDB', async () => {
      const mockItem: Record<string, AttributeValue> = {
        PK: { S: 'test-pk' },
        SK: { S: 'test-sk' },
        data: { M: { test: { S: 'data' } } }
      };

      const command = new GetItemCommand({
        TableName: 'test-table',
        Key: { PK: { S: 'test-pk' }, SK: { S: 'test-sk' } }
      });

      const response = await dynamoClient.send(command);

      expect(dynamoClient.send).toHaveBeenCalledWith(expect.any(GetItemCommand));
      expect(response.Item).toEqual(mockItem);
    });

    it('should put item to DynamoDB', async () => {
      const mockItem: Record<string, AttributeValue> = {
        PK: { S: 'test-pk' },
        SK: { S: 'test-sk' },
        data: { M: { test: { S: 'data' } } }
      };

      const command = new PutItemCommand({
        TableName: 'test-table',
        Item: mockItem
      });

      const response = await dynamoClient.send(command);

      expect(dynamoClient.send).toHaveBeenCalledWith(expect.any(PutItemCommand));
      expect(response).toEqual({});
    });

    it('should handle DynamoDB errors', async () => {
      vi.mocked(dynamoClient.send).mockRejectedValueOnce(new Error('DynamoDB error'));

      const command = new GetItemCommand({
        TableName: 'test-table',
        Key: { PK: { S: 'test-pk' }, SK: { S: 'test-sk' } }
      });

      await expect(dynamoClient.send(command)).rejects.toThrow('DynamoDB error');
    });
  });
}); 