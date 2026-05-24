import React from 'react';
import { MemoryFileListPage } from './MemoryFilePages';
import { MEMORY_FILES_CONFIG } from './config';

export default function MemoryPage(): React.JSX.Element {
	return <MemoryFileListPage config={MEMORY_FILES_CONFIG} />;
}
