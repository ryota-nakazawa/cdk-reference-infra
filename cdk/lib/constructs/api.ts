import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ApiConstructProps {
  userPool: cognito.IUserPool;
  invokeFunction: lambda.IFunction;
  auth: 'cognito' | 'none';
}

export class ApiConstruct extends Construct {
  readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    this.api = new apigateway.RestApi(this, 'Api', {
      deployOptions: {
        stageName: 'api',
        metricsEnabled: true,
        tracingEnabled: true,
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const invoke = this.api.root.addResource('invoke');
    const authorizer =
      props.auth === 'cognito'
        ? new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
            cognitoUserPools: [props.userPool],
          })
        : undefined;

    invoke.addMethod(
      'POST',
      new apigateway.LambdaIntegration(props.invokeFunction, {
        contentHandling: apigateway.ContentHandling.CONVERT_TO_BINARY,
      }),
      props.auth === 'cognito'
        ? {
            authorizationType: apigateway.AuthorizationType.COGNITO,
            authorizer,
          }
        : {
            authorizationType: apigateway.AuthorizationType.NONE,
          },
    );

    this.api.addGatewayResponse('Default4xx', {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders: { 'Access-Control-Allow-Origin': "'*'" },
    });

    this.api.addGatewayResponse('Default5xx', {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders: { 'Access-Control-Allow-Origin': "'*'" },
    });
  }
}
