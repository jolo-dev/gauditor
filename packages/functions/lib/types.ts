export interface IEvent {
	repositories: string[];
	token?: string;
}

export interface IDependencies {
	prod: number;
	dev: number;
	optional: number;
	peer: number;
	peerOptional: number;
	total: number;
}

export interface IMetadataVulnerabilities {
	info: number;
	low: number;
	moderate: number;
	high: number;
	critical: number;
	total: number;
}

export interface IMetadata {
	vulnerabilities: IMetadataVulnerabilities;
	dependencies: IDependencies;
}

export interface IFixAvailable {
	name: string;
	version: string;
	isSemVerMajor: boolean;
}

export type Severity = 'critical' | 'high';

export interface ICvss {
	score: number;
	vectorString: null | string;
}

export interface IVia {
	source: number;
	name: string;
	dependency: string;
	title?: string;
	url: string;
	severity: string;
	cwe: string[];
	cvss: ICvss;
	range: string;
}

export interface IVulnerability {
	name: string;
	severity: Severity;
	isDirect: boolean;
	via?: string[] | IVia[];
	effects: string[];
	range: string;
	nodes: string[];
	fixAvailable: boolean | IFixAvailable;
}

export interface IAuditReport {
	auditReportVersion: number;
	vulnerabilities: Record<string, IVulnerability>;
	metadata: IMetadata;
}
