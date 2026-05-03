import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface AsyncConstructProps {
  encryptionKey: kms.IKey;
  removalPolicy: RemovalPolicy;
}

export class AsyncConstruct extends Construct {
  readonly queue: sqs.Queue;
  readonly deadLetterQueue: sqs.Queue;

  constructor(scope: Construct, id: string, props: AsyncConstructProps) {
    super(scope, id);

    this.deadLetterQueue = new sqs.Queue(this, 'DeadLetterQueue', {
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: props.encryptionKey,
      retentionPeriod: Duration.days(14),
      removalPolicy: props.removalPolicy,
    });

    this.queue = new sqs.Queue(this, 'Queue', {
      encryption: sqs.QueueEncryption.KMS,
      encryptionMasterKey: props.encryptionKey,
      visibilityTimeout: Duration.minutes(5),
      retentionPeriod: Duration.days(4),
      deadLetterQueue: {
        maxReceiveCount: 3,
        queue: this.deadLetterQueue,
      },
      removalPolicy: props.removalPolicy,
    });
  }
}
