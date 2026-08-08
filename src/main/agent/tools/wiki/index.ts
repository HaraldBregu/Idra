import type { SessionCategory } from '../../session';
import type { Tool } from '../../types';
import { getWikiSettings } from '../../../wiki/wiki_get_settings';
import { wikiIngestTool } from './ingest';
import { wikiActivityTool } from './activity';
import { wikiLintTool } from './lint';
import { wikiRebuildTool } from './rebuild';
import { wikiReviewTool } from './review';
import { wikiSaveTool } from './save';

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
