import { getRagConfiguration } from '../../../rag';
import { getWikiSettings } from '../../../wiki/wiki_get_settings';
import type { SessionCategory } from '../../session';
import type { Tool } from '../../types';
import { knowledgeQueryTool } from './query';

export function getKnowledgeTools(category: SessionCategory): Tool[] {
	if (category !== 'main' && category !== 'task') return [];
	if (getWikiSettings().enabled !== true && getRagConfiguration().enabled !== true) return [];
	return [knowledgeQueryTool];
}
