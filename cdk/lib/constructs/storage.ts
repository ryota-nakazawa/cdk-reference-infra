import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as kms from 'aws-cdk-lib/aws-kms';
import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';

export interface StorageConstructProps {
  encryptionKey: kms.IKey;
  removalPolicy: RemovalPolicy;
  dataRetentionDays: number;
}

export class StorageConstruct extends Construct {
  readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: StorageConstructProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, 'ArtifactsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.KMS,
      encryptionKey: props.encryptionKey,
      enforceSSL: true,
      versioned: true,
      autoDeleteObjects: props.removalPolicy === RemovalPolicy.DESTROY,
      removalPolicy: props.removalPolicy,
      lifecycleRules: [{ expiration: Duration.days(props.dataRetentionDays) }],
    });
  }
}
