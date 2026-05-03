# cdk/AGENTS.md

## CDK Implementation Rules

- Use TypeScript CDK.
- Keep each AWS responsibility in a separate construct.
- Use `zod` for stack input validation.
- Use typed props for all constructs.
- Do not let reusable constructs read app files directly. App file discovery belongs in the AppAdapter layer.
- App-specific deployment behavior should be driven by `app.manifest.json`.
- Prefer AWS managed services over custom operational code.
- Include CloudWatch logs for all Lambda functions.
- Add alarms for critical queues, Lambda errors, and API 5xx where practical.

## Standard Constructs

Expected constructs:

- `SecurityConstruct`
- `AuthConstruct`
- `WebConstruct`
- `ApiConstruct`
- `RuntimeLambdaConstruct`
- `RuntimeEcsConstruct`
- `DataConstruct`
- `StorageConstruct`
- `SecretsConstruct`
- `AsyncConstruct`
- `ObservabilityConstruct`
- `AppAdapterConstruct`

## Production Defaults

Production environments should use:

- KMS encryption
- DynamoDB PITR
- S3 block public access
- CloudFront security headers
- WAF optional but supported
- Secrets Manager for sensitive values
- least-privilege IAM
- retained data resources
