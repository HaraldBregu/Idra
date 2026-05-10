import React from 'react';
import { Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
	PageBody,
	PageContainer,
	PageHeader,
	PageHeaderTitle,
} from '@/components/app/base/page';
import { useApp } from '@/contexts';

export function Layout(): React.JSX.Element {
	const { t } = useTranslation();
	useApp();

	return (
		<PageContainer>
			<PageHeader>
				<PageHeaderTitle>{t('settings.title')}</PageHeaderTitle>
			</PageHeader>
			<PageBody className="overflow-auto">
				<Outlet />
			</PageBody>
		</PageContainer>
	);
}
