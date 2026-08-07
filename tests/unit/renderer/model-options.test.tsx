import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ModelOptions } from '../../../src/renderer/src/components/model-options';

describe('ModelOptions', () => {
	it('renders nested provider choices as a select', async () => {
		const user = userEvent.setup();
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
		expect(screen.queryByRole('button', { name: 'Advanced' })).not.toBeInTheDocument();
		await user.click(screen.getByRole('combobox'));
		expect(screen.getByRole('option', { name: 'high', hidden: true })).toBeInTheDocument();
	});

	it('uses provider choices for numeric enums', async () => {
		const user = userEvent.setup();
		render(
			<ModelOptions
				inputs={{ duration: { type: 'integer', enum: [5, 10] } }}
				values={{}}
				onChange={jest.fn()}
			/>
		);

		expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Advanced' }));
		await user.click(screen.getByRole('combobox'));
		expect(screen.getByRole('option', { name: '10', hidden: true })).toBeInTheDocument();
	});

	it('replaces properties when the selected model inputs change', () => {
		const { rerender } = render(
			<ModelOptions
				inputs={{ reasoning_effort: { type: 'string', enum: ['low', 'high'] } }}
				values={{}}
				onChange={jest.fn()}
			/>
		);

		expect(screen.getByText('reasoning effort')).toBeInTheDocument();
		rerender(
			<ModelOptions
				inputs={{
					thinking: {
						type: 'object',
						properties: { type: { type: 'string', enum: ['enabled', 'disabled'] } },
					},
					temperature: { type: 'number' },
				}}
				values={{}}
				onChange={jest.fn()}
			/>
		);

		expect(screen.queryByText('reasoning effort')).not.toBeInTheDocument();
		expect(screen.getByText('thinking type')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Advanced' })).toBeInTheDocument();
		expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
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
