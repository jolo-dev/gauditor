import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as build from '../lib/codebuild';
import * as pipeline from '../lib/codepipeline';
import { handler } from '../src/delete-pipeline-build-projects';

const { mockedDeletePipeline, mockedDeleteProject } = vi.hoisted(() => {
	return {
		mockedDeletePipeline: vi.fn(),
		mockedDeleteProject: vi.fn(),
	};
});

vi.mock('../lib/codepipeline', () => {
	return {
		deletePipeline: mockedDeletePipeline,
	};
});

vi.mock('../lib/codebuild', () => {
	return {
		deleteProject: mockedDeleteProject,
	};
});

describe('delete-pipeline-build-projects', () => {
	const event = ['repo1', 'repo2'];

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('triggers the handler function', async () => {
		const buildSpy = vi.spyOn(build, 'deleteProject');
		const pipelineSpy = vi.spyOn(pipeline, 'deletePipeline');
		await handler(event);
		expect(buildSpy).toHaveBeenCalledTimes(2); // Because of two projects (see events)
		expect(pipelineSpy).toHaveBeenCalled();
	});

	it('should throw when error deleting pipeline', async () => {
		vi.spyOn(console, 'error').mockImplementationOnce(() => {});
		vi.spyOn(pipeline, 'deletePipeline').mockRejectedValueOnce(
			new Error('Error deleting pipeline'),
		);
		await expect(handler(event)).rejects.toThrowError(
			'Error deleting pipeline',
		);
	});
});
