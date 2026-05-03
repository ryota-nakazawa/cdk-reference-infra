import { Duration, RemovalPolicy, Stack } from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { Construct } from 'constructs';

export interface RuntimeLambdaConstructProps {
  appName: string;
  projectRoot: string;
  entry: string;
  handler: string;
  timeoutSeconds: number;
  memorySizeMb: number;
  environment: Record<string, string>;
  table: dynamodb.ITable;
  bucket: s3.IBucket;
  secret: secretsmanager.ISecret;
  queue?: sqs.IQueue;
  permissions: {
    bedrock: boolean;
    dynamodb: boolean;
    s3: boolean;
    secrets: boolean;
    sqs: boolean;
  };
  logRetentionDays: number;
}

export class RuntimeLambdaConstruct extends Construct {
  readonly function: NodejsFunction;

  constructor(scope: Construct, id: string, props: RuntimeLambdaConstructProps) {
    super(scope, id);

    this.function = new NodejsFunction(this, 'Function', {
      functionName: `${props.appName}-invoke`,
      entry: props.entry,
      projectRoot: props.projectRoot,
      handler: props.handler,
      runtime: lambda.Runtime.NODEJS_22_X,
      timeout: Duration.seconds(props.timeoutSeconds),
      memorySize: props.memorySizeMb,
      logGroup: new logs.LogGroup(this, 'FunctionLogGroup', {
        logGroupName: `/aws/lambda/${props.appName}-invoke`,
        retention: props.logRetentionDays as logs.RetentionDays,
        removalPolicy: RemovalPolicy.DESTROY,
      }),
      environment: {
        APP_NAME: props.appName,
        TABLE_NAME: props.table.tableName,
        ARTIFACTS_BUCKET_NAME: props.bucket.bucketName,
        APP_SECRET_ARN: props.secret.secretArn,
        ...(props.queue ? { QUEUE_URL: props.queue.queueUrl } : {}),
        ...props.environment,
      },
    });

    if (props.permissions.dynamodb) {
      props.table.grantReadWriteData(this.function);
    }

    if (props.permissions.s3) {
      props.bucket.grantReadWrite(this.function);
    }

    if (props.permissions.secrets) {
      props.secret.grantRead(this.function);
    }

    if (props.permissions.sqs && props.queue) {
      props.queue.grantSendMessages(this.function);
    }

    if (props.permissions.bedrock) {
      this.function.addToRolePolicy(
        new iam.PolicyStatement({
          actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
          resources: ['*'],
        }),
      );
    }

    this.function.addEnvironment('AWS_ACCOUNT_ID', Stack.of(this).account);
  }
}
