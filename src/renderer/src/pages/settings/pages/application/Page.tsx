import React from 'react';
import StoragePage from '../storage/Page';
import VectorDbPage from '../vectordb/Page';

const ApplicationPage: React.FC = () => (
	<>
		<StoragePage />
		<VectorDbPage />
	</>
);

export default ApplicationPage;
