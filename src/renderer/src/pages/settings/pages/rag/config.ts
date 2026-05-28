import { DatabaseSearch } from 'lucide-react';
import type { MemoryFilePageConfig } from '../memory/MemoryFilePages';

export const RAG_FILES_CONFIG: MemoryFilePageConfig = {
	titleKey: 'settings.tabs.rag',
	descriptionKey: 'settings.memory.ragDescription',
	emptyTitleKey: 'settings.memory.ragEmptyTitle',
	emptyDescriptionKey: 'settings.memory.ragEmptyDescription',
	icon: DatabaseSearch,
	listPath: '/settings/rag',
	detailsPath: '/settings/rag/details',
	listFiles: () => window.rag.list(),
	readFile: (request) => window.rag.read(request),
};
