import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as pipeline from '../lib/codepipeline';
import { handler } from '../src/create-pipeline-build-projects';

vi.mock('../lib/codepipeline', () => {
	return {
		createPipeline: vi.fn(),
		stage: vi.fn(),
		actions: vi.fn(),
	};
});

vi.mock('../lib/codebuild', () => {
	return {
		createProject: vi.fn(),
	};
});

describe('create-pipeline-build-projects', () => {
	const event = {
		repositories: ['repo1', 'repo2'],
		token: 'token',
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('triggers the handler function', async () => {
		process.env.SEND_SUCCESS_LAMBDA = 'test-lambda';
		process.env.CODEPIPELINE_SERVICE_ROLE_ARN =
			'arn:aws:iam::123456789012:role/service-role/codepipeline';
		process.env.BUILDSPEC_BUCKET = 'bar';
		process.env.KMS_KEY_ID = 'baz';

		const stageSpy = vi.spyOn(pipeline, 'stage');
		const pipelineSpy = vi.spyOn(pipeline, 'createPipeline');
		await handler(event);
		expect(stageSpy).toHaveBeenCalledTimes(3);
		expect(pipelineSpy).toHaveBeenCalled();
	});

	it('should throw when the repositories are not an array', async () => {
		// @ts-ignore --> for the purpose of the test
		await expect(handler({ ...event, repositories: 'foo' })).rejects.toThrow(
			'Invalid input: repositories must be an array',
		);
	});

	it('should throw when the repositories are not an array of strings', async () => {
		// @ts-ignore --> for the purpose of the test
		await expect(handler({ ...event, repositories: [1, 2] })).rejects.toThrow(
			'Invalid input: repositories must be an array of strings',
		);
	});
});
