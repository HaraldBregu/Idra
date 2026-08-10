import { buildWikiAnswerContext } from './wiki_answer_context';
import { lintWiki } from './wiki_lint';
import { readWikiPage } from './wiki_read_page';
import { getRecentWikiActivity } from './wiki_recent_activity';
import { reviewWikiChange } from './wiki_review';
import { runWiki } from './wiki_run';
import { saveWikiAnalysis } from './wiki_save_analysis';
import { searchWiki } from './wiki_search';
import type { WikiService } from './types';

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
