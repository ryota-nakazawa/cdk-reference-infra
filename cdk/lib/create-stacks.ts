import * as cdk from 'aws-cdk-lib';
import { GenAiAppStack } from './app-stack';
import { StackInput } from './stack-input';

export const createStacks = (app: cdk.App, input: StackInput) => {
  const stack = new GenAiAppStack(app, `GenAiAppStack-${input.appEnv}`, {
    env: input.account ? { account: input.account, region: input.region } : undefined,
    input,
  });

  cdk.Tags.of(stack).add('Environment', input.appEnv);
  cdk.Tags.of(stack).add('Application', input.appName);

  return { stack };
};
