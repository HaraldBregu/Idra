import React from 'react';
import StoragePage from '../../settings/pages/storage/Page';
import { STEP_COPY } from '../constants';
import { StepHeader } from './StepHeader';

export function CloudStep(): React.JSX.Element {
	const { title, description } = STEP_COPY.storage;

	return (
		<div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-8 sm:px-6">
			<StepHeader title={title} description={description} />
			<div className="mt-6">
				<StoragePage embedded />
			</div>
		</div>
	);
}
