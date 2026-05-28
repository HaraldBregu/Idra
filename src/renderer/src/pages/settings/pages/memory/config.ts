import { Brain } from 'lucide-react';
import type { MemoryFilePageConfig } from './MemoryFilePages';

export const MEMORY_FILES_CONFIG: MemoryFilePageConfig = {
	titleKey: 'settings.tabs.memory',
	descriptionKey: 'settings.memory.description',
	emptyTitleKey: 'settings.memory.emptyTitle',
	emptyDescriptionKey: 'settings.memory.emptyDescription',
	icon: Brain,
	listPath: '/settings/memory',
	detailsPath: '/settings/memory/details',
	listFiles: () => window.chatMemory.list(),
	readFile: (request) => window.chatMemory.read(request),
};
