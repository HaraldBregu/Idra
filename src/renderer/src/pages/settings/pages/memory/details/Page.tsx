import React from 'react';
import { MemoryFileDetailPage } from '../MemoryFilePages';
import { MEMORY_FILES_CONFIG } from '../config';

export default function MemoryDetailsPage(): React.JSX.Element {
	return <MemoryFileDetailPage config={MEMORY_FILES_CONFIG} />;
}
