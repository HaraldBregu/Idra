import React from 'react';
import { Outlet } from 'react-router-dom';
import {  } from 'react-i18next';
import {
	PageBody,
	PageContainer,
} from '@/components/app/base/page';
import { useApp } from '@/contexts';

export function Layout(): React.JSX.Element {
	useApp();

	return (
		<PageContainer>
			<PageBody className="overflow-auto">
				<Outlet />
			</PageBody>
		</PageContainer>
	);
}
