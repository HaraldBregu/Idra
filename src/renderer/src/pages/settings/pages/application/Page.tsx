import React from 'react';
import StoragePage from '../storage/Page';
import VectorDbPage from '../vectordb/Page';
import SearchPage from '../search/Page';
import TasksPage from '../tasks/Page';
import DefaultChannelPage from '../channels/default/Page';

const ApplicationPage: React.FC = () => (
	<>
		<StoragePage />
		<VectorDbPage />
		<SearchPage />
		<TasksPage />
		<DefaultChannelPage />
	</>
);

export default ApplicationPage;
