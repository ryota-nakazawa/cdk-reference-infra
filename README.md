# genai-app-infra-template

to B 向け生成AIアプリを、標準化された CDK 構成に載せるためのテンプレートです。

源内 Web CDK の設計を参考にしつつ、源内固有の機能は外し、任意のAIアプリを `apps/` 配下に置いてデプロイ基盤へ接続できる形にしています。

## 目的

```text
1. CDKを標準テンプレとして整える
2. アプリは別リポジトリ or apps/ 配下で自由に作る
3. デプロイ時にCDKへ接続する
```

想定構成:

```text
genai-app-infra-template/
├── cdk/
│   ├── bin/
│   ├── lib/
│   │   ├── constructs/
│   │   ├── app-stack.ts
│   │   ├── app-manifest.ts
│   │   ├── create-stacks.ts
│   │   └── stack-input.ts
│   └── cdk.json
├── apps/
│   └── example-lambda-app/
│       ├── app.manifest.json
│       ├── backend/
│       └── frontend/
└── AGENTS.md
```

## 標準アーキテクチャ

```text
Frontend: S3 + CloudFront
Auth: Cognito User Pool + Identity Pool
Runtime: API Gateway + Lambda
ECS: future extension for heavy workloads
LLM: Amazon Bedrock first, external LLM APIs optional
DB: DynamoDB
Files: S3
Secrets: Secrets Manager for external API keys and credentials
Async: SQS + DLQ
Logs/Ops: CloudWatch
Security: KMS + WAF optional + rate limit optional + security headers + least-privilege IAM
Cost: AWS Budgets optional
```

## LLMプロバイダ方針

to B 向けの標準テンプレートとしては、AWS内のIAM、監査、ログ、コスト管理と統合しやすい Amazon Bedrock を第一候補にします。

```text
Default: Amazon Bedrock
Optional: OpenAI / Gemini / Anthropic API などの外部LLM
```

Bedrockを使うアプリでは、Lambdaに `bedrock:InvokeModel` / `bedrock:InvokeModelWithResponseStream` 権限を付与します。外部LLMを使う場合は、APIキーをSecrets Managerに保存し、Lambdaには必要なSecretの読み取り権限だけを付与します。

## 源内CDKから参考にしている点

- Construct単位で責務を分ける
- `stack-input.ts` で環境値を型検証する
- Cognito Group と IAM Role Mapping で権限を分ける
- CloudFront + S3 でフロントを配信する
- API Gateway + Lambda で生成AIアプリのAPIを公開する
- DynamoDB / S3 / Secrets Manager / SQS / CloudWatch を標準部品として扱う
- アプリ本体とインフラを疎結合にする

## アプリ接続契約

各アプリは `apps/<app-name>/app.manifest.json` を持ちます。

例:

```json
{
  "name": "example-lambda-app",
  "type": "lambda",
  "frontend": {
    "path": "frontend",
    "buildCommand": "npm ci && npm run build",
    "outputDir": "dist"
  },
  "backend": {
    "path": "backend",
    "entry": "src/handler.ts",
    "handler": "handler",
    "runtime": "nodejs22.x",
    "timeoutSeconds": 60,
    "memorySizeMb": 512,
    "environment": {
      "MODEL_PROVIDER": "bedrock",
      "BEDROCK_MODEL_ID": "replace-with-bedrock-model-id"
    }
  },
  "permissions": {
    "bedrock": true,
    "dynamodb": true,
    "s3": true,
    "secrets": false,
    "sqs": true
  }
}
```

Codexには次のように依頼する想定です。

```text
apps/my-ai-app を解析して、このCDKテンプレートに載せてください。

要件:
- app.manifest.json を作成/更新する
- Lambdaで動く場合は RuntimeLambdaConstruct に接続する
- Dockerfileがある場合は ECS拡張候補として整理する
- 必要な環境変数を manifest に集約する
- 特に指定がなければ Bedrock を第一候補にする
- Bedrock/S3/DynamoDB/Secrets/SQS の権限は必要最小限にする
- OpenAI/Gemini等の外部LLMを使う場合のみ Secrets Manager 権限を付与する
- README とデプロイ手順を更新する
```

## 初期セットアップ

```bash
npm run cdk:install
npm run cdk:build
npm run cdk:synth
```

デフォルトでは `apps/example-lambda-app` を読み込みます。

別アプリを使う場合:

```bash
npm run cdk:synth -- -c appName=my-ai-app
```

## デプロイ

```bash
npm run cdk:deploy -- -c appName=example-lambda-app -c appEnv=dev
```

本番相当ではデータ保持を優先してください。

```bash
npm run cdk:deploy -- -c appName=my-ai-app -c appEnv=prod -c removalPolicy=RETAIN
```

## WAF / Rate Limit / Cost Alarm

API Gateway にRegional WAFを関連付け、アプリの実行APIへのIP単位レート制限、AWS Managed Rules、任意のIP/国制限を有効化できます。

このテンプレートでは、アプリを最小変更でLambdaバックエンドに接続するため、デフォルトの実行APIとして `/invoke` を作成します。`/invoke` は今回のサンプルアプリ固有のAPIではなく、Codexでアプリを載せ替えやすくするための初期規約です。本番アプリで `/chat`、`/files`、`/documents` のような業務ドメイン別APIが必要な場合は、manifest と API Construct を拡張して個別パスを追加してください。

```bash
npm run cdk:deploy -- \
  -c appName=my-ai-app \
  -c enableWaf=true \
  -c rateLimitPer5Min=300
```

Rate Limitの動作確認時は、一時的に低い値を指定できます。検証後は実運用向けの値に戻してください。

```bash
npm run cdk:deploy -- \
  -c appName=my-ai-app \
  -c enableWaf=true \
  -c rateLimitPer5Min=10
```

任意で国制限やIP制限も指定できます。

```bash
npm run cdk:deploy -- \
  -c appName=my-ai-app \
  -c enableWaf=true \
  -c allowedCountryCodes='["JP"]' \
  -c allowedIpV4AddressRanges='["203.0.113.10/32"]'
```

AWS Budgets による月額コスト通知も作成できます。

```bash
npm run cdk:deploy -- \
  -c appName=my-ai-app \
  -c enableBudget=true \
  -c monthlyBudgetLimitUsd=10 \
  -c budgetAlertEmail=you@example.com
```

`enableBudget=true` の場合、`budgetAlertEmail` は必須です。

## 現在の対応範囲

対応済み:

- Lambda backend
- static frontend hosting
- Cognito auth
- API Gateway
- DynamoDB
- S3 artifacts
- Secrets Manager
- Bedrock invoke permissions
- SQS
- CloudWatch alarms
- Regional WAF for API Gateway
- standard runtime API rate limit
- AWS Budgets cost notifications
- KMS encryption

拡張枠:

- ECS/Fargate runtime
- SAML
- CloudFront global WAF stack
- Step Functions
- Bedrock Knowledge Bases / OpenSearch
- multi-tenant app registry
