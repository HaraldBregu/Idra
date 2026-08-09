import { getRagConfiguration } from '../../../rag';
import { getWikiSettings } from '../../../wiki/wiki_get_settings';
import type { SessionCategory } from '../../session';
import type { Tool } from '../../types';
import { knowledgeQueryTool } from './query';
import { wikiIngestTool } from './ingest';
import { wikiActivityTool } from './activity';
import { wikiLintTool } from './lint';
import { wikiRebuildTool } from './rebuild';
import { wikiReviewTool } from './review';
import { wikiSaveTool } from './save';

export function getKnowledgeTools(category: SessionCategory): Tool[] {
	if (category !== 'main' && category !== 'task') return [];
	if (getWikiSettings().enabled !== true && getRagConfiguration().enabled !== true) return [];
	return [knowledgeQueryTool];
}

export function getWikiTools(category: SessionCategory): Tool[] {
	if (category !== 'main' || getWikiSettings().enabled !== true) return [];
	return [
		wikiIngestTool,
		wikiSaveTool,
		wikiLintTool,
		wikiReviewTool,
		wikiRebuildTool,
		wikiActivityTool,
	];
}
