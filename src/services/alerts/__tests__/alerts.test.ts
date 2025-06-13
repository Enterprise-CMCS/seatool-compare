import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SNSClient, PublishCommand, PublishCommandOutput } from '@aws-sdk/client-sns';
import { CloudWatchLogsClient, PutLogEventsCommand, PutLogEventsCommandOutput } from '@aws-sdk/client-cloudwatch-logs';

// Mock AWS SDK clients
vi.mock('@aws-sdk/client-sns', () => ({
  SNSClient: vi.fn(() => ({
    send: vi.fn().mockImplementation(async (command: PublishCommand): Promise<PublishCommandOutput> => {
      return { MessageId: 'test-message-id', $metadata: {} };
    })
  })),
  PublishCommand: vi.fn()
}));

vi.mock('@aws-sdk/client-cloudwatch-logs', () => ({
  CloudWatchLogsClient: vi.fn(() => ({
    send: vi.fn().mockImplementation(async (command: PutLogEventsCommand): Promise<PutLogEventsCommandOutput> => {
      return { nextSequenceToken: 'test-token', $metadata: {} };
    })
  })),
  PutLogEventsCommand: vi.fn()
}));

describe('Alerts Service', () => {
  let snsClient: SNSClient;
  let cloudWatchClient: CloudWatchLogsClient;

  beforeEach(() => {
    vi.clearAllMocks();
    snsClient = new SNSClient({});
    cloudWatchClient = new CloudWatchLogsClient({});
  });

  describe('SNS Topic Publishing', () => {
    it('should publish message to SNS topic', async () => {
      const mockMessage = {
        Message: 'Test alert message',
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic'
      };

      const command = new PublishCommand(mockMessage);
      const response = await snsClient.send(command);

      expect(snsClient.send).toHaveBeenCalledWith(expect.any(PublishCommand));
      expect(response.MessageId).toBe('test-message-id');
    });

    it('should handle SNS publish errors', async () => {
      const mockMessage = {
        Message: 'Test alert message',
        TopicArn: 'arn:aws:sns:us-east-1:123456789012:test-topic'
      };

      vi.mocked(snsClient.send).mockRejectedValueOnce(new Error('SNS publish failed'));

      const command = new PublishCommand(mockMessage);
      await expect(snsClient.send(command)).rejects.toThrow('SNS publish failed');
    });
  });

  describe('CloudWatch Logs', () => {
    it('should put log events to CloudWatch', async () => {
      const mockLogEvents = {
        logGroupName: '/aws/ses/test-alerts-sent-alerts',
        logStreamName: 'test-stream',
        logEvents: [
          {
            timestamp: Date.now(),
            message: 'Test log message'
          }
        ]
      };

      const command = new PutLogEventsCommand(mockLogEvents);
      const response = await cloudWatchClient.send(command);

      expect(cloudWatchClient.send).toHaveBeenCalledWith(expect.any(PutLogEventsCommand));
      expect(response.nextSequenceToken).toBe('test-token');
    });

    it('should handle CloudWatch log errors', async () => {
      const mockLogEvents = {
        logGroupName: '/aws/ses/test-alerts-sent-alerts',
        logStreamName: 'test-stream',
        logEvents: [
          {
            timestamp: Date.now(),
            message: 'Test log message'
          }
        ]
      };

      vi.mocked(cloudWatchClient.send).mockRejectedValueOnce(new Error('CloudWatch put logs failed'));

      const command = new PutLogEventsCommand(mockLogEvents);
      await expect(cloudWatchClient.send(command)).rejects.toThrow('CloudWatch put logs failed');
    });
  });
}); 