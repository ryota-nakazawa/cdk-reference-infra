#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { createStacks } from '../lib/create-stacks';
import { getStackInput } from '../lib/stack-input';

const app = new cdk.App();
const input = getStackInput(app);

cdk.Tags.of(app).add('Environment', input.appEnv);
cdk.Tags.of(app).add('Application', input.appName);

createStacks(app, input);
