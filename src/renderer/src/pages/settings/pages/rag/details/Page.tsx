import React from 'react';
import { MemoryFileDetailPage } from '../../memory/MemoryFilePages';
import { RAG_FILES_CONFIG } from '../config';

export default function RagDetailsPage(): React.JSX.Element {
	return <MemoryFileDetailPage config={RAG_FILES_CONFIG} />;
}
