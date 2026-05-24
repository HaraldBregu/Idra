import { BookOpenText } from 'lucide-react';
import type { MemoryFilePageConfig } from '../memory/MemoryFilePages';

export const WIKI_FILES_CONFIG: MemoryFilePageConfig = {
	titleKey: 'settings.tabs.wiki',
	descriptionKey: 'settings.memory.wikiDescription',
	emptyTitleKey: 'settings.memory.wikiEmptyTitle',
	emptyDescriptionKey: 'settings.memory.wikiEmptyDescription',
	icon: BookOpenText,
	listPath: '/settings/wiki',
	detailsPath: '/settings/wiki/details',
	listFiles: () => window.wiki.list(),
	readFile: (request) => window.wiki.read(request),
};
