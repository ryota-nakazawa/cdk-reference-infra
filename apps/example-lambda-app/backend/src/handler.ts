import type { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

type InvokeRequest = {
  inputs?: Record<string, unknown>;
  sessionId?: string;
};

const json = (statusCode: number, body: unknown): APIGatewayProxyResult => ({
  statusCode,
  headers: {
    'content-type': 'application/json',
    'access-control-allow-origin': '*',
  },
  body: JSON.stringify(body),
});

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  if (!event.body) {
    return json(400, { message: 'Request body is required.' });
  }

  let request: InvokeRequest;
  try {
    request = JSON.parse(event.body) as InvokeRequest;
  } catch {
    return json(400, { message: 'Request body must be valid JSON.' });
  }

  const prompt = String(request.inputs?.prompt ?? '');
  const userSub = event.requestContext.authorizer?.claims?.sub ?? 'unknown';

  return json(200, {
    outputs: {
      text: prompt ? `Received prompt: ${prompt}` : 'No prompt was provided.',
      userId: userSub,
      sessionId: request.sessionId ?? null,
    },
  });
};
