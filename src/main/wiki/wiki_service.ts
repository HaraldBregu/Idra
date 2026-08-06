import type { WikiRunResult } from '../../shared/wiki_types';
import type {
	WikiAnswerContext,
	WikiLintResult,
	WikiReviewItem,
	WikiSearchResult,
} from './wiki_types';

export interface WikiService {
	ingestSource(relativePath?: string): Promise<WikiRunResult>;
	search(query: string, count?: number): Promise<WikiSearchResult[]>;
	readPage(page: string): Promise<WikiSearchResult>;
	answerContext(query: string, includeRaw?: boolean): Promise<WikiAnswerContext>;
	saveAnalysis(input: Record<string, unknown>): Promise<unknown>;
	lint(autoFix?: boolean): Promise<WikiLintResult>;
	rebuildIndex(): Promise<void>;
	getRecentActivity(count?: number): Promise<string>;
	review(reviewId: string, action: 'approve' | 'reject'): Promise<WikiReviewItem>;
}
