import { IRole } from 'aws-cdk-lib/aws-iam';
import {
	LambdaInvoke,
	LambdaInvokeProps,
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import { Function } from 'sst/constructs';

type LambdaStepProps = Omit<LambdaInvokeProps, 'lambdaFunction'> & {
	name: string;
	prefix: string;
	role: IRole;
	environment?: { [key: string]: string };
};

export class LambdaStep extends LambdaInvoke {
	/**
	 * This function is a constructor for a LambdaStep component in TypeScript.
	 * @param scope - The `scope` parameter is an instance of the `Construct` class. It
	 * represents the parent construct or stack in which the LambdaStep is being defined. It provides a
	 * context for the LambdaStep to be created within.
	 * @param props - The `props` parameter is an object that contains the following LambdaStepProps
	 */
	constructor(scope: Construct, props: LambdaStepProps) {
		const prefix = `lma-ec1-pt-esb${props.prefix}`;
		super(scope, `${props.name}-lambda`, {
			lambdaFunction: new Function(scope, props.name, {
				description: 'Function for the NPM Audit State Machine',
				runtime: 'nodejs18.x',
				functionName: `${prefix}-${props.name}`,
				handler: `packages/functions/src/${props.name}.handler`,
				role: props.role,
				environment: props.environment,
			}),
			...props,
		});
	}
}
