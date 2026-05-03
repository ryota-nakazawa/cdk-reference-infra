import { RemovalPolicy } from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export interface SecretsConstructProps {
  appName: string;
  appEnv: string;
  encryptionKey: kms.IKey;
  removalPolicy: RemovalPolicy;
}

export class SecretsConstruct extends Construct {
  readonly appSecret: secretsmanager.Secret;

  constructor(scope: Construct, id: string, props: SecretsConstructProps) {
    super(scope, id);

    this.appSecret = new secretsmanager.Secret(this, 'AppSecret', {
      secretName: `/genai-app/${props.appEnv}/${props.appName}/app-secret`,
      encryptionKey: props.encryptionKey,
      generateSecretString: {
        secretStringTemplate: JSON.stringify({}),
        generateStringKey: 'apiKey',
      },
      removalPolicy: props.removalPolicy,
    });
  }
}
