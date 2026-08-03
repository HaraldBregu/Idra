import React from 'react';
import StoragePage from '../storage/Page';
import VectorDbPage from '../vectordb/Page';
import SearchPage from '../search/Page';
import TasksPage from '../tasks/Page';

const ApplicationPage: React.FC = () => (
	<>
		<StoragePage />
		<VectorDbPage />
		<SearchPage />
		<TasksPage />
	</>
);

export default ApplicationPage;
