# Architecture

This template is a source-inspired, product-neutral CDK reference for enterprise GenAI apps.

The base architecture is:

```text
Frontend
  S3 + CloudFront

Auth
  Cognito User Pool
  Cognito Identity Pool
  Admin/User role mapping
  SAML as a future extension

Runtime
  API Gateway + Lambda
  ECS reserved for long-running or dependency-heavy workloads

Data
  DynamoDB with TTL, KMS encryption, and PITR

Files
  S3 artifacts bucket

Secrets
  Secrets Manager

Async
  SQS + DLQ

Observability
  CloudWatch logs, metrics, and alarms
```

## Source-Inspired Design

This template follows the same architectural direction as the Gennai Web CDK:

- responsibility-oriented constructs
- typed environment input validation
- Cognito-based authentication and role mapping
- CloudFront + S3 web hosting with security headers
- API Gateway + Lambda runtime layer
- DynamoDB and S3 as managed application state
- Secrets Manager for sensitive app values
- CloudWatch-first operations

It intentionally does not include product-specific Gennai Web behavior.
