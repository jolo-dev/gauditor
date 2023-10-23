import { createPipeline, stage } from '../lib/codepipeline';
import { IEvent } from '../lib/types';

/**
 * The above function is an async handler that connects to CodeCommit, CodeBuild projects, and Step
 * Functions to create a pipeline for NPM audit.
 * @param event - The `event` parameter is an object that contains the input data for the
 * handler function. It is of type `IEvent`, which is not defined in the code snippet you provided.
 * @returns an object with a property "repositories" which contains the value of the
 * "event.repositories" parameter.
 */
export async function handler(event: IEvent) {
	try {
		console.log(event);

		if (!Array.isArray(event.repositories)) {
			throw new Error('Invalid input: repositories must be an array');
		}

		if (!event.repositories.every((repo) => typeof repo === 'string')) {
			throw new Error(
				'Invalid input: repositories must be an array of strings',
			);
		}

		/* 1. Stage: Connect to Codecommit */
		const sourceStages = await stage(event.repositories, 'Source');
		/*******************************************/

		/* 2. Stage: Connect to CodeBuild Projects */
		const codeBuildStages = await stage(event.repositories, 'Build');
		/******************************************/

		/* 3. Stage: Send Task Success to Step Functions */
		const lambdaInvokeSuccessStage = await stage(event.repositories, 'Invoke', {
			UserParameters: JSON.stringify(event.token),
		});
		/******************************************/

		/*********** Create Pipeline **************/
		await createPipeline('NPM-Audit-Pipeline', [
			sourceStages,
			codeBuildStages,
			lambdaInvokeSuccessStage,
		]);

		// But for Step Functions we are passing the repositories further
		return {
			repositories: event.repositories,
		};
	} catch (err) {
		console.error(err);
		throw err;
	}
}
