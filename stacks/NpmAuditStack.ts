import { Rule, Schedule } from 'aws-cdk-lib/aws-events';
import { SfnStateMachine } from 'aws-cdk-lib/aws-events-targets';
import { PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import {
	InputType,
	IntegrationPattern,
	JsonPath,
	Parallel,
	StateMachine,
	TaskInput,
} from 'aws-cdk-lib/aws-stepfunctions';
import { SnsPublish } from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { RemovalPolicy } from 'aws-cdk-lib/core';
import { Construct } from 'constructs';
import { Bucket, Function, Stack, StackProps } from 'sst/constructs';
import { AuditRole } from './constructs/AuditRole';
import { LambdaStep } from './constructs/LambdaStep';

type NpmAuditStackProps = StackProps & {
	stage: string;
};

export class NpmAuditStack extends Stack {
	constructor(scope: Construct, id: string, props: NpmAuditStackProps) {
		super(scope, id, props);

		const short = props.stage === 'cfo-ec1' ? 'd' : 'b';
		const PROJECT_NAME = `npm-audit-${short}`;
		const kmsKey =
			'arn:aws:kms:eu-central-1:403591856115:key/c10c35f6-93a9-459e-8b55-d70e0b631256';
		const doReaderRole = 'arn:aws:iam::403591856115:role/do-reader-role';
		const snsEmailSubscriber =
			'de.imt.digitaloffice.int.groups+audit@veolia.com';

		const buildSpecBucket = new Bucket(this, 'BuildSpecBucket', {
			name: `s3-ec1-pt-${PROJECT_NAME}-${this.account}`,
			cdk: {
				bucket: {
					versioned: true,
					encryptionKey: Key.fromKeyArn(this, 'CrossKmsKey', kmsKey),
					removalPolicy: RemovalPolicy.DESTROY,
				},
			},
		});

		const assumeRolePolicy = new PolicyStatement({
			actions: ['sts:AssumeRole'],
			resources: [doReaderRole],
		});

		const listReposLambdaRole = new AuditRole(this, {
			name: 'list-repos',
			type: 'lambda',
			statements: [
				{
					actions: ['codecommit:ListRepositories'],
					resources: ['*'], // We could limit it by namespaces
				},
				assumeRolePolicy,
			],
		});

		const createPipelineBuildProjectsLambdaRole = new AuditRole(this, {
			name: 'create-pipeline-build-projects',
			type: 'lambda',
			statements: [
				{
					actions: [
						'codepipeline:CreatePipeline',
						'codepipeline:PutJobSuccessResult',
						'codepipeline:PutJobFailureResult',
					],
					resources: [`arn:aws:codepipeline:${this.region}:${this.account}:*`],
				},
				{
					actions: ['codebuild:CreateProject', 'codebuild:UpdateProject'],
					resources: [
						`arn:aws:codebuild:${this.region}:${this.account}:project/*`,
					],
				},
				{
					actions: ['iam:PassRole'],
					resources: [`arn:aws:iam::${this.account}:role/*`, doReaderRole],
				},
			],
		});

		const sendTokenLambdaRole = new AuditRole(this, {
			name: 'send-success',
			type: 'lambda',
			statements: [
				{
					actions: ['states:sendTaskSuccess', 'states:sendTaskFailure'],
					resources: [
						`arn:aws:states:${this.region}:${this.account}:stateMachine:*-${PROJECT_NAME}`,
					],
				},
				{
					actions: [
						'codepipeline:PutJobSuccessResult',
						'codepipeline:PutJobFailureResult',
					],
					resources: ['*'],
				},
			],
		});

		const sendToken = new Function(this, 'send-token', {
			functionName: `lma-ec1-pt-${PROJECT_NAME}-send-token`,
			handler: 'packages/functions/src/send-token.handler',
			runtime: 'nodejs18.x',
			role: sendTokenLambdaRole,
		});

		const codePipelineRole = new AuditRole(this, {
			name: 'codepipeline-service',
			type: 'codepipeline',
			statements: [
				{
					actions: [
						'logs:CreateLogGroup',
						'logs:CreateLogStream',
						'logs:PutLogEvents',
					],
					resources: [
						`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/codebuild/*`,
					],
				},
				{
					actions: ['codebuild:StartBuild', 'codebuild:BatchGetBuilds'],
					resources: [
						`arn:aws:codebuild:${this.region}:${this.account}:project/*`,
					],
				},
				{
					actions: ['s3:GetObject', 's3:ListBucket', 's3:PutObject'],
					resources: [
						buildSpecBucket.bucketArn,
						`${buildSpecBucket.bucketArn}/*`,
					],
				},
				{
					actions: ['lambda:InvokeFunction'],
					resources: [sendToken.functionArn],
				},
				assumeRolePolicy,
			],
		});

		const codebuildRole = new AuditRole(this, {
			name: 'codebuild-service',
			type: 'codebuild',
			statements: [
				{
					actions: [
						'logs:CreateLogGroup',
						'logs:CreateLogStream',
						'logs:PutLogEvents',
					],
					resources: [
						`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/codebuild/*`,
					],
				},
				{
					actions: [
						's3:GetObject',
						's3:GetObjectAcl',
						's3:ListBucket',
						's3:PutObject',
						's3:PutObjectAcl',
					],
					resources: [
						buildSpecBucket.bucketArn,
						`${buildSpecBucket.bucketArn}/*`,
					],
				},
				{
					actions: ['sts:AssumeRole'],
					resources: [`arn:aws:iam::${this.account}:role/*`],
				},
				{
					actions: ['kms:Decrypt', 'kms:DescribeKey', 'kms:Encrypt'],
					resources: [kmsKey],
				},
			],
		});

		buildSpecBucket.cdk.bucket.addToResourcePolicy(
			new PolicyStatement({
				actions: ['s3:PutObject', 's3:PutObjectAcl'],
				resources: [
					`${buildSpecBucket.bucketArn}/*`,
					buildSpecBucket.bucketArn,
				],
				principals: [
					codePipelineRole,
					codebuildRole,
					Role.fromRoleArn(this, 'DoReaderRole', doReaderRole),
				],
			}),
		);

		const listRepositories = new LambdaStep(this, {
			name: 'list-repositories',
			prefix: PROJECT_NAME,
			role: listReposLambdaRole,
			resultPath: '$.ListRepository.Result',
			environment: {
				BUILDSPEC_BUCKET: buildSpecBucket.bucketArn,
			},
		});

		const deleteRole = new AuditRole(this, {
			name: 'delete-pipeline-build-projects',
			type: 'lambda',
			statements: [
				{
					actions: ['codebuild:DeleteProject'],
					resources: [
						`arn:aws:codebuild:${this.region}:${this.account}:project/*`,
					],
				},
				{
					actions: ['codepipeline:DeletePipeline'],
					resources: [
						`arn:aws:codepipeline:${this.region}:${this.account}:NPM-Audit*`,
					],
				},
			],
		});

		const deletePipelineBuildProjects = new LambdaStep(this, {
			name: 'delete-pipeline-build-projects',
			prefix: PROJECT_NAME,
			role: deleteRole,
			inputPath: '$.repositories',
		});

		const createPipelineAndCodebuildProjects = new LambdaStep(this, {
			name: 'create-pipeline-build-projects',
			prefix: PROJECT_NAME,
			role: createPipelineBuildProjectsLambdaRole,
			inputPath: '$.ListRepository.Result',
			integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
			payload: TaskInput.fromObject({
				token: JsonPath.taskToken,
				repositories: JsonPath.stringAt('$.Payload'),
			}),
			environment: {
				CODEPIPELINE_SERVICE_ROLE_ARN: codePipelineRole.roleArn,
				BUILDSPEC_BUCKET: buildSpecBucket.bucketName,
				CODEBUILD_SERVICE_ROLE_ARN: codebuildRole.roleArn,
				KMS_KEY_ID: kmsKey,
				SEND_SUCCESS_LAMBDA: sendToken.functionName,
			},
			resultPath: '$.TaskResult',
			outputPath: '$.ListRepository.Result.Payload',
		});

		const parseAuditResultsLambdaRole = new AuditRole(this, {
			name: 'parse-reports',
			type: 'lambda',
			statements: [
				{
					actions: ['s3:GetObject', 's3:ListBucket'],
					resources: [
						buildSpecBucket.bucketArn,
						`${buildSpecBucket.bucketArn}/*`,
					],
				},
			],
		});

		const parseAuditResults = new LambdaStep(this, {
			name: 'parse-reports',
			prefix: PROJECT_NAME,
			role: parseAuditResultsLambdaRole,
			inputPath: '$',
			environment: {
				BUILDSPEC_BUCKET: buildSpecBucket.bucketName,
			},
			outputPath: '$.Payload',
		});

		const topic = new Topic(this, 'SnsTopic', {
			topicName: `sns-ec1-pt-do-${PROJECT_NAME}`,
			displayName: 'npm Audit Report',
		});

		topic.addSubscription(new EmailSubscription(snsEmailSubscriber));

		const sendSns = new SnsPublish(this, 'SnsPublish', {
			topic,
			message: {
				type: InputType.OBJECT,
				value: JsonPath.stringAt('$.report'),
			},
			resultPath: '$',
			outputPath: '$',
		});

		const stateMachineRole = new AuditRole(this, {
			name: 'statemachine',
			statements: [
				{
					actions: ['lambda:InvokeFunction'],
					resources: [
						`arn:aws:lambda:${this.region}:${this.account}:function:lma-ec1-de-ves-do-npm-audit-*`,
					],
				},
				{
					actions: ['sns:Publish'],
					resources: [topic.topicArn],
				},
			],
			type: 'states',
		});

		const parallel = new Parallel(this, 'Send SNS and Delete Pipelines');
		parallel.branch(sendSns);
		parallel.branch(deletePipelineBuildProjects);

		const stateMachine = new StateMachine(this, 'NpmAuditStateMachine', {
			role: stateMachineRole,
			stateMachineName: `stm-ec1-pt-do-${PROJECT_NAME}`,
			definition: listRepositories
				.next(createPipelineAndCodebuildProjects)
				.next(parseAuditResults)
				.next(parallel),
		});

		const npmAuditEventRole = new AuditRole(this, {
			name: 'cron-event',
			statements: [
				{
					actions: ['states:StartExecution'],
					resources: [stateMachine.stateMachineArn],
				},
			],
			type: 'events',
		});

		new Rule(this, 'NpmScheduledEvent', {
			ruleName: 'evt-ec1-de-ves-do-npm-audit-scheduled-event',
			description: 'Scheduled Cron to run NPM Audit',
			schedule: Schedule.cron({ weekDay: 'MON', hour: '12', minute: '0' }),
			targets: [
				new SfnStateMachine(stateMachine, {
					role: npmAuditEventRole,
				}),
			],
		});
	}
}
