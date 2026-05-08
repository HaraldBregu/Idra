import { FolderOpen, LibraryBig } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/store';
import { selectAllDocuments, selectResources } from '@/store/workspace';
import { APP_SEARCH_ACTIONS } from './constants';
import { buildAppSearchSections } from './search-items';

export function useAppSearchResults(query: string) {
	const { t } = useTranslation();
	const documents = useAppSelector(selectAllDocuments);
	const resources = useAppSelector(selectResources);

	const sections = buildAppSearchSections({
		query,
		documents: documents.map((document) => ({
			id: document.id,
			title: document.title || t('sidebar.untitledWriting', 'Untitled'),
			path: document.path,
			updatedAt: document.updatedAt,
		})),
		resources: resources.map((resource) => ({
			id: resource.id,
			name: resource.name,
			path: resource.path,
			mimeType: resource.mimeType,
			importedAt: resource.createdAt,
			lastModified: resource.modifiedAt,
			href: '/settings/assistant',
			categoryLabel: t('appLayout.resources', 'Resources'),
			icon: LibraryBig,
		})),
		actions: APP_SEARCH_ACTIONS,
		icons: {
			document: FolderOpen,
			resource: LibraryBig,
		},
		labels: {
			actions: {
				title: t('search.quickActionsTitle', 'Quick actions'),
			},
			documents: {
				title: t('search.documentsTitle', 'Documents'),
			},
			resources: {
				title: t('search.resourcesTitle', 'Resources'),
			},
		},
	});

	return {
		sections,
		totalCount: sections.reduce((count, section) => count + section.items.length, 0),
	};
}
