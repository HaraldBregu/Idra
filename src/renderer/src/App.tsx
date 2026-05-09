import React from 'react';
import { RouterProvider } from 'react-router-dom';
import { AppProvider } from './contexts';
import { ErrorBoundary } from './components/app/base/ErrorBoundary';
import { router } from './router';
import './index.css';

const App: React.FC = () => {
	return (
		<ErrorBoundary level="root">
			<AppProvider>
				<RouterProvider router={router} />
			</AppProvider>
		</ErrorBoundary>
	);
};

export default App;
