import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as kms from 'aws-cdk-lib/aws-kms';
import { Construct } from 'constructs';

export interface SecurityConstructProps {
  appEnv: string;
  removalPolicy: RemovalPolicy;
}

export class SecurityConstruct extends Construct {
  readonly key: kms.Key;
  readonly responseHeadersPolicy: cloudfront.ResponseHeadersPolicy;

  constructor(scope: Construct, id: string, props: SecurityConstructProps) {
    super(scope, id);

    this.key = new kms.Key(this, 'Key', {
      alias: `alias/genai-app/${props.appEnv}`,
      enableKeyRotation: true,
      removalPolicy: props.removalPolicy,
    });

    this.responseHeadersPolicy = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      securityHeadersBehavior: {
        contentSecurityPolicy: {
          contentSecurityPolicy:
            "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; connect-src 'self' https://*.amazonaws.com https://*.amazoncognito.com wss://*.amazonaws.com; object-src 'none'; frame-ancestors 'none';",
          override: true,
        },
        frameOptions: {
          frameOption: cloudfront.HeadersFrameOption.DENY,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: Duration.days(365),
          includeSubdomains: true,
          preload: true,
          override: true,
        },
        contentTypeOptions: {
          override: true,
        },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
      },
    });
  }
}
