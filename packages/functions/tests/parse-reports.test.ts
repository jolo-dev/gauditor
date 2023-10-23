import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as s3 from '../lib/s3';
import { handler } from '../src/parse-reports';
// import * as createOutput from "../lib/create-output";

const { mockedGetReportedByKey, mockedCreateOutput } = vi.hoisted(() => {
	return {
		mockedGetReportedByKey: vi.fn().mockResolvedValue({ body: 'test' }),
		mockedCreateOutput: vi.fn(),
	};
});

vi.mock('../lib/s3', () => {
	return {
		getReportByKey: mockedGetReportedByKey,
	};
});

vi.mock('../lib/create-output', () => {
	return {
		createOutput: mockedCreateOutput,
	};
});

describe('parse-reports', () => {
	const repositories = ['repo1', 'repo2'];

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should call the handler', async () => {
		const output = { criticals: [], highs: [] };
		mockedCreateOutput.mockReturnValue(output);
		const s3Spy = vi.spyOn(s3, 'getReportByKey').mockResolvedValue(
			JSON.stringify({
				vulnerabilities: { repo1: {} },
				metadata: { vulnerabilities: { high: 1, critical: 1 } },
			}),
		);
		// const createOutputSpy = vi.spyOn(createOutput, "createOutput");
		const result = await handler(repositories);

		expect(s3Spy).toHaveBeenCalled();
		console.log('result', result);

		// expect(createOutputSpy).toHaveBeenCalled();
		expect(result).toEqual({
			report:
				'Following packages have high or critical vulnerabilities:\nrepo1-audit-report.json- High: 1 and Critical: 1\nrepo2-audit-report.json- High: 1 and Critical: 1',
			repositories,
		});
	});

	it('should throw when handler has error', async () => {
		process.env.BUILDSPEC_BUCKET = 'test-bucket';
		vi.spyOn(s3, 'getReportByKey').mockRejectedValue(repositories);
		// because for the step functions we are not returning an error but passing the repositories further
		await expect(handler(repositories)).resolves.toEqual(repositories);
	});
});
