import { render, screen } from '@testing-library/react';
import { ModelProviderSelect } from '../../../src/renderer/src/components/model-provider-select';

it('keeps an accessible selector name without rendering its field copy', () => {
	render(
		<ModelProviderSelect
			idPrefix="setup-model"
			providerGroups={[]}
			providerId=""
			modelId=""
			onChange={jest.fn()}
			showFieldLabel={false}
			labels={{ label: 'Model', description: 'Chat, reasoning, and planning.' }}
		/>
	);

	expect(screen.getByRole('combobox', { name: 'Model' })).toBeInTheDocument();
	expect(screen.queryByText('Model')).not.toBeInTheDocument();
	expect(screen.queryByText('Chat, reasoning, and planning.')).not.toBeInTheDocument();
});
