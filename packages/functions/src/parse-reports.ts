import { getReportByKey } from '../lib/s3';
import { IAuditReport } from '../lib/types';

/**
 * The `handler` function takes an array of repository names, retrieves audit reports for each
 * repository, creates an HTML table from the reports, and returns the reports and the original
 * repository names.
 * @param repositories - An array of strings representing the names of repositories.
 * @returns an object with two properties: "report" and "repositories". The "report" property contains
 * an array of audit reports for each repository, and the "repositories" property contains the original
 * array of repository names.
 */
export async function handler(repositories: string[]) {
	try {
		const reports = await Promise.all(
			repositories.map(async (repo) => {
				const repoName = `${repo.replaceAll('.', '-')}-audit-report.json`;

				// Read the audit reports from S3
				const body: IAuditReport = JSON.parse(await getReportByKey(repoName));
				if (body.vulnerabilities) {
					return `${repoName}- High: ${body.metadata.vulnerabilities.high} and Critical: ${body.metadata.vulnerabilities.critical}`;
				}
			}),
		);

		// Return the message value and the repositories inside the sfn
		return {
			report: `Following packages have high or critical vulnerabilities:\n${reports.join(
				'\n',
			)}`,
			repositories,
		};
	} catch (error) {
		console.log(error);
		return repositories;
	}
}
