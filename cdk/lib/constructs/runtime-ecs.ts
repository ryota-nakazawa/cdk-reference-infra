import { Construct } from 'constructs';

export interface RuntimeEcsConstructProps {
  appName: string;
  dockerfile: string;
  port: number;
  healthCheckPath: string;
}

export class RuntimeEcsConstruct extends Construct {
  constructor(scope: Construct, id: string, _props: RuntimeEcsConstructProps) {
    super(scope, id);

    // Placeholder for v2. Keep the contract stable while Lambda is the default runtime.
    // Recommended target: ECS Fargate service behind an internal or public ALB.
  }
}
