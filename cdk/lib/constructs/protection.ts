import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as wafv2 from 'aws-cdk-lib/aws-wafv2';
import { Construct } from 'constructs';

export interface ProtectionConstructProps {
  appName: string;
  appEnv: string;
  api: apigateway.RestApi;
  allowedIpV4AddressRanges: string[];
  allowedIpV6AddressRanges: string[];
  allowedCountryCodes: string[];
  rateLimitPer5Min: number;
}

export class ProtectionConstruct extends Construct {
  readonly webAcl: wafv2.CfnWebACL;

  constructor(scope: Construct, id: string, props: ProtectionConstructProps) {
    super(scope, id);

    const rules: wafv2.CfnWebACL.RuleProperty[] = [];
    let priority = 0;

    if (props.allowedIpV4AddressRanges.length > 0 || props.allowedIpV6AddressRanges.length > 0) {
      const ipSetStatements: wafv2.CfnWebACL.StatementProperty[] = [];

      if (props.allowedIpV4AddressRanges.length > 0) {
        const ipSet = new wafv2.CfnIPSet(this, 'AllowedIpv4Set', {
          addresses: props.allowedIpV4AddressRanges,
          ipAddressVersion: 'IPV4',
          scope: 'REGIONAL',
        });
        ipSetStatements.push({ ipSetReferenceStatement: { arn: ipSet.attrArn } });
      }

      if (props.allowedIpV6AddressRanges.length > 0) {
        const ipSet = new wafv2.CfnIPSet(this, 'AllowedIpv6Set', {
          addresses: props.allowedIpV6AddressRanges,
          ipAddressVersion: 'IPV6',
          scope: 'REGIONAL',
        });
        ipSetStatements.push({ ipSetReferenceStatement: { arn: ipSet.attrArn } });
      }

      rules.push({
        name: 'BlockRequestsOutsideAllowedIpRanges',
        priority: priority++,
        action: { block: {} },
        statement: {
          notStatement: {
            statement:
              ipSetStatements.length === 1
                ? ipSetStatements[0]
                : { orStatement: { statements: ipSetStatements } },
          },
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'BlockRequestsOutsideAllowedIpRanges',
          sampledRequestsEnabled: true,
        },
      });
    }

    if (props.allowedCountryCodes.length > 0) {
      rules.push({
        name: 'BlockRequestsOutsideAllowedCountries',
        priority: priority++,
        action: { block: {} },
        statement: {
          notStatement: {
            statement: {
              geoMatchStatement: {
                countryCodes: props.allowedCountryCodes,
              },
            },
          },
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'BlockRequestsOutsideAllowedCountries',
          sampledRequestsEnabled: true,
        },
      });
    }

    rules.push(
      {
        name: 'RateLimitInvokeByIp',
        priority: priority++,
        action: { block: {} },
        statement: {
          rateBasedStatement: {
            aggregateKeyType: 'IP',
            limit: props.rateLimitPer5Min,
            scopeDownStatement: {
              byteMatchStatement: {
                fieldToMatch: { uriPath: {} },
                positionalConstraint: 'ENDS_WITH',
                searchString: '/invoke',
                textTransformations: [{ priority: 0, type: 'NONE' }],
              },
            },
          },
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'RateLimitInvokeByIp',
          sampledRequestsEnabled: true,
        },
      },
      {
        name: 'AWSManagedRulesCommonRuleSet',
        priority: priority++,
        overrideAction: { none: {} },
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesCommonRuleSet',
            vendorName: 'AWS',
          },
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'AWSManagedRulesCommonRuleSet',
          sampledRequestsEnabled: true,
        },
      },
      {
        name: 'AWSManagedRulesKnownBadInputsRuleSet',
        priority: priority++,
        overrideAction: { none: {} },
        statement: {
          managedRuleGroupStatement: {
            name: 'AWSManagedRulesKnownBadInputsRuleSet',
            vendorName: 'AWS',
          },
        },
        visibilityConfig: {
          cloudWatchMetricsEnabled: true,
          metricName: 'AWSManagedRulesKnownBadInputsRuleSet',
          sampledRequestsEnabled: true,
        },
      },
    );

    this.webAcl = new wafv2.CfnWebACL(this, 'ApiWebAcl', {
      name: `${props.appName}-${props.appEnv}-api-web-acl`,
      scope: 'REGIONAL',
      defaultAction: { allow: {} },
      rules,
      visibilityConfig: {
        cloudWatchMetricsEnabled: true,
        metricName: `${props.appName}-${props.appEnv}-api-web-acl`,
        sampledRequestsEnabled: true,
      },
    });

    new wafv2.CfnWebACLAssociation(this, 'ApiWebAclAssociation', {
      resourceArn: props.api.deploymentStage.stageArn,
      webAclArn: this.webAcl.attrArn,
    });
  }
}
