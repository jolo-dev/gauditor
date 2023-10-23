import { CodePipelineEvent } from 'aws-lambda';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as pipeline from '../lib/codepipeline';
import * as sfn from '../lib/sfn';
import { handler } from '../src/send-token';

vi.mock('../lib/sfn', () => {
	return {
		sendTaskSuccess: vi.fn(),
	};
});

vi.mock('../lib/codepipeline', () => {
	return {
		sendJobResult: vi.fn(),
	};
});

describe('send-token', () => {
	const event: CodePipelineEvent = {
		'CodePipeline.job': {
			id: '123',
			accountId: '123',
			data: {
				actionConfiguration: {
					configuration: {
						FunctionName: 'test-function',
						UserParameters: 'token',
					},
				},
				inputArtifacts: [],
				outputArtifacts: [],
				artifactCredentials: {
					accessKeyId: '123',
					secretAccessKey: '123',
					sessionToken: '123',
				},
			},
		},
	};

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should call the handler when send task success', async () => {
		const sfnSpy = vi
			.spyOn(sfn, 'sendTaskSuccess')
			.mockResolvedValue({ $metadata: { httpStatusCode: 200 } });
		const pipelineSpy = vi.spyOn(pipeline, 'sendJobResult');
		await handler(event);
		expect(sfnSpy).toHaveBeenCalled();
		expect(pipelineSpy).toHaveBeenCalledWith('123', true);
	});

	it('should call the handler when send task NOT success', async () => {
		const sfnSpy = vi
			.spyOn(sfn, 'sendTaskSuccess')
			.mockResolvedValue({ $metadata: { httpStatusCode: 500 } });
		const pipelineSpy = vi.spyOn(pipeline, 'sendJobResult');
		await handler(event);
		expect(sfnSpy).toHaveBeenCalled();
		expect(pipelineSpy).toHaveBeenCalledWith('123', false);
	});

	it('should throw when handler has error', async () => {
		vi.spyOn(sfn, 'sendTaskSuccess').mockRejectedValueOnce(
			new Error('Error sending task success'),
		);
		await expect(handler(event)).rejects.toThrowError(
			'Error sending task success',
		);
	});
});
