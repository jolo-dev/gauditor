import {
	ActionDeclaration,
	CodePipelineClient,
	CreatePipelineCommand,
	CreatePipelineCommandOutput,
	DeletePipelineCommand,
	PutJobFailureResultCommand,
	PutJobSuccessResultCommand,
	StageDeclaration,
} from '@aws-sdk/client-codepipeline';
import { createProject } from './codebuild';
import { throwExpression } from './utilty';

type ActionType = 'Source' | 'Build' | 'Invoke';

enum Provider {
	Source = 'CodeCommit',
	Build = 'CodeBuild',
	Invoke = 'Lambda',
}

type Configuration = {
	[P in ActionType]: P extends 'Source'
		? {
				RepositoryName: string;
				BranchName: string;
				PollForSourceChanges: 'false'; // otherwise it would run twice
		  }
		: P extends 'Build'
		? {
				ProjectName: string;
		  }
		: {
				FunctionName: string;
				UserParameters: string;
		  };
};

const codepipelineClient = new CodePipelineClient({});

/**
 * The function `actions` takes in an array of repository names, an action type, and an optional
 * configuration, and returns an array of action declarations based on the action type.
 * @param repositories - An array of strings representing the names of repositories.
 * @param actionType - The `actionType` parameter is a string that represents the type of action to
 * be performed. It can have one of the following values: "Invoke", "Source", or "Build".
 * @param [config] - The `config` parameter is an optional object that contains additional
 * configuration options for the action. It is a partial object of the `Configuration[T]` type, where
 * `T` is the `actionType` parameter. The `Configuration` type is a mapping of action types to their
 * respective configuration options
 * @returns The function `actions` returns a promise that resolves to an array of `ActionDeclaration`
 * objects.
 */
export const actions = async <T extends ActionType>(
	repositories: string[],
	actionType: T,
	config?: Partial<Configuration[T]>,
): Promise<ActionDeclaration[]> => {
	if (actionType === 'Invoke') {
		// For the Success Lambda we only need one
		return [
			{
				name: 'SendTaskSuccess',
				actionTypeId: {
					category: actionType,
					owner: 'AWS',
					provider: Provider[actionType],
					version: '1',
				},
				configuration: {
					FunctionName:
						process.env.SEND_SUCCESS_LAMBDA ??
						throwExpression('SEND_SUCCESS_LAMBDA is missing'),
					...config,
				},
				outputArtifacts: [{ name: 'LambdaInvoke' }],
			},
		];
	}
	return await Promise.all(
		repositories.map(async (repo) => {
			const repoName = repo.replaceAll('.', '-');
			const configuration =
				actionType === 'Source'
					? {
							RepositoryName: repo,
							BranchName: 'develop',
							PollForSourceChanges: 'false',
							...config,
					  }
					: {
							ProjectName: await createProject(repoName),
							...config,
					  };
			return {
				name: `${repoName}-${actionType}`,
				actionTypeId: {
					category: actionType,
					owner: 'AWS',
					provider: Provider[actionType],
					version: '1',
				},
				configuration,
				inputArtifacts:
					actionType === 'Build' ? [{ name: `${repoName}-Source` }] : undefined,
				outputArtifacts: [{ name: `${repoName}-${actionType}` }],
				roleArn:
					actionType === 'Source'
						? 'arn:aws:iam::403591856115:role/do-reader-role'
						: undefined,
			};
		}),
	);
};

/**
 * The `stage` function takes in a list of repositories, an action type, and an optional configuration,
 * and returns a stage declaration object with the name of the action type and a list of actions.
 * @param repositories - An array of strings representing the repositories to perform the
 * action on.
 * @param actionType - The `actionType` parameter is a generic type `T` that extends the
 * `ActionType` type. It represents the type of action that will be performed.
 * @param [configuration] - The `configuration` parameter is an optional parameter of type
 * `Partial<Configuration[T]>`. It allows you to provide additional configuration options specific to
 * the `actionType` being passed in. The `Partial` type allows you to provide only a subset of the
 * properties defined in `Configuration[T]`, making
 * @returns a Promise that resolves to a StageDeclaration object.
 */
export const stage = async <T extends ActionType>(
	repositories: string[],
	actionType: T,
	configuration?: Partial<Configuration[T]>,
): Promise<StageDeclaration> => {
	return {
		name: actionType,
		actions: await actions<T>(repositories, actionType, configuration),
	};
};

/**
 * The function `createPipeline` creates a pipeline in AWS CodePipeline with the given name and stages.
 * @param name - The name of the pipeline to be created. It is a string value.
 * @param stages - The `stages` parameter is an array of `StageDeclaration`
 * objects. Each `StageDeclaration` object represents a stage in the pipeline and contains the
 * following properties:
 * @returns a Promise that resolves to a CreatePipelineCommandOutput object.
 */
export async function createPipeline(
	name: string,
	stages: StageDeclaration[],
): Promise<CreatePipelineCommandOutput> {
	try {
		if (stages.length === 0) throw new Error('No stages provided');

		const serviceRole =
			process.env.CODEPIPELINE_SERVICE_ROLE_ARN ??
			throwExpression('CODEPIPELINE_SERVICE_ROLE_ARN is not defined');
		const bucket =
			process.env.BUILDSPEC_BUCKET ??
			throwExpression('BUILDSPEC_BUCKET is not defined');
		const kmsKey =
			process.env.KMS_KEY_ID ?? throwExpression('KMS_KEY_ID is not defined');

		const pipelineCreateCommand = new CreatePipelineCommand({
			pipeline: {
				name,
				roleArn: serviceRole,
				artifactStore: {
					location: bucket,
					type: 'S3',
					encryptionKey: {
						id: kmsKey,
						type: 'KMS',
					},
				},
				stages,
			},
		});

		const pipeline = await codepipelineClient.send(pipelineCreateCommand);
		if (!pipeline.pipeline) throw new Error('Error creating pipeline');
		return pipeline;
	} catch (error) {
		console.error(error);
		throw error;
	}
}

/**
 * The function `deletePipeline` is an asynchronous function that deletes a pipeline using the AWS
 * CodePipeline service.
 * @param name - The `name` parameter is a string that represents the name of the pipeline
 * that you want to delete.
 */
export async function deletePipeline(name: string) {
	try {
		const deletePipelineCommand = new DeletePipelineCommand({ name });
		const response = await codepipelineClient.send(deletePipelineCommand);
		if (response.$metadata.httpStatusCode !== 200) {
			throw Error(`Failed to delete ${name}`);
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
}

/**
 * The function `sendJobResult` sends the result of a job to a code pipeline, either indicating success
 * or failure.
 * @param jobId - A string representing the unique identifier of the job.
 * @param success - A boolean value indicating whether the job was successful or not.
 */
export const sendJobResult = async (jobId: string, success: boolean) => {
	try {
		if (!jobId) throw new Error('No jobId provided');
		const command = success
			? new PutJobSuccessResultCommand({ jobId })
			: new PutJobFailureResultCommand({
					jobId,
					failureDetails: {
						message: 'Failed to send task success',
						type: 'JobFailed',
						externalExecutionId: jobId,
					},
			  });
		// @ts-ignore <Because Typescript get mixed up about Success or Failure
		await codepipelineClient.send(command);
	} catch (error) {
		console.error(error);
		throw error;
	}
};
