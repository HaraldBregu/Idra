import React from 'react';
import { MemoryFileListPage } from '../memory/MemoryFilePages';
import { RAG_FILES_CONFIG } from './config';

export default function RagPage(): React.JSX.Element {
	return <MemoryFileListPage config={RAG_FILES_CONFIG} />;
}
