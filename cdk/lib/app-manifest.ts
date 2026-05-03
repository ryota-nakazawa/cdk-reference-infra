import * as fs from 'node:fs';
import * as path from 'node:path';
import { z } from 'zod';

const frontendSchema = z
  .object({
    path: z.string(),
    buildCommand: z.string().default('npm ci && npm run build'),
    outputDir: z.string().default('dist'),
  })
  .optional();

const lambdaBackendSchema = z.object({
  path: z.string(),
  entry: z.string(),
  handler: z.string().default('handler'),
  runtime: z.literal('nodejs22.x').default('nodejs22.x'),
  timeoutSeconds: z.number().min(1).max(900).default(60),
  memorySizeMb: z.number().min(128).max(10240).default(512),
  environment: z.record(z.string(), z.string()).default({}),
});

const ecsBackendSchema = z.object({
  path: z.string(),
  dockerfile: z.string().default('Dockerfile'),
  port: z.number().min(1).max(65535).default(8080),
  healthCheckPath: z.string().default('/health'),
  environment: z.record(z.string(), z.string()).default({}),
});

export const appManifestSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['lambda', 'ecs', 'static']),
  description: z.string().default(''),
  frontend: frontendSchema,
  backend: z.union([lambdaBackendSchema, ecsBackendSchema]).optional(),
  api: z
    .object({
      invokePath: z.string().default('/invoke'),
      auth: z.enum(['cognito', 'none']).default('cognito'),
    })
    .default({ invokePath: '/invoke', auth: 'cognito' }),
  permissions: z
    .object({
      bedrock: z.boolean().default(false),
      dynamodb: z.boolean().default(false),
      s3: z.boolean().default(false),
      secrets: z.boolean().default(false),
      sqs: z.boolean().default(false),
    })
    .default({
      bedrock: false,
      dynamodb: false,
      s3: false,
      secrets: false,
      sqs: false,
    }),
});

export type AppManifest = z.infer<typeof appManifestSchema>;

export const loadAppManifest = (repoRoot: string, appName: string): AppManifest => {
  const manifestPath = path.join(repoRoot, 'apps', appName, 'app.manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`app.manifest.json not found: ${manifestPath}`);
  }

  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  return appManifestSchema.parse(raw);
};

export const resolveAppPath = (repoRoot: string, appName: string, relativePath: string): string => {
  return path.join(repoRoot, 'apps', appName, relativePath);
};
