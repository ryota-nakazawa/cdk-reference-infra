import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cdk from 'aws-cdk-lib';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';
import { AppManifest, loadAppManifest, resolveAppPath } from './app-manifest';
import { ApiConstruct } from './constructs/api';
import { AsyncConstruct } from './constructs/async';
import { AuthConstruct } from './constructs/auth';
import { DataConstruct } from './constructs/data';
import { ObservabilityConstruct } from './constructs/observability';
import { RuntimeEcsConstruct } from './constructs/runtime-ecs';
import { RuntimeLambdaConstruct } from './constructs/runtime-lambda';
import { SecretsConstruct } from './constructs/secrets';
import { SecurityConstruct } from './constructs/security';
import { StorageConstruct } from './constructs/storage';
import { WebConstruct } from './constructs/web';
import { StackInput, toRemovalPolicy } from './stack-input';

export interface GenAiAppStackProps extends cdk.StackProps {
  input: StackInput;
}

const isLambdaBackend = (
  manifest: AppManifest,
): manifest is AppManifest & {
  type: 'lambda';
  backend: {
    path: string;
    entry: string;
    handler: string;
    timeoutSeconds: number;
    memorySizeMb: number;
    environment: Record<string, string>;
  };
} => {
  return manifest.type === 'lambda' && !!manifest.backend && 'entry' in manifest.backend;
};

const isEcsBackend = (
  manifest: AppManifest,
): manifest is AppManifest & {
  type: 'ecs';
  backend: {
    path: string;
    dockerfile: string;
    port: number;
    healthCheckPath: string;
    environment: Record<string, string>;
  };
} => {
  return manifest.type === 'ecs' && !!manifest.backend && 'dockerfile' in manifest.backend;
};

export class GenAiAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: GenAiAppStackProps) {
    super(scope, id, props);

    const { input } = props;
    const repoRoot = path.resolve(process.cwd(), '..');
    const manifest = loadAppManifest(repoRoot, input.appName);
    const removalPolicy = toRemovalPolicy(input.removalPolicy);

    const security = new SecurityConstruct(this, 'Security', {
      appEnv: input.appEnv,
      removalPolicy,
    });

    const auth = new AuthConstruct(this, 'Auth', {
      appName: input.appName,
    });

    const data = new DataConstruct(this, 'Data', {
      encryptionKey: security.key,
      removalPolicy,
    });

    const storage = new StorageConstruct(this, 'Storage', {
      encryptionKey: security.key,
      removalPolicy,
      dataRetentionDays: input.dataRetentionDays,
    });

    const secrets = new SecretsConstruct(this, 'Secrets', {
      appName: input.appName,
      appEnv: input.appEnv,
      encryptionKey: security.key,
      removalPolicy,
    });

    const async = input.enableSqs
      ? new AsyncConstruct(this, 'Async', {
          encryptionKey: security.key,
          removalPolicy,
        })
      : undefined;

    let invokeFunction: RuntimeLambdaConstruct['function'] | undefined;

    if (isLambdaBackend(manifest)) {
      const entry = resolveAppPath(
        repoRoot,
        input.appName,
        path.join(manifest.backend.path, manifest.backend.entry),
      );
      const runtime = new RuntimeLambdaConstruct(this, 'RuntimeLambda', {
        appName: manifest.name,
        projectRoot: repoRoot,
        entry,
        handler: manifest.backend.handler,
        timeoutSeconds: manifest.backend.timeoutSeconds,
        memorySizeMb: manifest.backend.memorySizeMb,
        environment: manifest.backend.environment,
        table: data.table,
        bucket: storage.bucket,
        secret: secrets.appSecret,
        queue: async?.queue,
        permissions: manifest.permissions,
        logRetentionDays: input.logRetentionDays,
      });
      invokeFunction = runtime.function;
    } else if (isEcsBackend(manifest)) {
      new RuntimeEcsConstruct(this, 'RuntimeEcs', {
        appName: manifest.name,
        dockerfile: resolveAppPath(
          repoRoot,
          input.appName,
          path.join(manifest.backend.path, manifest.backend.dockerfile),
        ),
        port: manifest.backend.port,
        healthCheckPath: manifest.backend.healthCheckPath,
      });
      throw new Error('ECS runtime is reserved in this template but not implemented yet.');
    } else if (manifest.type !== 'static') {
      throw new Error(`Unsupported or incomplete app manifest for ${input.appName}`);
    }

    let api: ApiConstruct | undefined;

    if (invokeFunction) {
      api = new ApiConstruct(this, 'Api', {
        userPool: auth.userPool,
        invokeFunction,
        auth: manifest.api.auth,
      });

      new ObservabilityConstruct(this, 'Observability', {
        appName: input.appName,
        invokeFunction,
        queue: async?.queue,
      });
    }

    const web = new WebConstruct(this, 'Web', {
      encryptionKey: security.key,
      responseHeadersPolicy: security.responseHeadersPolicy,
      api: api?.api,
    });

    if (manifest.frontend) {
      const frontendOutput = resolveAppPath(
        repoRoot,
        input.appName,
        path.join(manifest.frontend.path, manifest.frontend.outputDir),
      );

      if (fs.existsSync(frontendOutput)) {
        new s3deploy.BucketDeployment(this, 'DeployFrontend', {
          sources: [s3deploy.Source.asset(frontendOutput)],
          destinationBucket: web.bucket,
          distribution: web.distribution,
        });
      } else {
        console.warn(
          `Frontend output not found: ${frontendOutput}. Build the app before deployment if frontend hosting is required.`,
        );
      }
    }

    if (api) {
      new cdk.CfnOutput(this, 'ApiEndpoint', { value: api.api.url });
    }

    new cdk.CfnOutput(this, 'WebUrl', {
      value: `https://${web.distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, 'UserPoolId', { value: auth.userPool.userPoolId });
    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: auth.userPoolClient.userPoolClientId,
    });
    new cdk.CfnOutput(this, 'IdentityPoolId', { value: auth.identityPool.attrId });
    new cdk.CfnOutput(this, 'ArtifactsBucketName', { value: storage.bucket.bucketName });
    new cdk.CfnOutput(this, 'AppTableName', { value: data.table.tableName });
  }
}
