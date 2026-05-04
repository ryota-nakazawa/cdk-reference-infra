# apps/AGENTS.md

## App Rules

Apps under this directory should remain portable.

Do not couple app business logic directly to CDK internals.

For enterprise GenAI apps, prefer Amazon Bedrock as the default LLM provider when the app requirements do not mandate OpenAI, Gemini, or another external API. Use Secrets Manager only for external provider API keys or other credentials.

Each app should expose one of the supported backend forms:

- Lambda handler
- Dockerized HTTP service for ECS
- Static frontend only
- API-only service

Each app should define or allow Codex to generate:

- `app.manifest.json`
- `.env.example`
- local development instructions
- deployment notes

## Standard Invoke Shape

For simple GenAI apps, prefer this API shape:

```http
POST /invoke
Content-Type: application/json
Authorization: Bearer <token> or x-api-key
```

```json
{
  "inputs": {},
  "sessionId": "optional"
}
```

Response:

```json
{
  "outputs": {}
}
```
