export interface AccessRecord {
	version: 1;
	salt: string;
	digest: string;
	sessionSecret: string;
	createdAt: string;
}
