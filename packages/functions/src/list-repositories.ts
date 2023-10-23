import { listRepositories } from '../lib/codecommit';

/**
 * The function attempts to list repositories using a specific IAM role and throws an error if it
 * fails.
 * @returns the result of the `listRepositories` function call.
 */
export async function handler() {
	try {
		return await listRepositories(
			'arn:aws:iam::403591856115:role/do-reader-role',
		);
	} catch (err) {
		console.error(err);
		throw new Error(
			`Error listing repositories failed with error: ${err as string}`,
		);
	}
}
