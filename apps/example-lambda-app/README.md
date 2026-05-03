# example-lambda-app

This is a minimal app used to verify the CDK template.

It includes:

- a Lambda backend at `backend/src/handler.ts`
- a prebuilt static frontend at `frontend/dist/index.html`
- an `app.manifest.json` that connects the app to the CDK adapter

The invoke API accepts:

```json
{
  "inputs": {
    "prompt": "hello"
  }
}
```

It returns:

```json
{
  "outputs": {
    "text": "Received prompt: hello"
  }
}
```
