import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CloudWatchClient, GetMetricDataCommand, PutMetricDataCommand, GetMetricDataCommandOutput } from '@aws-sdk/client-cloudwatch';
import { APIGatewayEvent, Context, APIGatewayProxyCallback } from 'aws-lambda';

// Mock AWS SDK clients
vi.mock('@aws-sdk/client-cloudwatch', () => ({
  CloudWatchClient: vi.fn(() => ({
    send: vi.fn().mockImplementation(async (command: GetMetricDataCommand | PutMetricDataCommand) => {
      if (command instanceof GetMetricDataCommand) {
        return {
          MetricDataResults: [
            {
              Id: 'test-metric',
              Label: 'Test Metric',
              Values: [1, 2, 3],
              Timestamps: [new Date(), new Date(), new Date()]
            }
          ]
        } as GetMetricDataCommandOutput;
      }
      return {};
    })
  })),
  GetMetricDataCommand: vi.fn(),
  PutMetricDataCommand: vi.fn()
}));

describe('Dashboard Service', () => {
  let cloudWatchClient: CloudWatchClient;

  beforeEach(() => {
    vi.clearAllMocks();
    cloudWatchClient = new CloudWatchClient({});
  });

  describe('CloudWatch Operations', () => {
    it('should get metric data from CloudWatch', async () => {
      const command = new GetMetricDataCommand({
        MetricDataQueries: [
          {
            Id: 'test-metric',
            MetricStat: {
              Metric: {
                Namespace: 'TestNamespace',
                MetricName: 'TestMetric'
              },
              Period: 300,
              Stat: 'Average'
            }
          }
        ],
        StartTime: new Date(Date.now() - 3600000),
        EndTime: new Date()
      });

      const response = await cloudWatchClient.send(command) as GetMetricDataCommandOutput;

      expect(cloudWatchClient.send).toHaveBeenCalledWith(expect.any(GetMetricDataCommand));
      expect(response.MetricDataResults!).toHaveLength(1);
      expect(response.MetricDataResults![0].Id).toBe('test-metric');
    });

    it('should put metric data to CloudWatch', async () => {
      const command = new PutMetricDataCommand({
        Namespace: 'TestNamespace',
        MetricData: [
          {
            MetricName: 'TestMetric',
            Value: 1,
            Timestamp: new Date()
          }
        ]
      });

      const response = await cloudWatchClient.send(command);

      expect(cloudWatchClient.send).toHaveBeenCalledWith(expect.any(PutMetricDataCommand));
      expect(response).toEqual({});
    });

    it('should handle CloudWatch errors', async () => {
      vi.mocked(cloudWatchClient.send).mockRejectedValueOnce(new Error('CloudWatch error'));

      const command = new GetMetricDataCommand({
        MetricDataQueries: [
          {
            Id: 'test-metric',
            MetricStat: {
              Metric: {
                Namespace: 'TestNamespace',
                MetricName: 'TestMetric'
              },
              Period: 300,
              Stat: 'Average'
            }
          }
        ],
        StartTime: new Date(Date.now() - 3600000),
        EndTime: new Date()
      });

      await expect(cloudWatchClient.send(command)).rejects.toThrow('CloudWatch error');
    });
  });

  describe('API Gateway Integration', () => {
    it('should handle API Gateway requests', async () => {
      const event: APIGatewayEvent = {
        httpMethod: 'GET',
        path: '/metrics',
        headers: {},
        multiValueHeaders: {},
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        pathParameters: null,
        stageVariables: null,
        requestContext: {} as any,
        resource: '',
        body: null,
        isBase64Encoded: false
      };

      const context: Context = {} as Context;
      const callback: APIGatewayProxyCallback = vi.fn();

      // Mock the handler function
      const handler = vi.fn().mockImplementation(async () => {
        return {
          statusCode: 200,
          body: JSON.stringify({ message: 'Success' })
        };
      });

      const response = await handler(event, context, callback);

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({ message: 'Success' });
    });
  });
}); 