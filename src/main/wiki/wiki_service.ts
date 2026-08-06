import { buildWikiAnswerContext } from './wiki_answer_context';
import { lintWiki } from './wiki_lint';
import { readWikiPage } from './wiki_read_page';
import { getRecentWikiActivity } from './wiki_recent_activity';
import { rebuildWikiIndex } from './wiki_index';
import { reviewWikiChange } from './wiki_review';
import { runWiki } from './wiki_run';
import { saveWikiAnalysis } from './wiki_save_analysis';
import { searchWiki } from './wiki_search';
import type { WikiService } from './wiki_service_types';

export const wikiService: WikiService = {
	ingestSource: runWiki,
	search: searchWiki,
	readPage: readWikiPage,
	answerContext: buildWikiAnswerContext,
	saveAnalysis: saveWikiAnalysis,
	lint: lintWiki,
	rebuildIndex: rebuildWikiIndex,
	getRecentActivity: getRecentWikiActivity,
	review: reviewWikiChange,
};
