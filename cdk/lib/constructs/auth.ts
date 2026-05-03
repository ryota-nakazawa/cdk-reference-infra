import { Duration } from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import {
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
} from 'aws-cdk-lib/aws-cognito';
import { RoleMappingMatchType } from 'aws-cdk-lib/aws-cognito-identitypool';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export interface AuthConstructProps {
  appName: string;
  reauthenticationDays?: number;
}

export class AuthConstruct extends Construct {
  readonly userPool: cognito.UserPool;
  readonly userPoolClient: cognito.UserPoolClient;
  readonly identityPool: CfnIdentityPool;
  readonly authenticatedRole: iam.Role;
  readonly adminRole: iam.Role;
  readonly userRole: iam.Role;

  constructor(scope: Construct, id: string, props: AuthConstructProps) {
    super(scope, id);

    this.userPool = new cognito.UserPool(this, 'UserPool', {
      selfSignUpEnabled: false,
      signInAliases: { email: true },
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 12,
        requireDigits: true,
        requireLowercase: true,
        requireUppercase: true,
        requireSymbols: true,
      },
      mfa: cognito.Mfa.OPTIONAL,
      mfaSecondFactor: { otp: true, sms: false },
    });

    this.userPoolClient = this.userPool.addClient('WebClient', {
      authFlows: {
        userPassword: true,
        userSrp: true,
      },
      idTokenValidity: Duration.days(1),
      refreshTokenValidity: Duration.days(props.reauthenticationDays ?? 7),
    });

    this.identityPool = new CfnIdentityPool(this, 'IdentityPool', {
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: this.userPoolClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });

    const commonRoleProps = {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': this.identityPool.attrId,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    };

    this.authenticatedRole = new iam.Role(this, 'AuthenticatedRole', commonRoleProps);
    this.adminRole = new iam.Role(this, 'AdminRole', commonRoleProps);
    this.userRole = new iam.Role(this, 'UserRole', commonRoleProps);

    new CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: this.identityPool.attrId,
      roleMappings: {
        cognitoGroups: {
          type: 'Rules',
          identityProvider: `cognito-idp.${this.userPool.stack.region}.amazonaws.com/${this.userPool.userPoolId}:${this.userPoolClient.userPoolClientId}`,
          ambiguousRoleResolution: 'AuthenticatedRole',
          rulesConfiguration: {
            rules: [
              {
                claim: 'cognito:groups',
                value: 'AdminGroup',
                roleArn: this.adminRole.roleArn,
                matchType: RoleMappingMatchType.CONTAINS,
              },
              {
                claim: 'cognito:groups',
                value: 'UserGroup',
                roleArn: this.userRole.roleArn,
                matchType: RoleMappingMatchType.CONTAINS,
              },
            ],
          },
        },
      },
      roles: {
        authenticated: this.authenticatedRole.roleArn,
      },
    });

    this.userPool.addGroup('AdminGroup', {
      groupName: 'AdminGroup',
      precedence: 1,
    });

    this.userPool.addGroup('UserGroup', {
      groupName: 'UserGroup',
      precedence: 2,
    });
  }
}
