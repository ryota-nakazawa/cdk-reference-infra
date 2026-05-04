import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';

export interface CostConstructProps {
  appName: string;
  appEnv: string;
  monthlyBudgetLimitUsd: number;
  alertEmail: string;
}

export class CostConstruct extends Construct {
  constructor(scope: Construct, id: string, props: CostConstructProps) {
    super(scope, id);

    const subscriber: budgets.CfnBudget.SubscriberProperty = {
      address: props.alertEmail,
      subscriptionType: 'EMAIL',
    };

    new budgets.CfnBudget(this, 'MonthlyCostBudget', {
      budget: {
        budgetName: `${props.appName}-${props.appEnv}-monthly-cost`,
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: props.monthlyBudgetLimitUsd,
          unit: 'USD',
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'ACTUAL',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [subscriber],
        },
        {
          notification: {
            comparisonOperator: 'GREATER_THAN',
            notificationType: 'ACTUAL',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [subscriber],
        },
      ],
    });
  }
}
