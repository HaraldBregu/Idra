import type Store from 'electron-store';
import type { WikiRunResult } from '../../../shared/wiki_types';
import type { WikiSettings } from '../../../shared/wiki_types';

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
	excerptHash?: string;
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
	sourceIds?: string[];
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
	modelUsage?: {
		inputTokens: number;
		outputTokens: number;
	};
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
	allowContradictionResolution?: boolean;
	repository?: WikiRepository;
	signal?: AbortSignal;
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
	lineage?: Record<
		string,
		{
			version: number;
			previousSourceId?: string;
			replacedBySourceId?: string;
		}
	>;
}

export interface WikiRegisteredSource {
	source: WikiSource;
	record: WikiSourceRecord;
	isNew: boolean;
	pendingLineage?: {
		relativePath: string;
		version: number;
		previousSourceId: string;
	};
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
	modelUsage?: {
		inputTokens: number;
		outputTokens: number;
	};
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

export interface WikiSaveAnalysisInput {
	title: string;
	summary: string;
	content: string;
	pageType: 'comparison' | 'synthesis' | 'project' | 'question';
	sourceIds: string[];
	tags?: string[];
	aliases?: string[];
	related?: string[];
	claims?: WikiClaim[];
	openQuestions?: string[];
}

export interface WikiSaveAnalysisResult {
	operationId: string;
	path: string;
	created: boolean;
	updated: boolean;
	status: 'completed' | 'awaiting_review';
	reviewIds: string[];
}

export interface WikiFailureRegistry {
	version: 1;
	operations: WikiOperationRecord[];
}

export interface WikiPageManifest {
	version: 1;
	pages: Record<string, WikiPageManifestEntry>;
}

export type WikiMetricName =
	| 'wiki_ingest_total'
	| 'wiki_ingest_failed_total'
	| 'wiki_pages_created_total'
	| 'wiki_pages_updated_total'
	| 'wiki_claims_added_total'
	| 'wiki_contradictions_detected_total'
	| 'wiki_queries_total'
	| 'wiki_query_fallback_to_raw_total'
	| 'wiki_lint_findings_total'
	| 'wiki_review_pending_total'
	| 'wiki_rollback_total';

export type WikiSettingsInput = Partial<WikiSettings> &
	Pick<WikiSettings, 'providerId' | 'modelId' | 'sourcePath' | 'targetPath' | 'schedule'>;

export interface WikiOperationRegistry {
	version: 1;
	operations: Record<string, WikiOperationRecord>;
}

export interface WikiPaths {
	root: string;
	evidence: string;
	state: string;
	config: string;
}

export interface WikiRepository {
	targetPath: string;
	paths: WikiPaths;
	sources: Store<WikiSourceRegistry>;
	reviews: Store<WikiReviewQueue>;
	operations: Store<WikiOperationRegistry>;
	failures: Store<WikiFailureRegistry>;
	manifest: Store<WikiPageManifest>;
	state: Store<WikiState>;
}

export interface WikiReviewQueue {
	version: 1;
	items: WikiReviewItem[];
}

export interface WikiService {
	ingestSource(relativePath?: string): Promise<WikiRunResult>;
	search(query: string, count?: number): Promise<WikiSearchResult[]>;
	readPage(page: string): Promise<WikiSearchResult>;
	answerContext(query: string, includeRaw?: boolean): Promise<WikiAnswerContext>;
	saveAnalysis(input: WikiSaveAnalysisInput): Promise<WikiSaveAnalysisResult>;
	lint(autoFix?: boolean): Promise<WikiLintResult>;
	rebuildIndex(): Promise<void>;
	getRecentActivity(count?: number): Promise<string>;
	review(reviewId: string, action: 'approve' | 'reject'): Promise<WikiReviewItem>;
}

export interface WikiSourceRegistry {
	version: 1;
	sources: Record<string, WikiSourceRecord>;
}

export interface WikiTransactionInput<T> {
	targetPath: string;
	operationId: string;
	repository?: WikiRepository;
	signal?: AbortSignal;
	apply(stagedPath: string): Promise<T>;
	validate?(stagedPath: string): Promise<string[]>;
}
