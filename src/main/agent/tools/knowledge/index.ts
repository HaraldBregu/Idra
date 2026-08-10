import { getRagConfiguration } from '../../knowledge/rag';
import { getWikiSettings } from '../../knowledge/wiki/wiki_get_settings';
import type { SessionCategory } from '../../session';
import type { Tool } from '../../types';
import { queryKnowledgeTool } from './query_knowledge';
import { ingestWikiSourceTool } from './ingest_wiki_source';
import { getRecentWikiActivityTool } from './get_recent_wiki_activity';
import { lintWikiTool } from './lint_wiki';
import { rebuildWikiIndexTool } from './rebuild_wiki_index';
import { reviewWikiChangesTool } from './review_wiki_changes';
import { saveWikiAnalysisTool } from './save_wiki_analysis';

export function getKnowledgeTools(category: SessionCategory): Tool[] {
	if (category !== 'main' && category !== 'task') return [];
	if (getWikiSettings().enabled !== true && getRagConfiguration().enabled !== true) return [];
	return [queryKnowledgeTool];
}

export function getWikiTools(category: SessionCategory): Tool[] {
	if (category !== 'main' || getWikiSettings().enabled !== true) return [];
	return [
		ingestWikiSourceTool,
		saveWikiAnalysisTool,
		lintWikiTool,
		reviewWikiChangesTool,
		rebuildWikiIndexTool,
		getRecentWikiActivityTool,
	];
}
