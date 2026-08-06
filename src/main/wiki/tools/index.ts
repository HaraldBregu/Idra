import type { SessionCategory } from '../../agent/session';
import type { Tool } from '../../agent/types';
import { getWikiSettings } from '../wiki_get_settings';
import { wikiIngestTool } from './ingest';
import { wikiQueryTool } from './query';
import { wikiReadTool } from './read';
import { wikiSearchTool } from './search';

export function getWikiTools(category: SessionCategory): Tool[] {
	if (category !== 'main' || getWikiSettings().enabled === false) return [];
	return [wikiIngestTool, wikiSearchTool, wikiReadTool, wikiQueryTool];
}
