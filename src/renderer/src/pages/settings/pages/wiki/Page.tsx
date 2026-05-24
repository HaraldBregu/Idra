import React from 'react';
import { MemoryFileListPage } from '../memory/MemoryFilePages';
import { WIKI_FILES_CONFIG } from './config';

export default function WikiPage(): React.JSX.Element {
	return <MemoryFileListPage config={WIKI_FILES_CONFIG} />;
}
