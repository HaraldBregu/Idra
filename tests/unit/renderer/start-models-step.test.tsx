import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { ModelsStep } from '../../../src/renderer/src/pages/start/components/ModelsStep';
import type {
	ModelServiceStateMap,
} from '../../../src/renderer/src/pages/start/types';

jest.mock('@pages/settings/components/model-configuration', () => ({
	ModelProviderConfiguration: ({
		idPrefix,
		grouped,
		triggerTitle,
	}: {
		idPrefix: string;
		grouped?: boolean;
		triggerTitle: React.ReactNode;
	}) => (
		<div data-testid={idPrefix} data-grouped={grouped ? 'true' : 'false'}>
			{triggerTitle}
		</div>
	),
}));

jest.mock('../../../src/renderer/src/pages/start/components/ResourcesStep', () => ({
	ResourcesStep: () => <div>Resources</div>,
}));

const EMPTY_SERVICE = { providerId: '', modelId: '', modelGroups: [] };
const SERVICE_STATES: ModelServiceStateMap = {
	assistant: EMPTY_SERVICE,
	health: EMPTY_SERVICE,
	tasks: EMPTY_SERVICE,
	voice: EMPTY_SERVICE,
	transcription: EMPTY_SERVICE,
	image: EMPTY_SERVICE,
	video: EMPTY_SERVICE,
	audio: EMPTY_SERVICE,
};

it('groups assistant model services in one card', () => {
	render(
		<ModelsStep
			serviceStates={SERVICE_STATES}
			loadingModels={false}
			savingConfig={false}
			onServiceChange={jest.fn()}
		/>
	);

	const assistantGroup = screen.getByRole('region', { name: 'Assistant providers' });
	for (const id of ['assistant', 'voice', 'transcription', 'image', 'video', 'audio']) {
		expect(within(assistantGroup).getByTestId(`setup-${id}`)).toHaveAttribute(
			'data-grouped',
			'true'
		);
	}
	expect(assistantGroup).not.toContainElement(screen.getByTestId('setup-health'));
	expect(assistantGroup).not.toContainElement(screen.getByTestId('setup-tasks'));
	expect(screen.getByTestId('setup-health')).toHaveAttribute('data-grouped', 'false');
	expect(screen.getByTestId('setup-tasks')).toHaveAttribute('data-grouped', 'false');
});
