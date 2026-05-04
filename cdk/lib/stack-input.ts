import * as cdk from 'aws-cdk-lib';
import { z } from 'zod';

const parseContextValue = (value: unknown): unknown => {
  if (typeof value !== 'string' || value === '') {
    return value;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const preprocessContextValues = (obj: Record<string, unknown>): Record<string, unknown> => {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    result[key] =
      value && typeof value === 'object' && !Array.isArray(value)
        ? preprocessContextValues(value as Record<string, unknown>)
        : parseContextValue(value);
  }

  return result;
};

export const stackInputSchema = z.object({
  account: z.string().default(process.env.CDK_DEFAULT_ACCOUNT ?? ''),
  region: z.string().default(process.env.CDK_DEFAULT_REGION ?? 'ap-northeast-1'),
  appName: z.string().default('example-lambda-app'),
  appEnv: z.string().regex(/^[a-zA-Z0-9/_+=.@-]+$/).default('dev'),
  envName: z.string().default('dev'),
  enableWaf: z.boolean().default(false),
  enableSqs: z.boolean().default(true),
  allowedCountryCodes: z.array(z.string()).default([]),
  rateLimitPer5Min: z.number().min(10).default(300),
  enableBudget: z.boolean().default(false),
  monthlyBudgetLimitUsd: z.number().min(1).default(10),
  budgetAlertEmail: z.string().email().optional(),
  removalPolicy: z.enum(['DESTROY', 'RETAIN']).default('DESTROY'),
  allowedIpV4AddressRanges: z.array(z.string()).default([]),
  allowedIpV6AddressRanges: z.array(z.string()).default([]),
  dataRetentionDays: z.number().min(1).default(365),
  logRetentionDays: z.number().min(1).default(30),
  alarmEmail: z.string().email().optional(),
});

export type StackInput = z.infer<typeof stackInputSchema>;

export const getStackInput = (app: cdk.App): StackInput => {
  const rawContext = app.node.getAllContext();
  const preprocessedContext = preprocessContextValues(rawContext);
  return stackInputSchema.parse(preprocessedContext);
};

export const toRemovalPolicy = (value: StackInput['removalPolicy']): cdk.RemovalPolicy => {
  return value === 'RETAIN' ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY;
};
