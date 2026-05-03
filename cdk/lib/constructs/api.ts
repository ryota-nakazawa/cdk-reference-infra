import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export interface ApiConstructProps {
  userPool: cognito.IUserPool;
  invokeFunction: lambda.IFunction;
}

export class ApiConstruct extends Construct {
  readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(this, 'Authorizer', {
      cognitoUserPools: [props.userPool],
    });

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
    invoke.addMethod('POST', new apigateway.LambdaIntegration(props.invokeFunction), {
      authorizationType: apigateway.AuthorizationType.COGNITO,
      authorizer,
    });

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
