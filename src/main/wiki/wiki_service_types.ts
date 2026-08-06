import type { WikiRunResult } from '../../shared/wiki_types';
import type {
	WikiAnswerContext,
	WikiLintResult,
	WikiReviewItem,
	WikiSaveAnalysisInput,
	WikiSaveAnalysisResult,
	WikiSearchResult,
} from './wiki_types';

export interface WikiService {
	ingestSource(relativePath?: string): Promise<WikiRunResult>;
	search(query: string, count?: number): Promise<WikiSearchResult[]>;
	readPage(page: string): Promise<WikiSearchResult>;
	answerContext(query: string, includeRaw?: boolean): Promise<WikiAnswerContext>;
	saveAnalysis(input: WikiSaveAnalysisInput): Promise<WikiSaveAnalysisResult>;
	lint(autoFix?: boolean): Promise<WikiLintResult>;
	rebuildIndex(targetPath: string): Promise<void>;
	getRecentActivity(count?: number): Promise<string>;
	review(reviewId: string, action: 'approve' | 'reject'): Promise<WikiReviewItem>;
}
