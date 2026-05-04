# AGENTS.md

## Project Goal

This repository is an enterprise GenAI application infrastructure template inspired by the Gennai Web CDK architecture.

The goal is to let developers place an AI application under `apps/`, then adapt it to the standard CDK deployment model with minimal manual infrastructure work.

## Architecture Principles

- Keep application code and infrastructure code separated.
- Use CDK constructs with clear responsibility boundaries.
- Prefer Lambda for simple workloads.
- Use ECS only when Lambda limits are unsuitable.
- Use Cognito for authentication.
- Treat SAML as an optional enterprise extension.
- Prefer Amazon Bedrock for LLM access unless the target app explicitly requires another provider.
- Use Secrets Manager for external LLM API keys and credentials, not for Bedrock model access.
- Use DynamoDB for app metadata, chat history, job state, and lightweight business data.
- Use S3 for frontend hosting, uploaded files, and generated artifacts.
- Use Secrets Manager for external API keys and credentials.
- Use SQS for asynchronous jobs.
- Use CloudWatch for logs, metrics, and alarms.
- Use KMS encryption for persisted data.
- Use least-privilege IAM.

## Repository Structure

```text
cdk/
  bin/
  lib/
    constructs/
    app-stack.ts
    app-manifest.ts
    stack-input.ts
    create-stacks.ts
apps/
  <app-name>/
    app.manifest.json
```

## App Integration Contract

Every app under `apps/` should have an `app.manifest.json`.

The manifest describes:

- app name
- runtime type: `lambda` or `ecs`
- frontend path, build command, output directory
- backend path and entrypoint
- required AWS capabilities
- required environment variables
- LLM provider choice, preferring Bedrock when requirements allow

Codex should update or create this file when adapting an app.

## Codex Workflow

When asked to "put this app on the CDK template":

1. Inspect the target app under `apps/<app-name>`.
2. Identify frontend framework and backend runtime.
3. Create or update `app.manifest.json`.
4. Connect the app to the appropriate CDK adapter.
5. Add required environment variables to the CDK environment config.
6. Add only necessary IAM permissions.
   - Prefer `permissions.bedrock=true` for AWS-native LLM workloads.
   - Set `permissions.secrets=true` only when the app reads external API keys or credentials.
7. Update deployment scripts if needed.
8. Update README with app-specific deployment instructions.
9. Run typecheck/tests/build where available.

## CDK Rules

- Do not hardcode app-specific values inside constructs.
- Pass app-specific values through typed config or manifest.
- Keep constructs reusable.
- Keep source app code independent from CDK internals.
- Prefer explicit permissions over wildcard permissions.
- Use `RemovalPolicy.RETAIN` for production data resources.
- Use `RemovalPolicy.DESTROY` only for local/dev defaults where explicitly documented.

## Source Reference

This template is inspired by the Gennai Web CDK design, especially:

- Auth construct
- Web hosting construct
- API construct
- Database construct
- Stack input validation
- Environment-specific stack creation
- Team/app separation concept

Do not copy source-specific product behavior unless explicitly needed.
