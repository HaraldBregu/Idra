import { render, screen } from '@testing-library/react';
import { ModelOptions } from '../../../src/renderer/src/components/model-options';

describe('ModelOptions', () => {
	it('renders nested provider choices as a select', () => {
		render(
			<ModelOptions
				inputs={{
					reasoning: {
						type: 'object',
						properties: {
							effort: { type: 'string', enum: ['low', 'medium', 'high'] },
						},
					},
				}}
				values={{}}
				onChange={jest.fn()}
			/>
		);

		expect(screen.getByText('reasoning effort')).toBeInTheDocument();
		expect(screen.getByRole('combobox')).toHaveTextContent('Provider default');
		expect(screen.getByRole('option', { name: 'high', hidden: true })).toBeInTheDocument();
	});

	it('uses provider choices for numeric enums', () => {
		render(
			<ModelOptions
				inputs={{ duration: { type: 'integer', enum: [5, 10] } }}
				values={{}}
				onChange={jest.fn()}
			/>
		);

		expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
		expect(screen.getByRole('option', { name: '10', hidden: true })).toBeInTheDocument();
	});

	it('does not render unsupported object-only schemas', () => {
		const { container } = render(
			<ModelOptions
				inputs={{ response_format: { type: 'object' } }}
				values={{}}
				onChange={jest.fn()}
			/>
		);

		expect(container).toBeEmptyDOMElement();
	});
});
