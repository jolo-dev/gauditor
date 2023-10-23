import { deleteProject } from '../lib/codebuild';
import { deletePipeline } from '../lib/codepipeline';

/**
 * The above function is an async handler that deletes projects and a pipeline based on the given
 * event.
 * @param event - An array of strings representing repository names.
 */
export async function handler(event: string[]) {
	try {
		Promise.allSettled(
			event.map(async (repo: string) => {
				const repoName = repo.replaceAll('.', '-');
				await deleteProject(repoName);
			}),
		);

		await deletePipeline('NPM-Audit-Pipeline');
	} catch (err) {
		console.error(err);
		throw err;
	}
}
