import {
  PolicyDocument,
  PolicyStatement,
  Role,
  RoleProps,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

type RoleType = "codepipeline" | "codebuild" | "lambda" | "states" | "events";

// Omit to make them required below
type AuditRoleProps = Omit<
  RoleProps,
  "roleName" | "assumedBy" | "inlinePolicies"
> & {
  name: string;
  type: RoleType;
  statements: {
    actions: string[];
    resources: string[];
  }[];
};

export class AuditRole extends Role {
  /**
   * This is a constructor function that creates an IAM role with specified permissions and policies
   * for auditing purposes.
   * @param scope - The `scope` parameter is an instance of the `Construct` class. It
   * represents the parent construct to which the role will be attached. It provides a context for the
   * role's existence within the AWS CloudFormation stack.
   * @param props - The `props` parameter is an object that contains the following AuditRoleProps
   */
  constructor(scope: Construct, props: AuditRoleProps) {
    const prefix = "iam-de-ves-do-npm-audit";

    const statements = props.statements.map(
      (statement) =>
        new PolicyStatement({
          actions: statement.actions,
          resources: statement.resources,
        }),
    );

    super(scope, `${prefix}-${props.name}-role`, {
      roleName: `${prefix}-${props.name}-role`,
      assumedBy: new ServicePrincipal(`${props.type}.amazonaws.com`),
      managedPolicies:
        props.type === "lambda"
          ? [
              {
                // Allows to write logs to CloudWatch
                managedPolicyArn:
                  "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
              },
            ]
          : [],
      ...props,
      inlinePolicies: {
        [`${prefix}-${props.name}-policy`]: new PolicyDocument({
          statements,
        }),
      },
    });
  }
}
