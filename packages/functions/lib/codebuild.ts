import {
	CodeBuildClient,
	CreateProjectCommand,
	DeleteProjectCommand,
} from '@aws-sdk/client-codebuild';

const codeBuildClient = new CodeBuildClient({});
export const createProject = async (repoName: string) => {
	try {
		const createProjectCommand = new CreateProjectCommand({
			name: `${repoName}-npm-audit`,
			source: {
				type: 'CODEPIPELINE',
				buildspec: `
                version: 0.2
                phases:
                  build:
                    on-failure: CONTINUE # npm audit returns a non-zero exit code if vulnerabilities are found, we force to continue
                    commands:
                      - npm audit --json > ${repoName}-audit-report.json; exit 0
                      - aws s3 cp --sse aws:kms ${repoName}-audit-report.json s3://${process.env.BUILDSPEC_BUCKET}/${repoName}-audit-report.json
              `,
			},
			serviceRole: process.env.CODEBUILD_SERVICE_ROLE_ARN,
			artifacts: {
				type: 'CODEPIPELINE',
			},
			encryptionKey: process.env.KMS_KEY_ID,
			environment: {
				type: 'LINUX_CONTAINER',
				image: 'aws/codebuild/standard:7.0',
				computeType: 'BUILD_GENERAL1_SMALL',
				imagePullCredentialsType: 'CODEBUILD',
				environmentVariables: [
					{
						name: 'ENVIRONMENT',
						value: 'dev',
						type: 'PLAINTEXT',
					},
				],
			},
		});
		const response = await codeBuildClient.send(createProjectCommand);
		if (response.project?.name) {
			return response.project.name;
		} else {
			throw new Error('Error creating project');
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};

export const deleteProject = async (repository: string) => {
	if (repository.length === 0) throw new Error('No repository name provided');
	try {
		const deleteProjectCommand = new DeleteProjectCommand({
			name: `${repository}-npm-audit`,
		});
		const response = await codeBuildClient.send(deleteProjectCommand);
		if (response.$metadata.httpStatusCode !== 200) {
			throw new Error(`Failed to delete ${repository}-npm-audit`);
		}
	} catch (error) {
		console.error(error);
		throw error;
	}
};
