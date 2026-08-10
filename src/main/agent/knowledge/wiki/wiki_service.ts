import { buildWikiAnswerContext } from './wiki_answer_context';
import { lintWiki } from './wiki_lint';
import { readWikiPage } from './wiki_read_page';
import { getRecentWikiActivity } from './wiki_recent_activity';
import { reviewWikiChange } from './wiki_review';
import { runWiki } from './wiki_run';
import { saveWikiAnalysis } from './wiki_save_analysis';
import { searchWiki } from './wiki_search';
import type { WikiRunResult } from '../../../../shared/wiki_types';
import type {
	WikiAnswerContext,
	WikiLintResult,
	WikiReviewItem,
	WikiSaveAnalysisInput,
	WikiSaveAnalysisResult,
	WikiSearchResult,
} from './types';

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

export const wikiService: WikiService = {
	ingestSource: runWiki,
	search: searchWiki,
	readPage: readWikiPage,
	answerContext: buildWikiAnswerContext,
	saveAnalysis: saveWikiAnalysis,
	lint: lintWiki,
	rebuildIndex: async () => {
		await lintWiki(true);
	},
	getRecentActivity: getRecentWikiActivity,
	review: reviewWikiChange,
};
