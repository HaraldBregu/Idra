import type { WikiRunResult } from '../../shared/wiki_types';

export type WikiPageType =
	| 'source'
	| 'entity'
	| 'concept'
	| 'topic'
	| 'project'
	| 'comparison'
	| 'synthesis'
	| 'question';

export type WikiConfidence = 'low' | 'medium' | 'high';

export type WikiClaimStatus = 'supported' | 'disputed' | 'superseded' | 'unverified';

export type WikiContradictionStatus =
	| 'unresolved'
	| 'explained-by-scope'
	| 'explained-by-time'
	| 'source-corrected'
	| 'superseded'
	| 'resolved-by-review';

export type WikiOperationStatus =
	| 'pending'
	| 'planning'
	| 'executing'
	| 'validating'
	| 'awaiting_review'
	| 'completed'
	| 'failed'
	| 'rolled_back';

export interface WikiEvidence {
	sourceId: string;
	locator: string;
	evidenceType: 'direct' | 'indirect';
}

export interface WikiClaim {
	id: string;
	statement: string;
	evidence: WikiEvidence[];
	confidence: WikiConfidence;
	status: WikiClaimStatus;
	contradicts?: string[];
}

export interface WikiContradiction {
	id: string;
	claimIds: string[];
	description: string;
	status: WikiContradictionStatus;
	requiredFollowUp?: string;
}

export interface WikiSource {
	absolutePath: string;
	relativePath: string;
	content: string;
	hash: string;
	sourceId?: string;
	mediaType?: string;
	createdAt?: string;
	archivePath?: string;
}

export interface WikiPageUpdate {
	path: string;
	title: string;
	summary: string;
	content: string;
	sources: string[];
	id?: string;
	pageType?: WikiPageType;
	status?: 'active' | 'draft' | 'superseded';
	tags?: string[];
	aliases?: string[];
	related?: string[];
	confidence?: WikiConfidence;
	claims?: WikiClaim[];
	contradictions?: WikiContradiction[];
	openQuestions?: string[];
}

export interface WikiUpdate {
	pages: WikiPageUpdate[];
}

export interface WikiApplyResult {
	createdPages: number;
	updatedPages: number;
	claimsAdded?: number;
	contradictionsDetected?: number;
	pendingReviews?: number;
	reviewItems?: WikiReviewItem[];
}

export interface WikiApplyOptions {
	operationId?: string;
	requireReviewForMajorChanges?: boolean;
}

export interface WikiState {
	sources: Record<string, string>;
	lastRun?: WikiRunResult;
}

export interface WikiSourceRecord {
	sourceId: string;
	checksum: string;
	originalName: string;
	relativePaths: string[];
	mediaType: string;
	createdAt: string;
	ingestedAt: string;
	archivePath: string;
	status: 'pending' | 'integrated' | 'failed';
	operationId?: string;
}

export interface WikiRegisteredSource {
	source: WikiSource;
	record: WikiSourceRecord;
	isNew: boolean;
}

export interface WikiPageManifestEntry {
	id: string;
	path: string;
	title: string;
	pageType: WikiPageType;
	updatedAt: string;
	sourceIds: string[];
}

export interface WikiOperationRecord {
	id: string;
	type: 'ingest' | 'save_analysis' | 'lint' | 'repair' | 'rebuild_index' | 'review';
	status: WikiOperationStatus;
	startedAt: string;
	updatedAt: string;
	sourceId?: string;
	title?: string;
	createdPages: number;
	updatedPages: number;
	claimsAdded: number;
	contradictionsDetected: number;
	validationErrors: string[];
	reviewStatus?: 'not_required' | 'required' | 'approved' | 'rejected';
	error?: string;
}

export interface WikiReviewItem {
	id: string;
	operationId: string;
	status: 'pending' | 'approved' | 'rejected';
	reason: string;
	risk: 'medium' | 'high';
	affectedPages: string[];
	evidenceSourceIds: string[];
	proposedUpdate: WikiUpdate;
	createdAt: string;
	rollback: string;
}

export interface WikiLintFinding {
	code: string;
	message: string;
	path?: string;
	claimId?: string;
}

export interface WikiLintResult {
	critical: WikiLintFinding[];
	warnings: WikiLintFinding[];
	suggestions: WikiLintFinding[];
	autoFixable: WikiLintFinding[];
	requiresReview: WikiLintFinding[];
	fixed: number;
}

export interface WikiSearchResult {
	contentType: 'wiki_page';
	pageId: string;
	path: string;
	title: string;
	summary: string;
	confidence: number;
	sourceIds: string[];
	content: string;
}

export interface WikiRawEvidenceResult {
	contentType: 'raw_source';
	sourceId: string;
	locator: string;
	text: string;
	confidence: number;
}

export interface WikiAnswerContext {
	query: string;
	compiledWiki: WikiSearchResult[];
	primaryEvidence: WikiRawEvidenceResult[];
	contradictions: WikiContradiction[];
	limitations: string[];
}
