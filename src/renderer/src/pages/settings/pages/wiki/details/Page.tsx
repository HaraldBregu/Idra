import React from 'react';
import { MemoryFileDetailPage } from '../../memory/MemoryFilePages';
import { WIKI_FILES_CONFIG } from '../config';

export default function WikiDetailsPage(): React.JSX.Element {
	return <MemoryFileDetailPage config={WIKI_FILES_CONFIG} />;
}
