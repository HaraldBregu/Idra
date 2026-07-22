import notesPage from './defaults/notes/index.html?asset';
import projectPage from './defaults/project/index.html?asset';
import type { WidgetConfiguration } from './widget_types';

export const DEFAULT_WIDGETS: readonly WidgetConfiguration[] = [
	{ id: 'notes', name: 'Notes' },
	{ id: 'project', name: 'Project' },
];

export const DEFAULT_WIDGET_PAGES: Readonly<Record<string, string>> = {
	notes: notesPage,
	project: projectPage,
};
