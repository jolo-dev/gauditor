import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { throwExpression } from './utilty';

const s3 = new S3Client({});

export const getReportByKey = async (repoName: string) => {
	try {
		const bucket =
			process.env.BUILDSPEC_BUCKET ??
			throwExpression('BUILDSPEC_BUCKET is missing');

		const command = new GetObjectCommand({
			Bucket: bucket,
			Key: repoName,
		});
		const response = await s3.send(command);

		const body = await response.Body?.transformToString();
		if (!body) {
			throw new Error('No body found');
		}

		return body;
	} catch (error) {
		console.error(error);
		throw error;
	}
};
