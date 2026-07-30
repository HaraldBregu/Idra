import React from 'react';
import ProvidersPage from '../../settings/pages/providers/Page';
import { STEP_COPY } from '../constants';
import { StepHeader } from './StepHeader';

export function ProviderStep(): React.JSX.Element {
	const { title, description } = STEP_COPY.providers;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-2xl flex-col px-4 py-8 sm:px-6">
			<StepHeader title={title} description={description} />
			<div className="mt-6">
				<ProvidersPage embedded />
			</div>
		</div>
	);
}
