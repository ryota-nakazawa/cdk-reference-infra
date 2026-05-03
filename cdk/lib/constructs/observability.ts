import { Duration } from 'aws-cdk-lib';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface ObservabilityConstructProps {
  appName: string;
  invokeFunction: lambda.IFunction;
  queue?: sqs.IQueue;
}

export class ObservabilityConstruct extends Construct {
  constructor(scope: Construct, id: string, props: ObservabilityConstructProps) {
    super(scope, id);

    new cloudwatch.Alarm(this, 'LambdaErrorsAlarm', {
      alarmName: `${props.appName}-lambda-errors`,
      metric: props.invokeFunction.metricErrors({ period: Duration.minutes(5) }),
      threshold: 1,
      evaluationPeriods: 1,
    });

    if (props.queue) {
      new cloudwatch.Alarm(this, 'QueueBacklogAlarm', {
        alarmName: `${props.appName}-queue-backlog`,
        metric: props.queue.metricApproximateNumberOfMessagesVisible({
          period: Duration.minutes(5),
        }),
        threshold: 10,
        evaluationPeriods: 3,
      });
    }
  }
}
