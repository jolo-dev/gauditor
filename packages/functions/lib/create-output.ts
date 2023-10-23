import { IAuditReport } from './types';

/**
 * The function creates an output object that contains arrays of vulnerabilities categorized as
 * critical and high severity.
 * @param input - The input parameter is an object of type IAuditReport.
 * @returns an object with two properties: "criticals" and "highs". The "criticals" property contains
 * an array of vulnerability keys that have a severity of "critical", and the "highs" property contains
 * an array of vulnerability keys that have a severity of "high".
 */
export function createOutput(input: IAuditReport) {
	const criticals: string[] = [];
	const highs: string[] = [];
	for (const [key, val] of Object.entries(input.vulnerabilities)) {
		if (val.severity === 'critical') {
			criticals.push(key);
		}
		if (val.severity === 'high') {
			highs.push(key);
		}
	}
	return {
		criticals,
		highs,
	};
}
